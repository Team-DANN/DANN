const BusinessService = require('../services/businessService');

class BusinessController {
  static async getProfile(req, res, next) {
    try {
      const business = await BusinessService.getProfile(req.business_id);
      res.json({ success: true, data: business });
    } catch (err) {
      next(err);
    }
  }

  static async updateProfile(req, res, next) {
    try {
      const business = await BusinessService.updateProfile(req.business_id, req.body);
      res.json({ success: true, data: business });
    } catch (err) {
      next(err);
    }
  }

  static async getAlertSettings(req, res, next) {
    try {
      const settings = await BusinessService.getAlertSettings(req.business_id);
      res.json({ success: true, data: settings });
    } catch (err) {
      next(err);
    }
  }

  static async updateAlertSettings(req, res, next) {
    try {
      const settings = await BusinessService.updateAlertSettings(req.business_id, req.body);
      res.json({ success: true, data: settings });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = BusinessController;