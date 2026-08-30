const AlertService = require('../services/alertService');

class AlertController {
  static getAll(req, res, next) {
    try {
      const alerts = AlertService.getAllAlerts(req.business_id);
      const unreadCount = AlertService.getUnreadCount(req.business_id);
      res.json({ success: true, count: alerts.length, unreadCount, data: alerts });
    } catch (err) {
      next(err);
    }
  }

  static getUnreadCount(req, res, next) {
    try {
      const unreadCount = AlertService.getUnreadCount(req.business_id);
      res.json({ success: true, unreadCount });
    } catch (err) {
      next(err);
    }
  }

  static markAsRead(req, res, next) {
    try {
      const alert = AlertService.markAsRead(req.params.id, req.business_id);
      res.json({ success: true, message: 'Alert marked as read', data: alert });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = AlertController;
