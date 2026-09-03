//User model
const { query } = require('../db/database');

class UserModel {
  static async findByEmail(email) {
    const { rows } = await query(
      `SELECT
        u.user_id,
        u.business_id,
        u.name,
        u.email,
        u.phone,
        u.role,
        u.password_hash,
        u.created_at,
        b.name AS business_name,
        b.currency,
        b.plan_tier
      FROM "user" u
      JOIN business b ON u.business_id = b.business_id
      WHERE LOWER(u.email) = LOWER($1)`,
      [email]
    );
    return rows[0];
  }

  static async findById(userId) {
    const { rows } = await query(
      `SELECT
        u.user_id,
        u.business_id,
        u.name,
        u.email,
        u.phone,
        u.role,
        u.created_at,
        b.name AS business_name,
        b.currency,
        b.plan_tier
      FROM "user" u
      JOIN business b ON u.business_id = b.business_id
      WHERE u.user_id = $1`,
      [userId]
    );
    return rows[0];
  }

  static async create(userData) {
    const {
      user_id,
      business_id,
      name,
      email,
      phone = null,
      role = 'owner',
      password_hash,
    } = userData;

    await query(
      `INSERT INTO "user" (user_id, business_id, name, email, phone, role, password_hash)
      VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [user_id, business_id, name, email, phone, role, password_hash]
    );
    return this.findById(user_id);
  }
}

module.exports = UserModel;