const { getDb } = require('../db/database');

class ProductionModel {
  static getLogs(businessId = 'biz_default', limit = 50) {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT 
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
      WHERE pl.business_id = ?
      ORDER BY pl.produced_at DESC
      LIMIT ?
    `);
    return stmt.all(businessId, limit);
  }

  static createLog(logData) {
    const db = getDb();
    const {
      production_id,
      business_id = 'biz_default',
      product_id,
      quantity_produced,
      materials_consumed = null,
      logged_by = 'user_default',
    } = logData;

    const stmt = db.prepare(`
      INSERT INTO production_log (production_id, business_id, product_id, quantity_produced, materials_consumed, logged_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(production_id, business_id, product_id, quantity_produced, materials_consumed, logged_by);
    
    const fetchStmt = db.prepare(`SELECT * FROM production_log WHERE production_id = ?`);
    return fetchStmt.get(production_id);
  }
}

module.exports = ProductionModel;
