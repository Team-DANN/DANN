const { getClient } = require('../db/database');
const MaterialModel = require('../models/MaterialModel');
const AlertService = require('./alertService');

const EPSILON = 0.00005;

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

class BatchUndoService {
  /**
   * UNDO A LOGGED BATCH (a real reversal).
   *
   * actor = { user_id, access }. Same rule as editing: only whoever logged
   * the batch, or an owner/manager (access.fullAccess), may undo it.
   *
   * In ONE transaction, with the batch, product and materials locked:
   *   1. Every ingredient the batch used goes back into stock.
   *   2. The finished stock it produced is taken back out. This is refused
   *      if any of it has already been dispatched: stock cannot go below
   *      zero, so a partly sold batch can be edited down but not undone.
   *   3. A full snapshot (including its edit history) is saved to
   *      production_log_undo for the audit trail.
   *   4. The production_log row is deleted. Its usage rows and edit rows go
   *      with it, so finance, runway and every list are correct without
   *      touching their queries.
   */
  static async undoBatch(batchId, actor, businessId) {
    const client = await getClient();
    let touchedMaterialIds = [];
    let result;

    try {
      await client.query('BEGIN');

      const { rows: batchRows } = await client.query(
        `SELECT production_id, product_id, quantity_produced, labor_cost, total_material_cost,
                materials_consumed, produced_at, logged_by, edit_count
         FROM production_log
         WHERE production_id = $1 AND business_id = $2
         FOR UPDATE`,
        [batchId, businessId]
      );
      const batch = batchRows[0];
      if (!batch) throw httpError(404, `Production batch '${batchId}' not found`);

      if (!actor.access.fullAccess && batch.logged_by !== actor.user_id) {
        throw httpError(403, 'You can only undo batches you logged yourself');
      }

      const { rows: usageRows } = await client.query(
        `SELECT material_id, quantity_used, cost_per_unit_snapshot
         FROM batch_material_usage
         WHERE production_id = $1`,
        [batchId]
      );

      const { rows: productRows } = await client.query(
        `SELECT product_id, name, current_stock
         FROM product
         WHERE product_id = $1 AND business_id = $2
         FOR UPDATE`,
        [batch.product_id, businessId]
      );
      const product = productRows[0];
      if (!product) throw httpError(404, `Product '${batch.product_id}' not found`);

      if (product.current_stock + EPSILON < batch.quantity_produced) {
        throw httpError(
          409,
          `Cannot undo this batch: it made ${batch.quantity_produced} of '${product.name}' but only ${product.current_stock} ${
            product.current_stock === 1 ? 'is' : 'are'
          } in stock now, so some were already dispatched. You can edit the batch down instead.`
        );
      }

      const materialIds = [...new Set(usageRows.map((u) => u.material_id))].sort();
      const materialRows =
        materialIds.length > 0
          ? (
              await client.query(
                `SELECT material_id, name, unit
                 FROM material
                 WHERE business_id = $1 AND material_id = ANY($2::text[])
                 ORDER BY material_id
                 FOR UPDATE`,
                [businessId, materialIds]
              )
            ).rows
          : [];
      const materials = new Map(materialRows.map((m) => [m.material_id, m]));

      const { rows: editRows } = await client.query(
        `SELECT edit_id, edited_by, edited_at, before_data, after_data
         FROM production_log_edit
         WHERE production_id = $1
         ORDER BY edited_at ASC`,
        [batchId]
      );

      const snapshot = {
        production_id: batch.production_id,
        product_id: batch.product_id,
        product_name: product.name,
        quantity_produced: batch.quantity_produced,
        labor_cost: batch.labor_cost,
        total_material_cost: batch.total_material_cost,
        produced_at: batch.produced_at,
        logged_by: batch.logged_by,
        edit_count: batch.edit_count,
        materials: usageRows.map((u) => ({
          material_id: u.material_id,
          name: materials.get(u.material_id)?.name ?? null,
          unit: materials.get(u.material_id)?.unit ?? null,
          quantity_used: u.quantity_used,
          cost_per_unit_snapshot: u.cost_per_unit_snapshot,
        })),
        edits: editRows,
      };

      // Put the ingredients back.
      for (const line of usageRows) {
        if (!materials.has(line.material_id)) continue; // material was deleted since
        await client.query(
          `UPDATE material
           SET current_stock = current_stock + $1
           WHERE material_id = $2 AND business_id = $3`,
          [line.quantity_used, line.material_id, businessId]
        );
      }

      // Take the finished stock back out.
      await client.query(
        `UPDATE product
         SET current_stock = current_stock - $1
         WHERE product_id = $2 AND business_id = $3`,
        [batch.quantity_produced, batch.product_id, businessId]
      );

      const undo_id = `undo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await client.query(
        `INSERT INTO production_log_undo (undo_id, production_id, business_id, undone_by, snapshot)
         VALUES ($1, $2, $3, $4, $5)`,
        [undo_id, batchId, businessId, actor.user_id, JSON.stringify(snapshot)]
      );

      // usage rows and edit rows cascade with the batch.
      await client.query(`DELETE FROM production_log WHERE production_id = $1 AND business_id = $2`, [
        batchId,
        businessId,
      ]);

      await client.query('COMMIT');

      touchedMaterialIds = materialIds.filter((id) => materials.has(id));
      result = {
        production_id: batchId,
        product_id: batch.product_id,
        quantity_produced: batch.quantity_produced,
        undone: true,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    // Stock and usage history changed, so re-sync both alert types.
    for (const id of touchedMaterialIds) {
      const updated = await MaterialModel.getById(id, businessId);
      if (updated) await AlertService.syncMaterialStockAlert(updated, businessId);
    }
    if (touchedMaterialIds.length > 0) {
      await AlertService.syncMaterialRunwayAlerts(businessId);
    }

    return result;
  }
}

module.exports = BatchUndoService;