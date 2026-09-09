const AuthService = require('../services/authService');
const UserModel = require('../models/UserModel');

class AuthController {
  static async register(req, res, next) {
    try {
      const result = await AuthService.register(req.body);
      res.status(201).json({
        success: true,
        message: 'Owner account and business registered successfully',
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