//batch Service
const { query, getClient } = require('../db/database');
const ProductModel = require('../models/ProductModel');
const RecipeModel = require('../models/RecipeModel');
const MaterialModel = require('../models/MaterialModel');
const AlertService = require('./alertService');

// Stored precision is NUMERIC(12,4); anything smaller than this counts as
// "no change".
const round4 = (n) => Math.round(n * 10000) / 10000;
const EPSILON = 0.00005;

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

class BatchService {
  static async getBatches(businessId, limit = 50) {
    const { rows } = await query(
      `SELECT 
        pl.production_id AS id,
        pl.production_id,
        pl.business_id,
        pl.product_id,
        p.name AS product_name,
        pl.quantity_produced,
        pl.labor_cost,
        pl.total_material_cost,
        pl.materials_consumed,
        pl.produced_at,
        pl.logged_by,
        u.name AS logged_by_name,
        pl.edited_at,
        pl.edit_count
      FROM production_log pl
      JOIN product p ON pl.product_id = p.product_id
      LEFT JOIN "user" u ON u.user_id = pl.logged_by
      WHERE pl.business_id = $1
      ORDER BY pl.produced_at DESC
      LIMIT $2`,
      [businessId, limit]
    );
    return rows.map(b => ({
      ...b,
      materials_consumed: b.materials_consumed ? JSON.parse(b.materials_consumed) : [],
    }));
  }

  static async getBatchById(batchId, businessId) {
    const { rows } = await query(
      `SELECT 
        pl.production_id AS id,
        pl.production_id,
        pl.business_id,
        pl.product_id,
        p.name AS product_name,
        pl.quantity_produced,
        pl.labor_cost,
        pl.total_material_cost,
        pl.materials_consumed,
        pl.produced_at,
        pl.logged_by,
        u.name AS logged_by_name,
        pl.edited_at,
        pl.edit_count
      FROM production_log pl
      JOIN product p ON pl.product_id = p.product_id
      LEFT JOIN "user" u ON u.user_id = pl.logged_by
      WHERE pl.production_id = $1 AND pl.business_id = $2`,
      [batchId, businessId]
    );
    const batch = rows[0];
    if (!batch) {
      const err = new Error(`Production batch '${batchId}' not found`);
      err.status = 404;
      throw err;
    }

    const { rows: usages } = await query(
      `SELECT 
        bmu.usage_id,
        bmu.material_id,
        m.name AS material_name,
        m.unit AS material_unit,
        bmu.quantity_used,
        bmu.cost_per_unit_snapshot,
        (bmu.quantity_used * bmu.cost_per_unit_snapshot) AS line_cost
      FROM batch_material_usage bmu
      JOIN material m ON bmu.material_id = m.material_id
      WHERE bmu.production_id = $1`,
      [batchId]
    );

    return {
      ...batch,
      materials_consumed: batch.materials_consumed ? JSON.parse(batch.materials_consumed) : [],
      material_usage_details: usages,
    };
  }

  static async recordProduction(batchData, businessId, loggedBy = 'user_default') {
    const { product_id, quantity_produced, labor_cost = 0, manual_material_cost = null } = batchData;

    if (!product_id || !quantity_produced || quantity_produced <= 0) {
      const err = new Error('product_id and a positive quantity_produced are required');
      err.status = 400;
      throw err;
    }

    const product = await ProductModel.getById(product_id, businessId);
    if (!product) {
      const err = new Error(`Product '${product_id}' not found`);
      err.status = 404;
      throw err;
    }

    const recipe = await RecipeModel.getByProductId(product_id, businessId);
    const production_id = `batch_${Date.now()}`;
    const consumedList = [];
    let totalMaterialCost = 0;

    if (recipe.length > 0) {
      for (const item of recipe) {
        const requiredQty = item.qtyPerUnit * quantity_produced;
        const material = await MaterialModel.getById(item.material_id, businessId);

        if (!material) {
          throw new Error(`Material '${item.material_id}' not found`);
        }

        if (material.current_stock < requiredQty) {
          const err = new Error(`Insufficient stock for material '${material.name}'. Required: ${requiredQty} ${material.unit}, Available: ${material.current_stock} ${material.unit}`);
          err.status = 400;
          throw err;
        }

        const lineCost = requiredQty * material.unit_cost;
        totalMaterialCost += lineCost;
        consumedList.push({
          material_id: item.material_id,
          name: material.name,
          unit: material.unit,
          quantity_used: requiredQty,
          unit_cost_snapshot: material.unit_cost,
          total_line_cost: lineCost,
        });
      }
    } else {
      totalMaterialCost = manual_material_cost || 0;
    }

    const client = await getClient();
    try {
      await client.query('BEGIN');

      await client.query(
        `INSERT INTO production_log (production_id, business_id, product_id, quantity_produced, labor_cost, total_material_cost, materials_consumed, logged_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [production_id, businessId, product_id, quantity_produced, labor_cost, totalMaterialCost, JSON.stringify(consumedList), loggedBy]
      );

      if (recipe.length > 0) {
        for (const item of consumedList) {
          await client.query(
            `UPDATE material
            SET current_stock = current_stock - $1
            WHERE material_id = $2 AND business_id = $3`,
            [item.quantity_used, item.material_id, businessId]
          );
          const usage_id = `bmu_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          await client.query(
            `INSERT INTO batch_material_usage (usage_id, production_id, material_id, quantity_used, cost_per_unit_snapshot)
            VALUES ($1, $2, $3, $4, $5)`,
            [usage_id, production_id, item.material_id, item.quantity_used, item.unit_cost_snapshot]
          );
        }
      }

      await client.query(
        `UPDATE product
        SET current_stock = current_stock + $1
        WHERE product_id = $2 AND business_id = $3`,
        [quantity_produced, product_id, businessId]
      );

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    // A production run is exactly the kind of event that changes both
    // current_stock AND avgDailyConsumption for every material it touched
    // — sync both alert types right away instead of waiting for the next
    // lazy getAllAlerts() call to notice.
    if (recipe.length > 0) {
      for (const item of consumedList) {
        const updatedMaterial = await MaterialModel.getById(item.material_id, businessId);
        if (updatedMaterial) {
          await AlertService.syncMaterialStockAlert(updatedMaterial, businessId);
        }
      }
      await AlertService.syncMaterialRunwayAlerts(businessId);
    }

    return this.getBatchById(production_id, businessId);
  }

  /**
   * EDIT A LOGGED BATCH.
   *
   * actor = { user_id, access }. Only whoever logged the batch, or an
   * owner/manager (access.fullAccess), may edit it.
   *
   * patch fields (all optional, at least one required by the schema):
   *   quantity_produced, labor_cost, manual_material_cost,
   *   materials: [{ material_id, quantity_used }]  // the COMPLETE new list
   *
   * Everything below runs in ONE transaction with the batch, its product
   * and every affected material row locked (FOR UPDATE), so a concurrent
   * dispatch or restock can't slip in between the check and the write:
   *
   *   1. Work out the new ingredient lines. If `materials` was sent it is
   *      the full new list; otherwise a quantity change scales the existing
   *      lines in proportion.
   *   2. Stock moves by the DIFFERENCE between old and new usage, not by the
   *      full amount. A material the batch now uses more of must have
   *      enough stock, the same rule as logging a batch.
   *   3. Finished-product stock moves by the difference in quantity
   *      produced. It can never go below zero: a batch cannot be shrunk
   *      past what was already dispatched.
   *   4. Unchanged lines keep their ORIGINAL cost snapshot so history does
   *      not drift when prices change; lines for newly added materials use
   *      today's unit cost.
   *   5. The batch row, its usage rows and an audit record
   *      (production_log_edit, with before and after) are written together.
   *
   * produced_at is never changed.
   */
  static async updateBatch(batchId, patch, actor, businessId) {
    const client = await getClient();
    let touchedMaterialIds = [];

    try {
      await client.query('BEGIN');

      const { rows: batchRows } = await client.query(
        `SELECT production_id, product_id, quantity_produced, labor_cost, total_material_cost, logged_by
         FROM production_log
         WHERE production_id = $1 AND business_id = $2
         FOR UPDATE`,
        [batchId, businessId]
      );
      const batch = batchRows[0];
      if (!batch) throw httpError(404, `Production batch '${batchId}' not found`);

      if (!actor.access.fullAccess && batch.logged_by !== actor.user_id) {
        throw httpError(403, 'You can only edit batches you logged yourself');
      }

      const { rows: usageRows } = await client.query(
        `SELECT material_id, quantity_used, cost_per_unit_snapshot
         FROM batch_material_usage
         WHERE production_id = $1`,
        [batchId]
      );
      const oldLines = new Map(
        usageRows.map((r) => [r.material_id, { quantity_used: r.quantity_used, snapshot: r.cost_per_unit_snapshot }])
      );

      const oldQty = batch.quantity_produced;
      const oldLabor = batch.labor_cost ?? 0;
      const oldMaterialCost = batch.total_material_cost ?? 0;

      const newQty = patch.quantity_produced !== undefined ? round4(patch.quantity_produced) : oldQty;
      const newLabor = patch.labor_cost !== undefined ? round4(patch.labor_cost) : oldLabor;

      // 1. The new ingredient lines.
      const newLines = new Map();
      if (patch.materials !== undefined) {
        for (const line of patch.materials) {
          if (newLines.has(line.material_id) || (line.quantity_used <= 0 && patch.materials.filter((m) => m.material_id === line.material_id).length > 1)) {
            throw httpError(400, 'Each material can only be listed once');
          }
          if (line.quantity_used <= 0) continue; // 0 means "remove this ingredient"
          const old = oldLines.get(line.material_id);
          newLines.set(line.material_id, {
            quantity_used: round4(line.quantity_used),
            snapshot: old ? old.snapshot : null,
          });
        }
      } else if (Math.abs(newQty - oldQty) >= EPSILON && oldLines.size > 0) {
        const scale = newQty / oldQty;
        for (const [id, line] of oldLines) {
          newLines.set(id, { quantity_used: round4(line.quantity_used * scale), snapshot: line.snapshot });
        }
      } else {
        for (const [id, line] of oldLines) {
          newLines.set(id, { ...line });
        }
      }

      const allIds = [...new Set([...oldLines.keys(), ...newLines.keys()])].sort();

      // Lock order: batch (above), product, then materials in a fixed
      // order, so two simultaneous edits can't deadlock each other.
      const { rows: productRows } = await client.query(
        `SELECT product_id, name, current_stock
         FROM product
         WHERE product_id = $1 AND business_id = $2
         FOR UPDATE`,
        [batch.product_id, businessId]
      );
      const product = productRows[0];
      if (!product) throw httpError(404, `Product '${batch.product_id}' not found`);

      const materialRows =
        allIds.length > 0
          ? (
              await client.query(
                `SELECT material_id, name, unit, unit_cost, current_stock
                 FROM material
                 WHERE business_id = $1 AND material_id = ANY($2::text[])
                 ORDER BY material_id
                 FOR UPDATE`,
                [businessId, allIds]
              )
            ).rows
          : [];
      const materials = new Map(materialRows.map((m) => [m.material_id, m]));

      for (const id of newLines.keys()) {
        if (!materials.has(id)) throw httpError(404, `Material '${id}' not found`);
      }

      // 2. Stock deltas per material (positive = the batch now uses more).
      const deltas = [];
      for (const id of allIds) {
        const oldUsed = oldLines.get(id)?.quantity_used ?? 0;
        const newUsed = newLines.get(id)?.quantity_used ?? 0;
        const delta = round4(newUsed - oldUsed);
        if (Math.abs(delta) < EPSILON) continue;

        const material = materials.get(id);
        if (delta > 0 && material.current_stock < delta) {
          throw httpError(
            400,
            `Insufficient stock for material '${material.name}'. Needs ${delta} ${material.unit} more, available: ${material.current_stock} ${material.unit}`
          );
        }
        deltas.push({ id, delta });
      }

      // 3. Finished-product stock.
      const productDelta = round4(newQty - oldQty);
      if (productDelta < 0 && product.current_stock + productDelta < 0) {
        throw httpError(
          400,
          `Cannot reduce this batch by ${-productDelta}: only ${product.current_stock} of '${product.name}' ${
            product.current_stock === 1 ? 'is' : 'are'
          } in stock, the rest were already dispatched.`
        );
      }

      // 4. New lines and cost, keeping original snapshots where they exist.
      const consumedList = [];
      let linesCost = 0;
      for (const [id, line] of newLines) {
        const material = materials.get(id);
        const snapshot = line.snapshot ?? material.unit_cost;
        const lineCost = round4(line.quantity_used * snapshot);
        linesCost += lineCost;
        consumedList.push({
          material_id: id,
          name: material.name,
          unit: material.unit,
          quantity_used: line.quantity_used,
          unit_cost_snapshot: snapshot,
          total_line_cost: lineCost,
        });
      }

      let newMaterialCost;
      if (consumedList.length > 0) {
        newMaterialCost = round4(linesCost);
      } else if (patch.manual_material_cost !== undefined && patch.manual_material_cost !== null) {
        newMaterialCost = round4(patch.manual_material_cost); // batch without a recipe
      } else if (patch.materials !== undefined) {
        newMaterialCost = 0; // every ingredient was explicitly removed
      } else {
        newMaterialCost = oldMaterialCost; // manual-cost batch, untouched
      }

      const changed =
        Math.abs(productDelta) >= EPSILON ||
        Math.abs(newLabor - oldLabor) >= EPSILON ||
        deltas.length > 0 ||
        Math.abs(newMaterialCost - oldMaterialCost) >= EPSILON;
      if (!changed) throw httpError(400, 'Nothing to change');

      // 5. Write everything.
      for (const { id, delta } of deltas) {
        await client.query(
          `UPDATE material
           SET current_stock = current_stock - $1
           WHERE material_id = $2 AND business_id = $3`,
          [delta, id, businessId]
        );
      }

      if (Math.abs(productDelta) >= EPSILON) {
        await client.query(
          `UPDATE product
           SET current_stock = current_stock + $1
           WHERE product_id = $2 AND business_id = $3`,
          [productDelta, batch.product_id, businessId]
        );
      }

      await client.query(`DELETE FROM batch_material_usage WHERE production_id = $1`, [batchId]);
      for (const line of consumedList) {
        const usage_id = `bmu_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        await client.query(
          `INSERT INTO batch_material_usage (usage_id, production_id, material_id, quantity_used, cost_per_unit_snapshot)
           VALUES ($1, $2, $3, $4, $5)`,
          [usage_id, batchId, line.material_id, line.quantity_used, line.unit_cost_snapshot]
        );
      }

      await client.query(
        `UPDATE production_log
         SET quantity_produced = $1,
             labor_cost = $2,
             total_material_cost = $3,
             materials_consumed = $4,
             edited_at = NOW(),
             edited_by = $5,
             edit_count = edit_count + 1
         WHERE production_id = $6 AND business_id = $7`,
        [newQty, newLabor, newMaterialCost, JSON.stringify(consumedList), actor.user_id, batchId, businessId]
      );

      const before = {
        quantity_produced: oldQty,
        labor_cost: oldLabor,
        total_material_cost: oldMaterialCost,
        materials: [...oldLines].map(([id, l]) => ({
          material_id: id,
          quantity_used: l.quantity_used,
          cost_per_unit_snapshot: l.snapshot,
        })),
      };
      const after = {
        quantity_produced: newQty,
        labor_cost: newLabor,
        total_material_cost: newMaterialCost,
        materials: consumedList.map((l) => ({
          material_id: l.material_id,
          quantity_used: l.quantity_used,
          cost_per_unit_snapshot: l.unit_cost_snapshot,
        })),
      };
      const edit_id = `edit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await client.query(
        `INSERT INTO production_log_edit (edit_id, production_id, business_id, edited_by, before_data, after_data)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [edit_id, batchId, businessId, actor.user_id, JSON.stringify(before), JSON.stringify(after)]
      );

      await client.query('COMMIT');
      touchedMaterialIds = deltas.map((d) => d.id);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    // Same follow-up recordProduction does: stock and usage changed, so
    // re-sync both alert types right away.
    for (const id of touchedMaterialIds) {
      const updated = await MaterialModel.getById(id, businessId);
      if (updated) await AlertService.syncMaterialStockAlert(updated, businessId);
    }
    if (touchedMaterialIds.length > 0) {
      await AlertService.syncMaterialRunwayAlerts(businessId);
    }

    return this.getBatchById(batchId, businessId);
  }

  static async getBatchHistory(batchId, businessId) {
    await this.getBatchById(batchId, businessId); // 404 if it doesn't exist

    const { rows } = await query(
      `SELECT
        e.edit_id,
        e.edited_at,
        e.edited_by,
        u.name AS edited_by_name,
        e.before_data,
        e.after_data
      FROM production_log_edit e
      LEFT JOIN "user" u ON u.user_id = e.edited_by
      WHERE e.production_id = $1 AND e.business_id = $2
      ORDER BY e.edited_at DESC`,
      [batchId, businessId]
    );
    return rows;
  }
}

module.exports = BatchService;