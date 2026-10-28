// backend/src/services/authService.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { getClient } = require('../db/database');
const UserModel = require('../models/UserModel');
const { generateBusinessCode } = require('../utils/businessCode');

const SALT_ROUNDS = 10;

class AuthService {
  static signToken(user_id, business_id) {
    return jwt.sign({ user_id, business_id }, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN,
    });
  }

  static async register(payload) {
    const { name, password, business_name, type, country, currency, timezone, google_onboarding_token } = payload;
    const googleIdentity = google_onboarding_token
      ? this.verifyGoogleOnboardingToken(google_onboarding_token)
      : null;
    const email = googleIdentity ? googleIdentity.email : payload.email;

    const existing = await UserModel.findByEmail(email);
    if (existing) {
      const err = new Error('An account with this email already exists');
      err.status = 409;
      throw err;
    }

    // Google-only accounts deliberately have no local password. The token
    // was minted only after a successful Google OAuth callback.
    const password_hash = googleIdentity ? null : await bcrypt.hash(password, SALT_ROUNDS);
    const email_verified = true;

    const business_id = `biz_${Date.now()}`;
    const user_id = `user_${Date.now()}`;

    const client = await getClient();
    try {
      await client.query('BEGIN');

      // business_code is the short code staff type at login. Every new
      // business gets one at signup; the unique index in database.js
      // guarantees no two businesses share a code.
      await client.query(
        `INSERT INTO business (business_id, name, type, owner_user_id, country, currency, timezone, business_code)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          business_id,
          business_name || `${name}'s Business`,
          type || 'bakery',
          user_id,
          country || null,
          currency || '₹',
          timezone || 'Asia/Kolkata',
          generateBusinessCode(),
        ]
      );

      await client.query(
        `INSERT INTO "user" (user_id, business_id, name, email, role, password_hash, email_verified)
         VALUES ($1, $2, $3, $4, 'owner', $5, $6)`,
        [user_id, business_id, name, email, password_hash, email_verified]
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

    const passwordMatches = user.password_hash && await bcrypt.compare(password, user.password_hash);
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

  static getGoogleConfig() {
    const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL } = env;
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_CALLBACK_URL) {
      const err = new Error('Google sign-in is not configured');
      err.status = 503;
      throw err;
    }

    return { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL };
  }

  static getGoogleAuthorizationUrl(state) {
    const { GOOGLE_CLIENT_ID, GOOGLE_CALLBACK_URL } = this.getGoogleConfig();
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: GOOGLE_CALLBACK_URL,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      prompt: 'select_account',
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }

  static async getGoogleIdentity(code) {
    const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL } = this.getGoogleConfig();
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_CALLBACK_URL,
        grant_type: 'authorization_code',
      }),
    });
    if (!tokenResponse.ok) {
      const err = new Error('Google sign-in could not be completed');
      err.status = 401;
      throw err;
    }
    const tokens = await tokenResponse.json();
    const profileResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (!profileResponse.ok) {
      const err = new Error('Google sign-in could not be completed');
      err.status = 401;
      throw err;
    }
    const profile = await profileResponse.json();
    if (!profile.email || profile.email_verified !== true) {
      const err = new Error('A verified Google email address is required');
      err.status = 401;
      throw err;
    }
    return { email: profile.email, name: profile.name || profile.email.split('@')[0] };
  }

  static signGoogleOnboardingToken({ email }) {
    return jwt.sign({ email, purpose: 'google_onboarding' }, env.JWT_SECRET, { expiresIn: '15m' });
  }

  static verifyGoogleOnboardingToken(token) {
    try {
      const payload = jwt.verify(token, env.JWT_SECRET);
      if (payload.purpose !== 'google_onboarding' || !payload.email) throw new Error('Invalid token');
      return { email: payload.email };
    } catch {
      const err = new Error('Google sign-in expired. Please try again.');
      err.status = 401;
      throw err;
    }
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

  static async deleteAccount(userId) {
    // Password confirmation removed — Google OAuth accounts have no
    // password_hash (null, see register() above), so bcrypt.compare would
    // throw or wrongly reject rather than pass. Confirmation is now the
    // "type the business name exactly" check, done in AuthController
    // BEFORE this is even called — this method trusts that check already
    // happened and just needs the user's business_id to soft-delete.
    const user = await UserModel.findById(userId);
    if (!user) {
      const err = new Error('User not found');
      err.status = 404;
      throw err;
    }
    await UserModel.softDeleteAccount(userId, user.business_id);
  }
}

module.exports = AuthService;