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
    return rows[0] ? parseInt(rows[0].count, 10) : 0;
  }

  /**
   * Guarded against the race condition that produced duplicate alerts
   * (e.g. four "Butter will run out" cards for the same material): the
   * database now enforces at most one unread alert per (business_id,
   * type, related_entity_id) via a partial unique index. If a concurrent
   * call already inserted the matching unread alert a moment earlier,
   * this insert hits that constraint (Postgres error code 23505) and we
   * just fetch and return the existing row instead of throwing — the
   * caller doesn't need to know or care whether it created a new alert
   * or found one that already existed.
   */
  static async create(alertData) {
    const {
      alert_id,
      business_id = 'biz_default',
      type,
      severity = 'info',
      related_entity_id = null,
      message,
    } = alertData;

    try {
      const { rows } = await query(
        `INSERT INTO alert (alert_id, business_id, type, severity, related_entity_id, message)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING alert_id AS id, *`,
        [alert_id, business_id, type, severity, related_entity_id, message]
      );
      return rows[0];
    } catch (err) {
      if (err.code === '23505') {
        const { rows } = await query(
          `SELECT alert_id AS id, * FROM alert
          WHERE business_id = $1 AND type = $2 AND related_entity_id = $3 AND read = false
          LIMIT 1`,
          [business_id, type, related_entity_id]
        );
        return rows[0] || null;
      }
      throw err;
    }
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