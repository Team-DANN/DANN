const { query } = require('../db/database');

class BusinessModel {
  static async findById(businessId) {
    const { rows } = await query(
      `SELECT business_id, name, type, timezone, currency, country, plan_tier,
              alert_settings, owner_user_id, created_at
       FROM business
       WHERE business_id = $1`,
      [businessId]
    );
    return rows[0];
  }

  static async update(businessId, fields) {
    const allowed = ['name', 'type', 'timezone', 'currency', 'country'];
    const sets = [];
    const values = [];
    let i = 1;
    for (const key of allowed) {
      if (fields[key] !== undefined) {
        sets.push(`${key} = $${i}`);
        values.push(fields[key]);
        i += 1;
      }
    }
    if (sets.length === 0) return this.findById(businessId);
    values.push(businessId);
    const { rows } = await query(
      `UPDATE business
       SET ${sets.join(', ')}
       WHERE business_id = $${i}
       RETURNING business_id, name, type, timezone, currency, country, plan_tier, alert_settings`,
      values
    );
    return rows[0];
  }

  static async updateAlertSettings(businessId, alertSettings) {
    const { rows } = await query(
      `UPDATE business SET alert_settings = $1 WHERE business_id = $2 RETURNING alert_settings`,
      [JSON.stringify(alertSettings), businessId]
    );
    return rows[0]?.alert_settings;
  }
}

module.exports = BusinessModel;