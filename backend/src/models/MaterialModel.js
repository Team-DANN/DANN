//Materials model
const { query } = require('../db/database');

class MaterialModel {
  /**
   * avgDailyConsumption is now computed here, not just left blank — it's
   * the same math ReportService.getRunwayEstimate already does for the
   * homepage's single aggregate card (total material usage from
   * batch_material_usage / number of distinct production days), just run
   * per-material and attached directly to each row here, so MaterialList's
   * runway badges (useRunwayEstimate.js) actually have something to read
   * instead of always falling into "No usage yet" / UNKNOWN.
   *
   * production_days is scoped to businessId via the CROSS JOIN subquery.
   * batch_material_usage itself has no business_id column, but material_id
   * values are unique per business (mat_<timestamp> generated at create
   * time), so joining by material_id alone is safe and matches the same
   * pattern ReportService.getRunwayEstimate already uses.
   */
  static async getAll(businessId = 'biz_default') {
    const { rows } = await query(
      `SELECT
        m.material_id AS id,
        m.material_id,
        m.business_id,
        m.name,
        m.unit,
        m.unit_cost,
        m.current_stock AS "qtyOnHand",
        m.current_stock,
        m.reorder_threshold,
        m.supplier_name,
        m.created_at,
        COALESCE(usage.total_consumed, 0) / prod_days.production_days AS "avgDailyConsumption"
      FROM material m
      LEFT JOIN (
        SELECT material_id, SUM(quantity_used) AS total_consumed
        FROM batch_material_usage
        GROUP BY material_id
      ) usage ON usage.material_id = m.material_id
      CROSS JOIN (
        SELECT GREATEST(COUNT(DISTINCT DATE(produced_at)), 1) AS production_days
        FROM production_log
        WHERE business_id = $1
      ) prod_days
      WHERE m.business_id = $1
      ORDER BY m.name ASC`,
      [businessId]
    );
    return rows;
  }

  static async getById(materialId, businessId = 'biz_default') {
    const { rows } = await query(
      `SELECT
        m.material_id AS id,
        m.material_id,
        m.business_id,
        m.name,
        m.unit,
        m.unit_cost,
        m.current_stock AS "qtyOnHand",
        m.current_stock,
        m.reorder_threshold,
        m.supplier_name,
        m.created_at,
        COALESCE(usage.total_consumed, 0) / prod_days.production_days AS "avgDailyConsumption"
      FROM material m
      LEFT JOIN (
        SELECT material_id, SUM(quantity_used) AS total_consumed
        FROM batch_material_usage
        WHERE material_id = $1
        GROUP BY material_id
      ) usage ON usage.material_id = m.material_id
      CROSS JOIN (
        SELECT GREATEST(COUNT(DISTINCT DATE(produced_at)), 1) AS production_days
        FROM production_log
        WHERE business_id = $2
      ) prod_days
      WHERE m.material_id = $1 AND m.business_id = $2`,
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