const { query } = require('../db/database');

class AgentActionModel {
  /** Returns the new row, or null when action_id already exists. */
  static async reserve({ action_id, business_id, user_id, tool, args }) {
    const { rows } = await query(
      `INSERT INTO agent_action_log (action_id, business_id, user_id, tool, args)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (action_id) DO NOTHING
       RETURNING *`,
      [action_id, business_id, user_id, tool, JSON.stringify(args || {})]
    );
    return rows[0] || null;
  }

  static async getById(actionId, businessId) {
    const { rows } = await query(
      `SELECT * FROM agent_action_log WHERE action_id = $1 AND business_id = $2`,
      [actionId, businessId]
    );
    return rows[0] || null;
  }

  /** Only a pending row of the same user can be completed, and only once. */
  static async complete({ action_id, business_id, user_id, status, result }) {
    const { rows } = await query(
      `UPDATE agent_action_log
       SET status = $1, result = $2, completed_at = NOW()
       WHERE action_id = $3 AND business_id = $4 AND user_id = $5 AND status = 'pending'
       RETURNING *`,
      [status, result ? JSON.stringify(result) : null, action_id, business_id, user_id]
    );
    return rows[0] || null;
  }

  static async getAll(businessId, limit = 50) {
    const { rows } = await query(
      `SELECT action_id, user_id, tool, args, status, result, created_at, completed_at
       FROM agent_action_log
       WHERE business_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [businessId, limit]
    );
    return rows;
  }
}

module.exports = AgentActionModel;