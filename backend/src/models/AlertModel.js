//Alert model
const { query } = require('../db/database');

class AlertModel {
  static async getAll(businessId = 'biz_default') {
    const { rows } = await query(
      `SELECT
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
      WHERE business_id = $1
      ORDER BY created_at DESC`,
      [businessId]
    );
    return rows;
  }

  static async getUnreadCount(businessId = 'biz_default') {
    const { rows } = await query(
      `SELECT COUNT(*) AS count
      FROM alert
      WHERE business_id = $1 AND read = false`,
      [businessId]
    );
    // pg returns COUNT(*) as a string (bigint) — cast to a number for callers.
    return rows[0] ? parseInt(rows[0].count, 10) : 0;
  }

  static async create(alertData) {
    const {
      alert_id,
      business_id = 'biz_default',
      type,
      severity = 'info',
      related_entity_id = null,
      message,
    } = alertData;

    const { rows } = await query(
      `INSERT INTO alert (alert_id, business_id, type, severity, related_entity_id, message)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING alert_id AS id, *`,
      [alert_id, business_id, type, severity, related_entity_id, message]
    );
    return rows[0];
  }

  static async markAsRead(alertId, businessId = 'biz_default') {
    const { rows } = await query(
      `UPDATE alert
      SET read = true
      WHERE alert_id = $1 AND business_id = $2
      RETURNING alert_id AS id, *`,
      [alertId, businessId]
    );
    return rows[0];
  }
}

module.exports = AlertModel;