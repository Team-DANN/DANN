//Production model
const { query } = require('../db/database');

class ProductionModel {
  static async getLogs(businessId = 'biz_default', limit = 50) {
    const { rows } = await query(
      `SELECT
        pl.production_id,
        pl.business_id,
        pl.product_id,
        p.name AS product_name,
        pl.quantity_produced,
        pl.materials_consumed,
        pl.produced_at,
        pl.logged_by
      FROM production_log pl
      JOIN product p ON pl.product_id = p.product_id
      WHERE pl.business_id = $1
      ORDER BY pl.produced_at DESC
      LIMIT $2`,
      [businessId, limit]
    );
    return rows;
  }

  static async createLog(logData) {
    const {
      production_id,
      business_id = 'biz_default',
      product_id,
      quantity_produced,
      materials_consumed = null,
      logged_by = 'user_default',
    } = logData;

    const { rows } = await query(
      `INSERT INTO production_log (production_id, business_id, product_id, quantity_produced, materials_consumed, logged_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [production_id, business_id, product_id, quantity_produced, materials_consumed, logged_by]
    );
    return rows[0];
  }
}

module.exports = ProductionModel;