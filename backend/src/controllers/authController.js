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

  static me(req, res, next) {
    try {
      const user = UserModel.findById(req.user_id);
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
}

module.exports = AuthController;
