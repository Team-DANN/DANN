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
    const { name, email, password, business_name, type, country, currency, timezone } = payload;

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
        `INSERT INTO business (business_id, name, type, owner_user_id, country, currency, timezone)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          business_id,
          business_name || `${name}'s Business`,
          type || 'bakery',
          user_id,
          country || null,
          currency || '₹',
          timezone || 'Asia/Kolkata',
        ]
      );

      await client.query(
        `INSERT INTO "user" (user_id, business_id, name, email, role, password_hash)
         VALUES ($1, $2, $3, $4, 'owner', $5)`,
        [user_id, business_id, name, email, password_hash]
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
        phone: user.phone,
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
        phone: user.phone,
        role: user.role,
        business_name: user.business_name,
        currency: user.currency,
        plan_tier: user.plan_tier,
      },
    };
  }

  static async updateProfile(userId, payload) {
    const user = await UserModel.updateProfile(userId, payload);
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
      phone: user.phone,
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
      // 403, not 401 — a 401 here would be caught by apiClient.js's global
      // "session expired" interceptor and silently log the user out
      // instead of showing "Current password is incorrect" on the form.
      // 401 is reserved for "no valid JWT"; this is a valid session
      // rejecting a specific action's credentials, which is 403.
      const err = new Error('Current password is incorrect');
      err.status = 403;
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
      // Same reasoning as changePassword above — 403, not 401.
      const err = new Error('Incorrect password');
      err.status = 403;
      throw err;
    }
    await UserModel.softDeleteAccount(userId, user.business_id);
  }
}

module.exports = AuthService;