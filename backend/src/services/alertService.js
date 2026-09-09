//alert service
const AlertModel = require('../models/AlertModel');
const MaterialModel = require('../models/MaterialModel');
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
    // Safe to call on every request now: each sync function is an upsert
    // keyed on the DB's resolved-based unique index, so running it 100
    // times in a row for an unchanged situation still leaves exactly one
    // active row per real issue.
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

  /**
   * Reactive "already at/under threshold" alert. Called from
   * materialService.js after create/update/restock/adjust — not part of
   * the getAllAlerts() lazy-sync loop, since it's triggered directly by
   * the action that could have caused it.
   *
   * Uses AlertModel.upsertActive so repeated calls for a material that's
   * STILL low (e.g. two restocks in a row that don't clear the
   * threshold) update the same row in place instead of creating a new
   * one each time — dedup is enforced by the DB's partial unique index
   * on resolved = false, not by read state, so this can no longer be
   * broken just by a user opening the Alerts page in between.
   */
  static async syncMaterialStockAlert(material, businessId) {
    if (material.current_stock <= material.reorder_threshold) {
      const alert_id = `alt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const message = `${material.name} is low on stock (${material.current_stock} ${material.unit} left, threshold: ${material.reorder_threshold} ${material.unit})`;
      await AlertModel.upsertActive({
        alert_id,
        business_id: businessId,
        type: 'low_stock',
        severity: 'high',
        related_entity_id: material.material_id,
        message,
      });
    } else {
      // Stock recovered above threshold — resolve it. Does NOT touch
      // `read`; whatever read state the alert had stays as-is, it just
      // stops showing up in the active list.
      await AlertModel.resolveByEntity(businessId, 'low_stock', material.material_id);
    }
  }

  /**
   * Predictive alert, distinct from syncMaterialStockAlert: this fires
   * BEFORE a material actually crosses its reorder_threshold, based on
   * real consumption rate (MaterialModel.getAll computes
   * avgDailyConsumption from actual batch_material_usage history).
   * "You'll run out in N days at this rate" instead of "you're already
   * out."
   *
   * Deliberately skips materials that are ALREADY at/under
   * reorder_threshold — syncMaterialStockAlert already owns that case
   * with its own alert type ('low_stock'), so a material doesn't get two
   * separate alerts fighting for attention over the same underlying
   * problem. This only covers the gap: still above threshold, but the
   * real burn rate says it won't be for long.
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

      const roundedDays = Math.max(Math.round(daysLeft * 10) / 10, 0.1);
      const alert_id = `alt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const message = `${material.name} will run out in about ${roundedDays} day${roundedDays === 1 ? '' : 's'} at your current usage rate`;
      await AlertModel.upsertActive({
        alert_id,
        business_id: businessId,
        type: 'runway_low',
        severity: 'medium',
        related_entity_id: material.material_id,
        message,
      });
    }

    // Resolve any currently-active runway_low alert for a material that's
    // no longer at risk this pass — restocked, usage slowed, or it
    // crossed into low_stock territory (which now owns the alert
    // instead).
    const activeRunwayAlerts = await AlertModel.getActiveByType(businessId, 'runway_low');
    for (const alert of activeRunwayAlerts) {
      if (!atRiskIds.has(alert.related_entity_id)) {
        await AlertModel.resolveByEntity(businessId, 'runway_low', alert.related_entity_id);
      }
    }
  }

  /**
   * Syncs payment_overdue alerts against OrderService.getOverdueOrders(),
   * the real server-side definition of "overdue" (per-retailer credit
   * terms, not a flat client-side default).
   */
  static async syncOrderOverdueAlerts(businessId) {
    const overdueOrders = await OrderService.getOverdueOrders(businessId);
    const overdueOrderIds = new Set(overdueOrders.map((o) => o.order_id));

    for (const order of overdueOrders) {
      const remaining = order.total_amount - order.amount_paid;
      const alert_id = `alt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const message = `${order.retailer_name}, ₹${remaining.toFixed(2)} overdue`;
      await AlertModel.upsertActive({
        alert_id,
        business_id: businessId,
        type: 'payment_overdue',
        severity: 'medium',
        related_entity_id: order.order_id,
        message,
      });
    }

    const activeOverdueAlerts = await AlertModel.getActiveByType(businessId, 'payment_overdue');
    for (const alert of activeOverdueAlerts) {
      if (!overdueOrderIds.has(alert.related_entity_id)) {
        await AlertModel.resolveByEntity(businessId, 'payment_overdue', alert.related_entity_id);
      }
    }
  }
}

module.exports = AlertService;