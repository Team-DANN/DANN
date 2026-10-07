const { query } = require('../db/database');

const PUBLIC_COLUMNS = `
  u.user_id, u.business_id, u.name, u.username, u.phone, u.role,
  u.modules, u.status, u.created_at, u.created_by, u.terminated_at, u.first_login_at
`;

class StaffModel {
  static async create({ user_id, business_id, name, username, phone = null, role, modules, pin_hash, created_by }) {
    // Staff have no email. The PIN hash lives in password_hash.
    // modules is NULL for managers (all modules), a JSON array for staff.
    await query(
      `INSERT INTO "user"
        (user_id, business_id, name, username, phone, role, modules, password_hash, email_verified, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, 'active', $9)`,
      [
        user_id,
        business_id,
        name,
        username,
        phone,
        role,
        modules ? JSON.stringify(modules) : null,
        pin_hash,
        created_by,
      ]
    );
  }

  static async findInBusiness(userId, businessId) {
    const { rows } = await query(
      `SELECT ${PUBLIC_COLUMNS} FROM "user" u WHERE u.user_id = $1 AND u.business_id = $2`,
      [userId, businessId]
    );
    return rows[0];
  }

  // Everyone in the business except the owner, active first.
  static async listByBusiness(businessId) {
    const { rows } = await query(
      `SELECT ${PUBLIC_COLUMNS}
       FROM "user" u
       WHERE u.business_id = $1 AND u.role <> 'owner'
       ORDER BY (u.status = 'active') DESC, u.created_at ASC`,
      [businessId]
    );
    return rows;
  }

  static async getBusinessCode(businessId) {
    const { rows } = await query(`SELECT business_code FROM business WHERE business_id = $1`, [businessId]);
    return rows[0]?.business_code ?? null;
  }

  // A removed person's username can be reused, so more than one row can
  // match. The active account always wins; a removed one is only found if
  // there is no active account with that username.
  static async findForStaffLogin(businessCode, username) {
    const { rows } = await query(
      `SELECT
        u.user_id, u.business_id, u.name, u.username, u.phone, u.role, u.modules, u.status,
        u.password_hash, u.failed_pin_attempts, u.locked_until,
        b.name AS business_name, b.currency, b.plan_tier, b.business_code, b.deleted_at
       FROM "user" u
       JOIN business b ON b.business_id = u.business_id
       WHERE b.business_code = UPPER($1)
         AND LOWER(u.username) = LOWER($2)
         AND u.role <> 'owner'
       ORDER BY (u.status = 'active') DESC, u.created_at DESC
       LIMIT 1`,
      [businessCode, username]
    );
    return rows[0];
  }

  static async findByIdWithHash(userId) {
    const { rows } = await query(
      `SELECT u.user_id, u.business_id, u.role, u.status, u.password_hash,
              u.failed_pin_attempts, u.locked_until
       FROM "user" u
       WHERE u.user_id = $1`,
      [userId]
    );
    return rows[0];
  }

  static async update(userId, businessId, fields) {
    const allowed = ['name', 'phone', 'role', 'modules'];
    const sets = [];
    const values = [];
    let i = 1;
    for (const key of allowed) {
      if (fields[key] === undefined) continue;
      // modules is JSONB: arrays must be sent as JSON text, and null stays NULL.
      const value = key === 'modules' && fields[key] !== null ? JSON.stringify(fields[key]) : fields[key];
      sets.push(`${key} = $${i}`);
      values.push(value);
      i += 1;
    }
    if (sets.length === 0) return this.findInBusiness(userId, businessId);
    values.push(userId, businessId);
    await query(
      `UPDATE "user" SET ${sets.join(', ')} WHERE user_id = $${i} AND business_id = $${i + 1}`,
      values
    );
    return this.findInBusiness(userId, businessId);
  }

  static async updatePinHash(userId, pinHash) {
    await query(
      `UPDATE "user"
       SET password_hash = $1, failed_pin_attempts = 0, locked_until = NULL
       WHERE user_id = $2`,
      [pinHash, userId]
    );
  }

  // Soft removal: the row stays because production_log.logged_by and
  // other history point at it. The owner can never be removed.
  static async terminate(userId, businessId, byUserId) {
    await query(
      `UPDATE "user"
       SET status = 'terminated', terminated_at = NOW(), terminated_by = $3
       WHERE user_id = $1 AND business_id = $2 AND role <> 'owner'`,
      [userId, businessId, byUserId]
    );
    return this.findInBusiness(userId, businessId);
  }

  // One atomic statement. Every SET expression sees the OLD row, so the
  // 5th failure resets the counter to 0 and starts the lock together.
  static async recordFailedAttempt(userId, maxAttempts, lockMinutes) {
    const { rows } = await query(
      `UPDATE "user"
       SET failed_pin_attempts = CASE WHEN failed_pin_attempts + 1 >= $2 THEN 0 ELSE failed_pin_attempts + 1 END,
           locked_until = CASE WHEN failed_pin_attempts + 1 >= $2 THEN NOW() + make_interval(mins => $3) ELSE locked_until END
       WHERE user_id = $1
       RETURNING failed_pin_attempts, locked_until`,
      [userId, maxAttempts, lockMinutes]
    );
    return rows[0];
  }

  // Clears any lockout and stamps the FIRST successful sign-in. From that
  // moment the PIN belongs to the staff member and the owner can no longer
  // reset it. COALESCE keeps the original first-login time on later logins.
  static async recordSuccessfulLogin(userId) {
    await query(
      `UPDATE "user"
       SET failed_pin_attempts = 0,
           locked_until = NULL,
           first_login_at = COALESCE(first_login_at, NOW())
       WHERE user_id = $1`,
      [userId]
    );
  }
}

module.exports = StaffModel;