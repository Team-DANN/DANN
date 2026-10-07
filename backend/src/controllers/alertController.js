//alertController
const AlertService = require('../services/alertService');
const { allowedAlertTypes } = require('../utils/alertAccess');

class AlertController {
  static async getAll(req, res, next) {
    try {
      const types = allowedAlertTypes(req.access);
      const alerts = await AlertService.getAllAlerts(req.business_id, types);
      const unreadCount = await AlertService.getUnreadCount(req.business_id, types);
      res.json({ success: true, count: alerts.length, unreadCount, data: alerts });
    } catch (err) {
      next(err);
    }
  }

  static async getUnreadCount(req, res, next) {
    try {
      const types = allowedAlertTypes(req.access);
      const unreadCount = await AlertService.getUnreadCount(req.business_id, types);
      res.json({ success: true, unreadCount });
    } catch (err) {
      next(err);
    }
  }

  static async markAsRead(req, res, next) {
    try {
      const types = allowedAlertTypes(req.access);
      const alert = await AlertService.markAsRead(req.params.id, req.business_id, types);
      res.json({ success: true, message: 'Alert marked as read', data: alert });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = AlertController;