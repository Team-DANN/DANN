const { getDb } = require('../db/database');

class MaterialModel {
  static getAll(businessId = 'biz_default') {
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
        supplier_name,
        created_at
      FROM material
      WHERE business_id = ?
      ORDER BY name ASC
    `);
    return stmt.all(businessId);
  }

  static getById(materialId, businessId = 'biz_default') {
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
        supplier_name,
        created_at
      FROM material
      WHERE material_id = ? AND business_id = ?
    `);
    return stmt.get(materialId, businessId);
  }

  static create(materialData) {
    const db = getDb();
    const {
      material_id,
      business_id = 'biz_default',
      name,
      unit,
      unit_cost = 0.0,
      current_stock = 0.0,
      reorder_threshold = 0.0,
      supplier_name = null,
    } = materialData;

    const stmt = db.prepare(`
      INSERT INTO material (material_id, business_id, name, unit, unit_cost, current_stock, reorder_threshold, supplier_name)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(material_id, business_id, name, unit, unit_cost, current_stock, reorder_threshold, supplier_name);
    return this.getById(material_id, business_id);
  }

  static updateStock(materialId, qtyDelta, businessId = 'biz_default') {
    const db = getDb();
    const stmt = db.prepare(`
      UPDATE material
      SET current_stock = current_stock + ?
      WHERE material_id = ? AND business_id = ?
    `);
    stmt.run(qtyDelta, materialId, businessId);
    return this.getById(materialId, businessId);
  }

  static updateUnitCost(materialId, newCost, businessId = 'biz_default') {
    const db = getDb();
    const stmt = db.prepare(`
      UPDATE material
      SET unit_cost = ?
      WHERE material_id = ? AND business_id = ?
    `);
    stmt.run(newCost, materialId, businessId);
    return this.getById(materialId, businessId);
  }
}

module.exports = MaterialModel;
