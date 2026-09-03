//Materials model
const { query } = require('../db/database');

class MaterialModel {
  static async getAll(businessId = 'biz_default') {
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
        supplier_name,
        created_at
      FROM material
      WHERE business_id = $1
      ORDER BY name ASC`,
      [businessId]
    );
    return rows;
  }

  static async getById(materialId, businessId = 'biz_default') {
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
        supplier_name,
        created_at
      FROM material
      WHERE material_id = $1 AND business_id = $2`,
      [materialId, businessId]
    );
    return rows[0];
  }

  static async create(materialData) {
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

    await query(
      `INSERT INTO material (material_id, business_id, name, unit, unit_cost, current_stock, reorder_threshold, supplier_name)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [material_id, business_id, name, unit, unit_cost, current_stock, reorder_threshold, supplier_name]
    );
    return this.getById(material_id, business_id);
  }

  static async updateStock(materialId, qtyDelta, businessId = 'biz_default') {
    await query(
      `UPDATE material
      SET current_stock = current_stock + $1
      WHERE material_id = $2 AND business_id = $3`,
      [qtyDelta, materialId, businessId]
    );
    return this.getById(materialId, businessId);
  }

  static async updateUnitCost(materialId, newCost, businessId = 'biz_default') {
    await query(
      `UPDATE material
      SET unit_cost = $1
      WHERE material_id = $2 AND business_id = $3`,
      [newCost, materialId, businessId]
    );
    return this.getById(materialId, businessId);
  }
}

module.exports = MaterialModel;