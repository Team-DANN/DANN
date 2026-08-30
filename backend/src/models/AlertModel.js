const { getDb } = require('../db/database');

class AlertModel {
  static getAll(businessId = 'biz_default') {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT 
        alert_id AS id,
        alert_id,
        business_id,
        type,
        severity,
        related_entity_id,
        message,
        created_at,
        read
      FROM alert
      WHERE business_id = ?
      ORDER BY created_at DESC
    `);
    return stmt.all(businessId);
  }

  static getUnreadCount(businessId = 'biz_default') {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT COUNT(*) AS count
      FROM alert
      WHERE business_id = ? AND read = 0
    `);
    const res = stmt.get(businessId);
    return res ? res.count : 0;
  }

  static create(alertData) {
    const db = getDb();
    const {
      alert_id,
      business_id = 'biz_default',
      type,
      severity = 'info',
      related_entity_id = null,
      message,
    } = alertData;

    const stmt = db.prepare(`
      INSERT INTO alert (alert_id, business_id, type, severity, related_entity_id, message)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(alert_id, business_id, type, severity, related_entity_id, message);
    
    const fetchStmt = db.prepare(`SELECT alert_id AS id, * FROM alert WHERE alert_id = ?`);
    return fetchStmt.get(alert_id);
  }

  static markAsRead(alertId, businessId = 'biz_default') {
    const db = getDb();
    const stmt = db.prepare(`
      UPDATE alert
      SET read = 1
      WHERE alert_id = ? AND business_id = ?
    `);
    stmt.run(alertId, businessId);
    
    const fetchStmt = db.prepare(`SELECT alert_id AS id, * FROM alert WHERE alert_id = ?`);
    return fetchStmt.get(alertId);
  }
}

module.exports = AlertModel;
