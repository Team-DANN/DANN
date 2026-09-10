//material service
const MaterialModel = require('../models/MaterialModel');
const AlertService = require('./alertService');
const { query, getClient } = require('../db/database');

class MaterialService {
  static async getAllMaterials(businessId) {
    return MaterialModel.getAll(businessId);
  }

  static async getMaterialById(materialId, businessId) {
    const material = await MaterialModel.getById(materialId, businessId);
    if (!material) {
      const err = new Error(`Material with ID '${materialId}' not found`);
      err.status = 404;
      throw err;
    }
    return material;
  }

  static async createMaterial(materialData, businessId) {
    const { name, unit, unit_cost = 0, current_stock = 0, reorder_threshold = 0, supplier_name = null } = materialData;
    if (!name || !unit) {
      const err = new Error('Name and unit are required fields for materials');
      err.status = 400;
      throw err;
    }
    const material_id = materialData.material_id || `mat_${Date.now()}`;
    const material = await MaterialModel.create({
      material_id,
      business_id: businessId,
      name,
      unit,
      unit_cost,
      current_stock,
      reorder_threshold,
      supplier_name,
    });

    await AlertService.syncMaterialStockAlert(material, businessId);
    return material;
  }

  static async updateMaterial(materialId, updateData, businessId) {
    const existing = await this.getMaterialById(materialId, businessId);

    const name = updateData.name || existing.name;
    const unit = updateData.unit || existing.unit;
    const unit_cost = updateData.unit_cost !== undefined ? updateData.unit_cost : existing.unit_cost;
    const reorder_threshold = updateData.reorder_threshold !== undefined ? updateData.reorder_threshold : existing.reorder_threshold;
    const supplier_name = updateData.supplier_name !== undefined ? updateData.supplier_name : existing.supplier_name;

    await query(
      `UPDATE material
      SET name = $1, unit = $2, unit_cost = $3, reorder_threshold = $4, supplier_name = $5
      WHERE material_id = $6 AND business_id = $7`,
      [name, unit, unit_cost, reorder_threshold, supplier_name, materialId, businessId]
    );
    const updated = await MaterialModel.getById(materialId, businessId);
    await AlertService.syncMaterialStockAlert(updated, businessId);
    // reorder_threshold may have just changed — a material that was
    // previously "runway_low" (above threshold but low on real days-left)
    // could now be at/under its new threshold (owned by low_stock instead),
    // or vice versa. Re-sync the predictive alert too so the two types
    // don't end up disagreeing after a threshold edit.
    await AlertService.syncMaterialRunwayAlerts(businessId);
    return updated;
  }

  static async deleteMaterial(materialId, businessId, { force = false } = {}) {
    await this.getMaterialById(materialId, businessId);

    const { rows: usedIn } = await query(
      `SELECT DISTINCT p.product_id, p.name
       FROM recipe r
       JOIN product p ON r.product_id = p.product_id
       WHERE r.material_id = $1 AND r.business_id = $2`,
      [materialId, businessId]
    );

    if (usedIn.length > 0 && !force) {
      const names = usedIn.map((p) => p.name).join(', ');
      const err = new Error(
        `This material is used in ${usedIn.length} recipe${usedIn.length > 1 ? 's' : ''} (${names}). Removing it will drop it from ${usedIn.length > 1 ? 'those recipes' : 'that recipe'}.`
      );
      err.status = 409;
      throw err;
    }

    await query(`DELETE FROM material WHERE material_id = $1 AND business_id = $2`, [materialId, businessId]);

    if (usedIn.length > 0) {
      const productIds = usedIn.map((p) => p.product_id);
      await query(
        `UPDATE product
         SET cost_per_unit = (
           SELECT COALESCE(SUM(r.quantity_per_unit * m.unit_cost), 0.0)
           FROM recipe r
           JOIN material m ON r.material_id = m.material_id
           WHERE r.product_id = product.product_id
         )
         WHERE business_id = $1 AND product_id = ANY($2::text[])`,
        [businessId, productIds]
      );
    }

    // The deleted material can no longer have any alert attached to it —
    // clear both types so a stale unread alert doesn't reference a
    // material that no longer exists.
    await query(
      `UPDATE alert SET read = true
       WHERE business_id = $1 AND related_entity_id = $2 AND type IN ('low_stock', 'runway_low') AND read = false`,
      [businessId, materialId]
    );

    return { success: true, message: `Material ${materialId} removed successfully` };
  }

  static async recordRestock(materialId, restockData, businessId, loggedBy = 'user_default') {
    const material = await this.getMaterialById(materialId, businessId);
    const { quantity_added, cost = 0 } = restockData;

    if (!quantity_added || quantity_added <= 0) {
      const err = new Error('quantity_added must be a positive number');
      err.status = 400;
      throw err;
    }

    const restock_id = `rst_${Date.now()}`;

    const existingValue = material.current_stock * material.unit_cost;
    const newTotalQty = material.current_stock + quantity_added;
    const newUnitCost =
      cost > 0 && newTotalQty > 0 ? (existingValue + cost) / newTotalQty : material.unit_cost;

    const client = await getClient();
    try {
      await client.query('BEGIN');

      await client.query(
        `UPDATE material
        SET current_stock = current_stock + $1, unit_cost = $2
        WHERE material_id = $3 AND business_id = $4`,
        [quantity_added, newUnitCost, materialId, businessId]
      );

      await client.query(
        `INSERT INTO material_restock_log (restock_id, business_id, material_id, type, quantity_added, cost, logged_by)
        VALUES ($1, $2, $3, 'purchase', $4, $5, $6)`,
        [restock_id, businessId, materialId, quantity_added, cost, loggedBy]
      );

      await client.query(
        `UPDATE product
        SET cost_per_unit = (
          SELECT COALESCE(SUM(r.quantity_per_unit * m.unit_cost), 0.0)
          FROM recipe r
          JOIN material m ON r.material_id = m.material_id
          WHERE r.product_id = product.product_id
        )
        WHERE business_id = $1 AND product_id IN (
          SELECT DISTINCT product_id FROM recipe WHERE material_id = $2 AND business_id = $1
        )`,
        [businessId, materialId]
      );

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    const updated = await MaterialModel.getById(materialId, businessId);
    await AlertService.syncMaterialStockAlert(updated, businessId);
    // A restock is exactly the kind of action that should resolve a
    // "running low soon" alert immediately — don't wait for the next
    // lazy getAllAlerts() call to notice the stock is healthy again.
    await AlertService.syncMaterialRunwayAlerts(businessId);
    return updated;
  }

  static async recordAdjustment(materialId, adjustData, businessId, loggedBy = 'user_default') {
    const material = await this.getMaterialById(materialId, businessId);
    const { actual_stock } = adjustData;

    if (actual_stock === undefined || actual_stock < 0) {
      const err = new Error('actual_stock must be a non-negative number');
      err.status = 400;
      throw err;
    }

    const diff = actual_stock - material.current_stock;
    const restock_id = `adj_${Date.now()}`;

    const client = await getClient();
    try {
      await client.query('BEGIN');

      await client.query(
        `UPDATE material
        SET current_stock = $1
        WHERE material_id = $2 AND business_id = $3`,
        [actual_stock, materialId, businessId]
      );

      await client.query(
        `INSERT INTO material_restock_log (restock_id, business_id, material_id, type, quantity_added, cost, logged_by)
        VALUES ($1, $2, $3, 'manual_adjustment', $4, 0, $5)`,
        [restock_id, businessId, materialId, diff, loggedBy]
      );

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    const updated = await MaterialModel.getById(materialId, businessId);
    await AlertService.syncMaterialStockAlert(updated, businessId);
    await AlertService.syncMaterialRunwayAlerts(businessId);
    return updated;
  }

  static async getLowStockMaterials(businessId) {
    const { rows } = await query(
      `SELECT 
        material_id AS id,
        material_id,
        business_id,
        name,
        unit,
        unit_cost,
        current_stock AS "qtyOnHand",
        current_stock,
        reorder_threshold,
        supplier_name
      FROM material
      WHERE business_id = $1 AND current_stock <= reorder_threshold
      ORDER BY (current_stock - reorder_threshold) ASC`,
      [businessId]
    );
    return rows;
  }
}

module.exports = MaterialService;