// UserModel.js
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

  // Same as findById but includes password_hash — used by changePassword
  // and deleteAccount, which need to verify the current password before
  // acting. Kept separate from findById so ordinary profile reads never
  // pull the hash into memory unnecessarily.
  static async findByIdWithHash(userId) {
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
      WHERE u.user_id = $1`,
      [userId]
    );
    return rows[0];
  }

  // Workspace-switcher fix: findById/findByEmail always join business info
  // via u.business_id — the user row's HOME business, not whatever
  // business is active in the current JWT. After switchBusiness(), that
  // means /api/auth/me would keep returning the home business's name/
  // currency/plan_tier forever, never the switched-into one. This variant
  // ignores u.business_id entirely and joins against a caller-supplied
  // businessId instead — the caller (authController.me / updateProfile)
  // passes req.business_id, i.e. whatever the current token says.
  // Membership isn't re-checked here — that's already enforced when the
  // token was minted (switchBusiness verifies business_members there).
  static async findByIdInBusiness(userId, businessId) {
    const { rows } = await query(
      `SELECT
        u.user_id,
        u.name,
        u.email,
        u.phone,
        u.role,
        u.created_at,
        b.business_id,
        b.name AS business_name,
        b.currency,
        b.plan_tier
      FROM "user" u
      JOIN business b ON b.business_id = $2
      WHERE u.user_id = $1`,
      [userId, businessId]
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

  static async updateProfile(userId, fields) {
    const allowed = ['name', 'email', 'phone'];
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
    if (sets.length === 0) return this.findById(userId);
    values.push(userId);
    await query(`UPDATE "user" SET ${sets.join(', ')} WHERE user_id = $${i}`, values);
    return this.findById(userId);
  }

  static async updatePasswordHash(userId, password_hash) {
    await query(`UPDATE "user" SET password_hash = $1 WHERE user_id = $2`, [
      password_hash,
      userId,
    ]);
  }

  // Soft delete: deactivates the business (deleted_at) and frees up the
  // email so the same address can register again later. Does not touch
  // any FK-cascaded rows — this is intentionally recoverable by support,
  // not a hard delete.
  static async softDeleteAccount(userId, businessId) {
    await query(`UPDATE business SET deleted_at = NOW() WHERE business_id = $1`, [businessId]);
    await query(`UPDATE "user" SET email = email || '_deleted_' || user_id WHERE user_id = $1`, [
      userId,
    ]);
  }
}

module.exports = UserModel;