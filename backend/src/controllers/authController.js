const AuthService = require('../services/authService');
const UserModel = require('../models/UserModel');
const crypto = require('crypto');

function getCookie(req, name) {
  const prefix = `${name}=`;
  return (req.headers.cookie || '').split(';').map((part) => part.trim())
    .find((part) => part.startsWith(prefix))?.slice(prefix.length);
}

class AuthController {
  static async register(req, res, next) {
    try {
      const result = await AuthService.register(req.body);
      res.status(201).json({
        success: true,
        message: result.requires_email_verification
          ? 'Check your email to confirm your account.'
          : 'Owner account and business registered successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async login(req, res, next) {
    try {
      const result = await AuthService.login(req.body);
      res.json({
        success: true,
        message: 'Login successful',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async verifyEmail(req, res, next) {
    try {
      const payload = AuthService.verifyEmailVerificationToken(req.query.token);
      const user = await UserModel.findById(payload.user_id);
      if (!user || user.email.toLowerCase() !== payload.email.toLowerCase()) {
        const err = new Error('This email confirmation link is invalid.');
        err.status = 400;
        throw err;
      }
      await UserModel.markEmailVerified(user.user_id);
      const env = require('../config/env');
      res.redirect(new URL('/login?verified=1', env.FRONTEND_URL).toString());
    } catch (err) {
      next(err);
    }
  }

  static google(req, res, next) {
    try {
      const state = crypto.randomBytes(32).toString('hex');
      res.cookie('google_oauth_state', state, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/api/auth',
        maxAge: 10 * 60 * 1000,
      });
      res.redirect(AuthService.getGoogleAuthorizationUrl(state));
    } catch (err) {
      next(err);
    }
  }

  static async googleCallback(req, res, next) {
    try {
      const expectedState = getCookie(req, 'google_oauth_state');
      res.clearCookie('google_oauth_state', { path: '/api/auth' });
      if (!req.query.code || !req.query.state || !expectedState || req.query.state !== expectedState) {
        const err = new Error('Invalid Google sign-in request');
        err.status = 400;
        throw err;
      }

      const identity = await AuthService.getGoogleIdentity(req.query.code);
      const existingUser = await UserModel.findByEmail(identity.email);
      const env = require('../config/env');
      if (existingUser) {
        // A successful Google OAuth response proves ownership of this email,
        // so it also satisfies confirmation for a previously unverified
        // password account with the same address.
        if (!existingUser.email_verified) {
          await UserModel.markEmailVerified(existingUser.user_id);
        }
        const token = AuthService.signToken(existingUser.user_id, existingUser.business_id);
        res.redirect(new URL(`/dashboard/auth/callback?token=${encodeURIComponent(token)}`, env.FRONTEND_URL).toString());
        return;
      }

      const onboardingToken = AuthService.signGoogleOnboardingToken(identity);
      res.redirect(new URL(
        `/onboarding/owner-name?google_onboarding_token=${encodeURIComponent(onboardingToken)}`,
        env.FRONTEND_URL
      ).toString());
    } catch (err) {
      next(err);
    }
  }

  static async me(req, res, next) {
    try {
      const user = await UserModel.findById(req.user_id);
      if (!user) {
        const err = new Error('User not found');
        err.status = 404;
        throw err;
      }
      res.json({
        success: true,
        data: {
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
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateProfile(req, res, next) {
    try {
      const user = await AuthService.updateProfile(req.user_id, req.body);
      res.json({ success: true, data: user });
    } catch (err) {
      next(err);
    }
  }

  static async changePassword(req, res, next) {
    try {
      await AuthService.changePassword(req.user_id, req.body);
      res.json({ success: true, message: 'Password updated successfully' });
    } catch (err) {
      next(err);
    }
  }

  static async deleteAccount(req, res, next) {
    try {
      await AuthService.deleteAccount(req.user_id, req.body.password);
      res.json({ success: true, message: 'Account deleted' });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = AuthController;
