//material Service
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
    return updated;
  }

  static async deleteMaterial(materialId, businessId) {
    await this.getMaterialById(materialId, businessId);
    await query(`DELETE FROM material WHERE material_id = $1 AND business_id = $2`, [materialId, businessId]);
    return { success: true, message: `Material ${materialId} removed successfully` };
  }

  static async recordRestock(materialId, restockData, businessId, loggedBy = 'user_default') {
    await this.getMaterialById(materialId, businessId);
    const { quantity_added, cost = 0 } = restockData;

    if (!quantity_added || quantity_added <= 0) {
      const err = new Error('quantity_added must be a positive number');
      err.status = 400;
      throw err;
    }

    const restock_id = `rst_${Date.now()}`;

    // Update stock & log restock in one real transaction on a checked-out client
    const client = await getClient();
    try {
      await client.query('BEGIN');

      await client.query(
        `UPDATE material
        SET current_stock = current_stock + $1
        WHERE material_id = $2 AND business_id = $3`,
        [quantity_added, materialId, businessId]
      );

      await client.query(
        `INSERT INTO material_restock_log (restock_id, business_id, material_id, type, quantity_added, cost, logged_by)
        VALUES ($1, $2, $3, 'purchase', $4, $5, $6)`,
        [restock_id, businessId, materialId, quantity_added, cost, loggedBy]
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