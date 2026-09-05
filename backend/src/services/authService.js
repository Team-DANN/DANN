//authService
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

  /**
   * Creates a new business + owner user in one transaction, then returns
   * the user (minus password_hash) plus a JWT.
   */
  static async register(payload) {
    const { name, email, password, business_name, type } = payload;

    const existing = await UserModel.findByEmail(email);
    if (existing) {
      const err = new Error('An account with this email already exists');
      err.status = 409;
      throw err;
    }

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    const business_id = `biz_${Date.now()}`;
    const user_id = `user_${Date.now()}`;

    const client = await getClient();
    try {
      await client.query('BEGIN');

      await client.query(
        `INSERT INTO business (business_id, name, type, owner_user_id)
         VALUES ($1, $2, $3, $4)`,
        [business_id, business_name || `${name}'s Business`, type || 'bakery', user_id]
      );

      await client.query(
        `INSERT INTO "user" (user_id, business_id, name, email, role, password_hash)
         VALUES ($1, $2, $3, $4, 'owner', $5)`,
        [user_id, business_id, name, email, password_hash]
      );

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      // Unique violation on email (race condition past the findByEmail check above)
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
}

module.exports = AuthService;