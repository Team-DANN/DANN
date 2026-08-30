const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UserModel = require('../models/UserModel');
const env = require('../config/env');
const { getDb } = require('../db/database');

class AuthService {
  static async register(registerData) {
    const { name, email, password, business_name = `${name}'s Business`, type = 'bakery' } = registerData;

    const existingUser = UserModel.findByEmail(email);
    if (existingUser) {
      const err = new Error('An account with this email already exists');
      err.status = 409;
      throw err;
    }

    const business_id = `biz_${Date.now()}`;
    const user_id = `user_${Date.now()}`;
    const password_hash = await bcrypt.hash(password, 10);

    const db = getDb();
    db.exec('BEGIN TRANSACTION;');
    try {
      // 1. Create Business
      const insertBiz = db.prepare(`
        INSERT INTO business (business_id, name, type, owner_user_id)
        VALUES (?, ?, ?, ?)
      `);
      insertBiz.run(business_id, business_name, type, user_id);

      // 2. Create User
      const insertUser = db.prepare(`
        INSERT INTO user (user_id, business_id, name, email, role, password_hash)
        VALUES (?, ?, ?, ?, 'owner', ?)
      `);
      insertUser.run(user_id, business_id, name, email, password_hash);

      db.exec('COMMIT;');
    } catch (err) {
      db.exec('ROLLBACK;');
      throw err;
    }

    const user = UserModel.findById(user_id);
    const token = this.generateToken(user);

    return {
      token,
      user: {
        id: user.user_id,
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

  static async login(loginData) {
    const { email, password } = loginData;

    const user = UserModel.findByEmail(email);
    if (!user) {
      const err = new Error('Invalid email or password');
      err.status = 401;
      throw err;
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      const err = new Error('Invalid email or password');
      err.status = 401;
      throw err;
    }

    const token = this.generateToken(user);

    return {
      token,
      user: {
        id: user.user_id,
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

  static generateToken(user) {
    return jwt.sign(
      {
        user_id: user.user_id,
        business_id: user.business_id,
        role: user.role,
        email: user.email,
      },
      env.JWT_SECRET,
      { expiresIn: '7d' }
    );
  }

  static verifyToken(token) {
    try {
      return jwt.verify(token, env.JWT_SECRET);
    } catch (err) {
      const error = new Error('Invalid or expired authentication token');
      error.status = 401;
      throw error;
    }
  }
}

module.exports = AuthService;
