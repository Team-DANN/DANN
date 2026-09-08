const BusinessModel = require('../models/BusinessModel');

const DEFAULT_ALERT_SETTINGS = {
  runway_threshold_days: 3,
  types: { low_stock: true, payment_overdue: true, anomaly: true },
};

class BusinessService {
  static async getProfile(businessId) {
    const business = await BusinessModel.findById(businessId);
    if (!business) {
      const err = new Error('Business not found');
      err.status = 404;
      throw err;
    }
    return business;
  }

  static async updateProfile(businessId, payload) {
    return BusinessModel.update(businessId, payload);
  }

  static async getAlertSettings(businessId) {
    const business = await BusinessModel.findById(businessId);
    if (!business) {
      const err = new Error('Business not found');
      err.status = 404;
      throw err;
    }
    return business.alert_settings || DEFAULT_ALERT_SETTINGS;
  }

  // Merges instead of overwrites — a PATCH with only { runway_threshold_days }
  // shouldn't silently wipe the `types` toggles the user already set.
  static async updateAlertSettings(businessId, payload) {
    const current = await this.getAlertSettings(businessId);
    const merged = {
      runway_threshold_days: payload.runway_threshold_days ?? current.runway_threshold_days,
      types: { ...current.types, ...(payload.types || {}) },
    };
    return BusinessModel.updateAlertSettings(businessId, merged);
  }
}

module.exports = BusinessService;