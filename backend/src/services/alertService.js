const AlertModel = require('../models/AlertModel');
const { getDb } = require('../db/database');

class AlertService {
  static getAllAlerts(businessId) {
    return AlertModel.getAll(businessId);
  }

  static getUnreadCount(businessId) {
    return AlertModel.getUnreadCount(businessId);
  }

  static markAsRead(alertId, businessId) {
    const alert = AlertModel.markAsRead(alertId, businessId);
    if (!alert) {
      const err = new Error(`Alert '${alertId}' not found`);
      err.status = 404;
      throw err;
    }
    return alert;
  }

  static syncMaterialStockAlert(material, businessId) {
    const db = getDb();
    if (material.current_stock <= material.reorder_threshold) {
      // Check if unread alert already exists
      const existing = db.prepare(`
        SELECT alert_id FROM alert
        WHERE business_id = ? AND type = 'low_stock' AND related_entity_id = ? AND read = 0
      `).get(businessId, material.material_id);

      if (!existing) {
        const alert_id = `alt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const message = `${material.name} is low on stock (${material.current_stock} ${material.unit} left, threshold: ${material.reorder_threshold} ${material.unit})`;
        AlertModel.create({
          alert_id,
          business_id: businessId,
          type: 'low_stock',
          severity: 'high',
          related_entity_id: material.material_id,
          message,
        });
      }
    } else {
      // Stock replenished, mark any active unread low_stock alert for this material as read
      db.prepare(`
        UPDATE alert
        SET read = 1
        WHERE business_id = ? AND type = 'low_stock' AND related_entity_id = ? AND read = 0
      `).run(businessId, material.material_id);
    }
  }
}

module.exports = AlertService;
