//alertController
const AlertService = require('../services/alertService');

class AlertController {
  static async getAll(req, res, next) {
    try {
      const alerts = await AlertService.getAllAlerts(req.business_id);
      const unreadCount = await AlertService.getUnreadCount(req.business_id);
      res.json({ success: true, count: alerts.length, unreadCount, data: alerts });
    } catch (err) {
      next(err);
    }
  }

  static async getUnreadCount(req, res, next) {
    try {
      const unreadCount = await AlertService.getUnreadCount(req.business_id);
      res.json({ success: true, unreadCount });
    } catch (err) {
      next(err);
    }
  }

  static async markAsRead(req, res, next) {
    try {
      const alert = await AlertService.markAsRead(req.params.id, req.business_id);
      res.json({ success: true, message: 'Alert marked as read', data: alert });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = AlertController;