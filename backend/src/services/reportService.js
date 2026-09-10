//reportService
const { query } = require('../db/database');

class ReportService {
  static async getProfitSummary(businessId, startDate = null, endDate = null) {
    let revenueSql = `
      SELECT COALESCE(SUM(total_amount), 0.0) AS total_revenue, COUNT(*) AS total_orders
      FROM dispatch_order
      WHERE business_id = $1
    `;
    const revenueParams = [businessId];
    if (startDate) {
      revenueParams.push(startDate);
      revenueSql += ` AND dispatched_at >= $${revenueParams.length}`;
    }
    if (endDate) {
      revenueParams.push(endDate);
      revenueSql += ` AND dispatched_at <= $${revenueParams.length}`;
    }
    const { rows: revenueRows } = await query(revenueSql, revenueParams);
    const revenueRes = revenueRows[0];

    let costSql = `
      SELECT 
        COALESCE(SUM(total_material_cost), 0.0) AS total_material_cost,
        COALESCE(SUM(labor_cost), 0.0) AS total_labor_cost,
        COUNT(*) AS total_batches
      FROM production_log
      WHERE business_id = $1
    `;
    const costParams = [businessId];
    if (startDate) {
      costParams.push(startDate);
      costSql += ` AND produced_at >= $${costParams.length}`;
    }
    if (endDate) {
      costParams.push(endDate);
      costSql += ` AND produced_at <= $${costParams.length}`;
    }
    const { rows: costRows } = await query(costSql, costParams);
    const costRes = costRows[0];

    const totalRevenue = revenueRes ? revenueRes.total_revenue : 0;
    const totalMaterialCost = costRes ? costRes.total_material_cost : 0;
    const totalLaborCost = costRes ? costRes.total_labor_cost : 0;
    const totalCost = totalMaterialCost + totalLaborCost;
    const netProfit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(2) : 0;

    return {
      total_revenue: totalRevenue,
      total_material_cost: totalMaterialCost,
      total_labor_cost: totalLaborCost,
      total_cost: totalCost,
      net_profit: netProfit,
      profit_margin_percent: Number(profitMargin),
      total_orders: revenueRes ? revenueRes.total_orders : 0,
      total_batches: costRes ? costRes.total_batches : 0,
    };
  }

  /**
   * Wraps getProfitSummary with a real period-over-period comparison,
   * generalized from the fixed-7-day logic in getWeeklyMargin so it works
   * against whatever period Finance's PeriodFilter actually selected
   * (week/month/year/custom range) instead of always comparing to "last
   * week" regardless of what's on screen.
   *
   * Compares against the immediately preceding period of the SAME length
   * (e.g. a 31-day month compares against the 31 days before it). Returns
   * null for all three trend fields when startDate/endDate are absent
   * (the "All time" period) — there's no meaningful "previous all-time" to
   * diff against, so the frontend must render no arrow at all rather than
   * inventing one.
   */
  static async getProfitSummaryWithTrend(businessId, startDate = null, endDate = null) {
    const current = await this.getProfitSummary(businessId, startDate, endDate);

    let trends = {
      revenue_trend_percent: null,
      cost_trend_percent: null,
      profit_trend_percent: null,
    };

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const periodMs = end.getTime() - start.getTime();

      if (periodMs > 0) {
        const prevEnd = new Date(start.getTime() - 1);
        const prevStart = new Date(prevEnd.getTime() - periodMs);
        const previous = await this.getProfitSummary(businessId, prevStart.toISOString(), prevEnd.toISOString());

        const pctChange = (curr, prev) => {
          if (prev === 0) return null;
          return Math.round(((curr - prev) / Math.abs(prev)) * 100);
        };

        trends = {
          revenue_trend_percent: pctChange(current.total_revenue, previous.total_revenue),
          cost_trend_percent: pctChange(current.total_cost, previous.total_cost),
          profit_trend_percent: pctChange(current.net_profit, previous.net_profit),
        };
      }
    }

    return { ...current, ...trends };
  }

  /**
   * Per-product revenue AND profit for products that actually sold within
   * the given period. Previously this returned selling_price/cost_per_unit/
   * margin_percent/stock_on_hand — a static snapshot of current catalog
   * pricing with no connection to period sales at all — while
   * ProfitByProductTable.jsx has always expected productId/name/revenue/
   * qty. That mismatch is exactly why every row rendered "₹NaN" and
   * "×undefined units": the fields the frontend read simply didn't exist
   * on the response. Fixed by joining dispatch_order (real sales) within
   * the period against each product, and returning the exact shape the
   * table has always been built for.
   *
   * profit uses each product's current cost_per_unit × units sold —
   * MATERIAL cost only. labor_cost is only tracked at the whole-batch
   * level (production_log.labor_cost), not allocated per unit sold, so
   * this is closer to "gross material margin" than final net profit per
   * item. Flagged in the UI disclaimer, not hidden.
   *
   * startDate/endDate are optional — when both are omitted (the "All
   * time" period), the date filter is skipped entirely rather than
   * requiring both params.
   */
  static async getProfitByProduct(businessId, startDate = null, endDate = null) {
    const { rows } = await query(
      `SELECT
        p.product_id AS "productId",
        p.name AS name,
        p.cost_per_unit AS "unitCost",
        COALESCE(SUM(o.quantity), 0) AS qty,
        COALESCE(SUM(o.total_amount), 0) AS revenue,
        (p.cost_per_unit * COALESCE(SUM(o.quantity), 0)) AS cost,
        COALESCE(SUM(o.total_amount), 0) - (p.cost_per_unit * COALESCE(SUM(o.quantity), 0)) AS profit
      FROM product p
      LEFT JOIN dispatch_order o
        ON o.product_id = p.product_id
        AND o.business_id = p.business_id
        AND ($2::timestamptz IS NULL OR o.dispatched_at >= $2)
        AND ($3::timestamptz IS NULL OR o.dispatched_at <= $3)
      WHERE p.business_id = $1 AND p.active = true
      GROUP BY p.product_id, p.name, p.cost_per_unit
      HAVING COALESCE(SUM(o.quantity), 0) > 0
      ORDER BY revenue DESC`,
      [businessId, startDate, endDate]
    );
    return rows;
  }

static async getWeeklyMargin(businessId) {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();

    const currentWeekSummary = await this.getProfitSummary(businessId, sevenDaysAgo, null);
    const priorWeekSummary = await this.getProfitSummary(businessId, fourteenDaysAgo, sevenDaysAgo);

    let trend = null;
    if (priorWeekSummary.net_profit !== 0) {
      trend = Math.round(((currentWeekSummary.net_profit - priorWeekSummary.net_profit) / Math.abs(priorWeekSummary.net_profit)) * 100);
    }

    return {
      amount: currentWeekSummary.net_profit,
      trend,
      revenue: currentWeekSummary.total_revenue,
      cost: currentWeekSummary.total_cost,
      margin_percent: currentWeekSummary.profit_margin_percent,
    };
  }

  static async getReceivablesSummary(businessId) {
    const { rows } = await query(
      `SELECT 
        COALESCE(SUM(total_amount - amount_paid), 0.0) AS total_receivables,
        COUNT(CASE WHEN status IN ('owes', 'partial') THEN 1 END) AS unpaid_orders_count
      FROM dispatch_order
      WHERE business_id = $1 AND status IN ('owes', 'partial')`,
      [businessId]
    );
    const res = rows[0];
    return {
      amount: res ? res.total_receivables : 0,
      overdueCount: res ? res.unpaid_orders_count : 0,
    };
  }

  static async getRunwayEstimate(businessId) {
    const { rows: usages } = await query(
      `SELECT 
        m.material_id,
        m.name AS material_name,
        m.current_stock,
        m.unit,
        COALESCE(SUM(bmu.quantity_used), 0.0) AS total_consumed
      FROM material m
      LEFT JOIN batch_material_usage bmu ON m.material_id = bmu.material_id
      WHERE m.business_id = $1
      GROUP BY m.material_id, m.name, m.current_stock, m.unit`,
      [businessId]
    );

    const { rows: daysRows } = await query(
      `SELECT COUNT(DISTINCT DATE(produced_at)) AS production_days
      FROM production_log
      WHERE business_id = $1`,
      [businessId]
    );
    const daysRes = daysRows[0];
    const productionDays = Math.max(daysRes && daysRes.production_days ? daysRes.production_days : 1, 1);

    const detailedRunways = usages.map(u => {
      const avgDailyUse = u.total_consumed / productionDays;
      const daysLeft = avgDailyUse > 0 ? Number((u.current_stock / avgDailyUse).toFixed(1)) : null;
      return {
        material_id: u.material_id,
        material: u.material_name,
        current_stock: u.current_stock,
        unit: u.unit,
        avg_daily_consumption: Number(avgDailyUse.toFixed(2)),
        daysLeft,
      };
    });

    detailedRunways.sort((a, b) => {
      if (a.daysLeft === null && b.daysLeft === null) return 0;
      if (a.daysLeft === null) return 1;
      if (b.daysLeft === null) return -1;
      return a.daysLeft - b.daysLeft;
    });

    if (detailedRunways.length === 0) {
      return { material: null, daysLeft: null, details: [] };
    }

    const mostConstrained = detailedRunways[0];

    return {
      material: mostConstrained.material,
      daysLeft: mostConstrained.daysLeft === null ? null : Math.round(mostConstrained.daysLeft),
      details: detailedRunways,
    };
  }

  static async getProfitTrend(businessId, startDate = null, endDate = null) {
    const end = endDate || new Date().toISOString();
    const start = startDate || new Date(new Date(end).getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { rows: revenueRows } = await query(
      `SELECT DATE(dispatched_at) AS day, COALESCE(SUM(total_amount), 0.0) AS revenue
      FROM dispatch_order
      WHERE business_id = $1 AND dispatched_at >= $2 AND dispatched_at <= $3
      GROUP BY DATE(dispatched_at)
      ORDER BY day ASC`,
      [businessId, start, end]
    );

    const { rows: costRows } = await query(
      `SELECT DATE(produced_at) AS day, COALESCE(SUM(total_material_cost + labor_cost), 0.0) AS costs
      FROM production_log
      WHERE business_id = $1 AND produced_at >= $2 AND produced_at <= $3
      GROUP BY DATE(produced_at)
      ORDER BY day ASC`,
      [businessId, start, end]
    );

    const byDay = new Map();
    for (const r of revenueRows) {
      const key = r.day instanceof Date ? r.day.toISOString().split('T')[0] : r.day;
      byDay.set(key, { day: key, revenue: r.revenue, costs: 0 });
    }
    for (const c of costRows) {
      const key = c.day instanceof Date ? c.day.toISOString().split('T')[0] : c.day;
      const existing = byDay.get(key);
      if (existing) {
        existing.costs = c.costs;
      } else {
        byDay.set(key, { day: key, revenue: 0, costs: c.costs });
      }
    }

    return Array.from(byDay.values()).sort((a, b) => a.day.localeCompare(b.day));
  }
}

module.exports = ReportService;