const MaterialModel = require('../models/MaterialModel');
const { getDb } = require('../db/database');

class MaterialService {
  static getAllMaterials(businessId) {
    return MaterialModel.getAll(businessId);
  }

  static getMaterialById(materialId, businessId) {
    const material = MaterialModel.getById(materialId, businessId);
    if (!material) {
      const err = new Error(`Material with ID '${materialId}' not found`);
      err.status = 404;
      throw err;
    }
    return material;
  }

  static createMaterial(materialData, businessId) {
    const { name, unit, unit_cost = 0, current_stock = 0, reorder_threshold = 0, supplier_name = null } = materialData;
    if (!name || !unit) {
      const err = new Error('Name and unit are required fields for materials');
      err.status = 400;
      throw err;
    }
    const material_id = materialData.material_id || `mat_${Date.now()}`;
    return MaterialModel.create({
      material_id,
      business_id: businessId,
      name,
      unit,
      unit_cost,
      current_stock,
      reorder_threshold,
      supplier_name,
    });
  }

  static updateMaterial(materialId, updateData, businessId) {
    const db = getDb();
    const existing = this.getMaterialById(materialId, businessId);

    const name = updateData.name || existing.name;
    const unit = updateData.unit || existing.unit;
    const unit_cost = updateData.unit_cost !== undefined ? updateData.unit_cost : existing.unit_cost;
    const reorder_threshold = updateData.reorder_threshold !== undefined ? updateData.reorder_threshold : existing.reorder_threshold;
    const supplier_name = updateData.supplier_name !== undefined ? updateData.supplier_name : existing.supplier_name;

    const stmt = db.prepare(`
      UPDATE material
      SET name = ?, unit = ?, unit_cost = ?, reorder_threshold = ?, supplier_name = ?
      WHERE material_id = ? AND business_id = ?
    `);
    stmt.run(name, unit, unit_cost, reorder_threshold, supplier_name, materialId, businessId);
    return MaterialModel.getById(materialId, businessId);
  }

  static deleteMaterial(materialId, businessId) {
    const db = getDb();
    this.getMaterialById(materialId, businessId);
    const stmt = db.prepare(`DELETE FROM material WHERE material_id = ? AND business_id = ?`);
    stmt.run(materialId, businessId);
    return { success: true, message: `Material ${materialId} removed successfully` };
  }

  static recordRestock(materialId, restockData, businessId, loggedBy) {
    const db = getDb();
    const material = this.getMaterialById(materialId, businessId);
    const { quantity_added, cost = 0 } = restockData;

    if (!quantity_added || quantity_added <= 0) {
      const err = new Error('quantity_added must be a positive number');
      err.status = 400;
      throw err;
    }

    const restock_id = `rst_${Date.now()}`;

    // Update stock & log restock in atomic step
    db.exec('BEGIN TRANSACTION;');
    try {
      const updateStock = db.prepare(`
        UPDATE material
        SET current_stock = current_stock + ?
        WHERE material_id = ? AND business_id = ?
      `);
      updateStock.run(quantity_added, materialId, businessId);

      const insertLog = db.prepare(`
        INSERT INTO material_restock_log (restock_id, business_id, material_id, type, quantity_added, cost, logged_by)
        VALUES (?, ?, ?, 'purchase', ?, ?, ?)
      `);
      insertLog.run(restock_id, businessId, materialId, quantity_added, cost, loggedBy);

      db.exec('COMMIT;');
    } catch (err) {
      db.exec('ROLLBACK;');
      throw err;
    }

    return MaterialModel.getById(materialId, businessId);
  }

  static recordAdjustment(materialId, adjustData, businessId, loggedBy) {
    const db = getDb();
    const material = this.getMaterialById(materialId, businessId);
    const { actual_stock } = adjustData;

    if (actual_stock === undefined || actual_stock < 0) {
      const err = new Error('actual_stock must be a non-negative number');
      err.status = 400;
      throw err;
    }

    const diff = actual_stock - material.current_stock;
    const restock_id = `adj_${Date.now()}`;

    db.exec('BEGIN TRANSACTION;');
    try {
      const updateStock = db.prepare(`
        UPDATE material
        SET current_stock = ?
        WHERE material_id = ? AND business_id = ?
      `);
      updateStock.run(actual_stock, materialId, businessId);

      const insertLog = db.prepare(`
        INSERT INTO material_restock_log (restock_id, business_id, material_id, type, quantity_added, cost, logged_by)
        VALUES (?, ?, ?, 'manual_adjustment', ?, 0, ?)
      `);
      insertLog.run(restock_id, businessId, materialId, diff, loggedBy);

      db.exec('COMMIT;');
    } catch (err) {
      db.exec('ROLLBACK;');
      throw err;
    }

    return MaterialModel.getById(materialId, businessId);
  }

  static getLowStockMaterials(businessId) {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT 
        material_id AS id,
        material_id,
        business_id,
        name,
        unit,
        unit_cost,
        current_stock AS qtyOnHand,
        current_stock,
        reorder_threshold,
        supplier_name
      FROM material
      WHERE business_id = ? AND current_stock <= reorder_threshold
      ORDER BY (current_stock - reorder_threshold) ASC
    `);
    return stmt.all(businessId);
  }
}

module.exports = MaterialService;
