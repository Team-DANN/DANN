const { getDb } = require('../db/database');

class UserModel {
  static findByEmail(email) {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT 
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
      FROM user u
      JOIN business b ON u.business_id = b.business_id
      WHERE LOWER(u.email) = LOWER(?)
    `);
    return stmt.get(email);
  }

  static findById(userId) {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT 
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
      FROM user u
      JOIN business b ON u.business_id = b.business_id
      WHERE u.user_id = ?
    `);
    return stmt.get(userId);
  }

  static create(userData) {
    const db = getDb();
    const {
      user_id,
      business_id,
      name,
      email,
      phone = null,
      role = 'owner',
      password_hash,
    } = userData;

    const stmt = db.prepare(`
      INSERT INTO user (user_id, business_id, name, email, phone, role, password_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(user_id, business_id, name, email, phone, role, password_hash);
    return this.findById(user_id);
  }
}

module.exports = UserModel;
