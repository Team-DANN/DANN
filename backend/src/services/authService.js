// backend/src/services/authService.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { getClient } = require('../db/database');
const UserModel = require('../models/UserModel');

const SALT_ROUNDS = 10;

class AuthService {
  static signToken(user_id, business_id) {
    return jwt.sign({ user_id, business_id }, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN,
    });
  }

  static async register(payload) {
    const { name, email, password, business_name, type, country, currency } = payload;

    const existing = await UserModel.findByEmail(email);
    if (existing) {
      const err = new Error('An account with this email already exists');
      err.status = 409;
      throw err;
    }

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    const business_id = `biz_${Date.now()}`;
    const user_id = `user_${Date.now()}`;
    const membership_id = `bm_${business_id}_${user_id}`;

    const client = await getClient();
    try {
      await client.query('BEGIN');

      await client.query(
        `INSERT INTO business (business_id, name, type, owner_user_id, country, currency)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          business_id,
          business_name || `${name}'s Business`,
          type || 'bakery',
          user_id,
          country || null,
          currency || '₹',
        ]
      );

      await client.query(
        `INSERT INTO "user" (user_id, business_id, name, email, role, password_hash)
         VALUES ($1, $2, $3, $4, 'owner', $5)`,
        [user_id, business_id, name, email, password_hash]
      );

      // Membership row — makes this business show up in the workspace
      // switcher list. Every login, however many businesses it later
      // owns, reads that list from here rather than from user.business_id.
      await client.query(
        `INSERT INTO business_members (membership_id, business_id, user_id, role)
         VALUES ($1, $2, $3, 'owner')`,
        [membership_id, business_id, user_id]
      );

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      if (err.code === '23505') {
        const dupErr = new Error('An account with this email already exists');
        dupErr.status = 409;
        throw dupErr;
      }
      throw err;
    } finally {
      client.release();
    }

    const user = await UserModel.findById(user_id);
    const token = this.signToken(user_id, business_id);

    return {
      token,
      user: {
        user_id: user.user_id,
        business_id: user.business_id,
        name: user.name,
        email: user.email,
        role: user.role,
        business_name: user.business_name,
        currency: user.currency,
        plan_tier: user.plan_tier,
      },
    };
  }

  static async login(payload) {
    const { email, password } = payload;

    const user = await UserModel.findByEmail(email);
    if (!user) {
      const err = new Error('Invalid email or password');
      err.status = 401;
      throw err;
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatches) {
      const err = new Error('Invalid email or password');
      err.status = 401;
      throw err;
    }

    // Login always lands on the user's home business (user.business_id),
    // not whatever they last switched to — switching is a session-level
    // pointer via the JWT, not a persisted preference. Matches the
    // common pattern (Slack, etc.) of opening your primary workspace on
    // a fresh login. Revisit if you want "last active business" to
    // persist across logins later.
    const token = this.signToken(user.user_id, user.business_id);

    return {
      token,
      user: {
        user_id: user.user_id,
        business_id: user.business_id,
        name: user.name,
        email: user.email,
        role: user.role,
        business_name: user.business_name,
        currency: user.currency,
        plan_tier: user.plan_tier,
      },
    };
  }

  // businessId is now required — must be the CURRENTLY ACTIVE business
  // (req.business_id from the JWT), not user.business_id. Fixes the bug
  // where editing your profile while on a switched business would merge
  // stale home-business fields back into AuthContext state.
  static async updateProfile(userId, businessId, payload) {
    await UserModel.updateProfile(userId, payload);
    const user = await UserModel.findByIdInBusiness(userId, businessId);
    if (!user) {
      const err = new Error('User not found');
      err.status = 404;
      throw err;
    }
    return {
      user_id: user.user_id,
      business_id: user.business_id,
      name: user.name,
      email: user.email,
      role: user.role,
      business_name: user.business_name,
      currency: user.currency,
      plan_tier: user.plan_tier,
    };
  }

  static async changePassword(userId, { current_password, new_password }) {
    const user = await UserModel.findByIdWithHash(userId);
    if (!user) {
      const err = new Error('User not found');
      err.status = 404;
      throw err;
    }
    const matches = await bcrypt.compare(current_password, user.password_hash);
    if (!matches) {
      const err = new Error('Current password is incorrect');
      err.status = 401;
      throw err;
    }
    const password_hash = await bcrypt.hash(new_password, SALT_ROUNDS);
    await UserModel.updatePasswordHash(userId, password_hash);
  }

  static async deleteAccount(userId, password) {
    const user = await UserModel.findByIdWithHash(userId);
    if (!user) {
      const err = new Error('User not found');
      err.status = 404;
      throw err;
    }
    const matches = await bcrypt.compare(password, user.password_hash);
    if (!matches) {
      const err = new Error('Incorrect password');
      err.status = 401;
      throw err;
    }
    await UserModel.softDeleteAccount(userId, user.business_id);
  }

  // ---- Workspace switcher additions ----

  // All businesses this login can switch into, via business_members.
  // Excludes soft-deleted businesses (business.deleted_at).
  static async listBusinesses(userId) {
    const client = await getClient();
    try {
      const { rows } = await client.query(
        `SELECT b.business_id, b.name, b.type, b.currency, bm.role
         FROM business_members bm
         JOIN business b ON b.business_id = bm.business_id
         WHERE bm.user_id = $1 AND b.deleted_at IS NULL
         ORDER BY bm.created_at ASC`,
        [userId]
      );
      return rows;
    } finally {
      client.release();
    }
  }

  // Re-signs the token against a different business_id, after verifying
  // this user actually has a membership row for it. Same payload shape
  // as signToken elsewhere — nothing downstream (authMiddleware,
  // business-scoped routes) needs to change.
  static async switchBusiness(userId, businessId) {
    const client = await getClient();
    try {
      const { rows } = await client.query(
        `SELECT bm.business_id
         FROM business_members bm
         JOIN business b ON b.business_id = bm.business_id
         WHERE bm.user_id = $1 AND bm.business_id = $2 AND b.deleted_at IS NULL`,
        [userId, businessId]
      );
      if (rows.length === 0) {
        const err = new Error('You do not have access to that business');
        err.status = 403;
        throw err;
      }
    } finally {
      client.release();
    }

    const token = this.signToken(userId, businessId);
    return { token };
  }

  // Creates a new business under the already-authenticated user. Skips
  // owner-name/password (user already exists) — this is the backend
  // half of the onboarding "add-business" mode.
  static async createBusiness(userId, payload) {
    const { business_name, type, country, currency } = payload;

    const business_id = `biz_${Date.now()}`;
    const membership_id = `bm_${business_id}_${userId}`;

    const client = await getClient();
    try {
      await client.query('BEGIN');

      await client.query(
        `INSERT INTO business (business_id, name, type, owner_user_id, country, currency)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [business_id, business_name, type || 'bakery', userId, country || null, currency || '₹']
      );

      await client.query(
        `INSERT INTO business_members (membership_id, business_id, user_id, role)
         VALUES ($1, $2, $3, 'owner')`,
        [membership_id, business_id, userId]
      );

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    const token = this.signToken(userId, business_id);
    return { token, business: { business_id, name: business_name, type, currency } };
  }
}

module.exports = AuthService;