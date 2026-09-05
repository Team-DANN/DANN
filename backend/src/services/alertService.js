//alert service
const AlertModel = require('../models/AlertModel');
const MaterialModel = require('../models/MaterialModel');
const { query } = require('../db/database');
const OrderService = require('./orderService');

// Same thresholds useRunwayEstimate.js (frontend) uses for its badge —
// kept in sync manually since there's no shared config file between the
// two apps yet. If you change one, change the other.
const RUNWAY_LOW_DAYS = 5;

class AlertService {
  static async getAllAlerts(businessId) {
    // Runs before every alert list fetch, same lazy-sync pattern as order
    // overdue alerts below — no cron/scheduler exists yet, so this is what
    // keeps alerts current without anyone taking a manual action first.
    await this.syncOrderOverdueAlerts(businessId);
    await this.syncMaterialRunwayAlerts(businessId);
    return AlertModel.getAll(businessId);
  }

  static async getUnreadCount(businessId) {
    await this.syncOrderOverdueAlerts(businessId);
    await this.syncMaterialRunwayAlerts(businessId);
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
      await query(
        `UPDATE alert
        SET read = true
        WHERE business_id = $1 AND type = 'low_stock' AND related_entity_id = $2 AND read = false`,
        [businessId, material.material_id]
      );
    }
  }

  /**
   * Predictive alert, distinct from syncMaterialStockAlert: this fires
   * BEFORE a material actually crosses its reorder_threshold, based on
   * real consumption rate (MaterialModel.getAll now computes
   * avgDailyConsumption from actual batch_material_usage history — see
   * that file's comment). "You'll run out in N days at this rate" instead
   * of "you're already out."
   *
   * Deliberately skips materials that are ALREADY at/under
   * reorder_threshold — syncMaterialStockAlert already owns that case
   * with its own alert type ('low_stock'), so a material doesn't get two
   * separate alerts fighting for attention over the same underlying
   * problem. This only covers the gap: still above threshold, but the
   * real burn rate says it won't be for long.
   *
   * Same create-if-missing / clear-if-resolved shape as
   * syncMaterialStockAlert and syncOrderOverdueAlerts, so all three alert
   * types self-correct on every sync rather than needing manual dismissal
   * once the underlying condition is no longer true.
   */
  static async syncMaterialRunwayAlerts(businessId) {
    const materials = await MaterialModel.getAll(businessId);

    const atRiskIds = new Set();

    for (const material of materials) {
      const avgDaily = material.avgDailyConsumption;
      const alreadyReactivelyLow = material.current_stock <= material.reorder_threshold;

      if (!avgDaily || avgDaily <= 0 || alreadyReactivelyLow) continue;

      const daysLeft = material.current_stock / avgDaily;
      if (daysLeft >= RUNWAY_LOW_DAYS) continue;

      atRiskIds.add(material.material_id);

      const { rows } = await query(
        `SELECT alert_id FROM alert
        WHERE business_id = $1 AND type = 'runway_low' AND related_entity_id = $2 AND read = false`,
        [businessId, material.material_id]
      );

      if (rows.length === 0) {
        const alert_id = `alt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const roundedDays = Math.max(Math.round(daysLeft * 10) / 10, 0.1);
        const message = `${material.name} will run out in about ${roundedDays} day${roundedDays === 1 ? '' : 's'} at your current usage rate`;
        await AlertModel.create({
          alert_id,
          business_id: businessId,
          type: 'runway_low',
          severity: 'medium',
          related_entity_id: material.material_id,
          message,
        });
      }
    }

    // Clear any active runway_low alert for a material that's no longer
    // at risk — restocked, usage slowed, or it crossed into low_stock
    // territory (which now owns the alert instead).
    const { rows: activeRunwayAlerts } = await query(
      `SELECT alert_id, related_entity_id FROM alert
      WHERE business_id = $1 AND type = 'runway_low' AND read = false`,
      [businessId]
    );

    for (const alert of activeRunwayAlerts) {
      if (!atRiskIds.has(alert.related_entity_id)) {
        await query(`UPDATE alert SET read = true WHERE alert_id = $1`, [alert.alert_id]);
      }
    }
  }

  /**
   * Returns unpaid/partial orders that are past their retailer's credit
   * window — the actual server-side definition of "overdue", used to drive
   * real payment_overdue alerts.
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