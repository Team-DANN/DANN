//alert service
const AlertModel = require('../models/AlertModel');
const { query } = require('../db/database');
const OrderService = require('./orderService');

class AlertService {
  static async getAllAlerts(businessId) {
    // Runs before every alert list fetch so a payment that quietly aged
    // past its credit window overnight — with no order action taken —
    // still shows up next time anyone opens the bell or Alerts page.
    await this.syncOrderOverdueAlerts(businessId);
    return AlertModel.getAll(businessId);
  }

  static async getUnreadCount(businessId) {
    await this.syncOrderOverdueAlerts(businessId);
    return AlertModel.getUnreadCount(businessId);
  }

  static async markAsRead(alertId, businessId) {
    const alert = await AlertModel.markAsRead(alertId, businessId);
    if (!alert) {
      const err = new Error(`Alert '${alertId}' not found`);
      err.status = 404;
      throw err;
    }
    return alert;
  }

  static async syncMaterialStockAlert(material, businessId) {
    if (material.current_stock <= material.reorder_threshold) {
      // Check if unread alert already exists
      const { rows } = await query(
        `SELECT alert_id FROM alert
        WHERE business_id = $1 AND type = 'low_stock' AND related_entity_id = $2 AND read = false`,
        [businessId, material.material_id]
      );

      if (rows.length === 0) {
        const alert_id = `alt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const message = `${material.name} is low on stock (${material.current_stock} ${material.unit} left, threshold: ${material.reorder_threshold} ${material.unit})`;
        await AlertModel.create({
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
      await query(
        `UPDATE alert
        SET read = true
        WHERE business_id = $1 AND type = 'low_stock' AND related_entity_id = $2 AND read = false`,
        [businessId, material.material_id]
      );
    }
  }

  /**
   * Same create-if-missing / clear-if-resolved pattern as
   * syncMaterialStockAlert, but for orders instead of materials.
   *
   * - Every order currently past its retailer's credit window
   *   (OrderService.getOverdueOrders) gets exactly one unread
   *   'payment_overdue' alert, keyed by order_id in related_entity_id.
   * - Any existing unread payment_overdue alert whose order is NO LONGER
   *   overdue (paid off, or a partial payment brought it current) gets
   *   auto-marked read — so paying an invoice clears its own alert without
   *   the person having to dismiss it manually.
   *
   * Called lazily from getAllAlerts/getUnreadCount rather than on a cron,
   * since there's no scheduler in this deployment yet — the tradeoff is
   * that an order can sit overdue for a while before the *first* person to
   * open the bell/Alerts page after it crosses the line triggers the alert.
   * Fine for current scale; revisit with a real cron/job queue once this
   * needs to notify without anyone opening the app first.
   */
  static async syncOrderOverdueAlerts(businessId) {
    const overdueOrders = await OrderService.getOverdueOrders(businessId);
    const overdueOrderIds = new Set(overdueOrders.map((o) => o.order_id));

    for (const order of overdueOrders) {
      const { rows } = await query(
        `SELECT alert_id FROM alert
        WHERE business_id = $1 AND type = 'payment_overdue' AND related_entity_id = $2 AND read = false`,
        [businessId, order.order_id]
      );

      if (rows.length === 0) {
        const alert_id = `alt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const remaining = order.total_amount - order.amount_paid;
        const message = `${order.retailer_name}, ₹${remaining.toFixed(2)} overdue`;
        await AlertModel.create({
          alert_id,
          business_id: businessId,
          type: 'payment_overdue',
          severity: 'medium',
          related_entity_id: order.order_id,
          message,
        });
      }
    }

    const { rows: activeOverdueAlerts } = await query(
      `SELECT alert_id, related_entity_id FROM alert
      WHERE business_id = $1 AND type = 'payment_overdue' AND read = false`,
      [businessId]
    );

    for (const alert of activeOverdueAlerts) {
      if (!overdueOrderIds.has(alert.related_entity_id)) {
        await query(`UPDATE alert SET read = true WHERE alert_id = $1`, [alert.alert_id]);
      }
    }
  }
}

module.exports = AlertService;