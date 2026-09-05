//reportService
const { query } = require('../db/database');

class ReportService {
  /**
   * Overall Profit Summary for a given date range (or all-time)
   */
  static async getProfitSummary(businessId, startDate = null, endDate = null) {
    // Revenue from orders
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

    // Costs from production batches
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
   * Product-level Profitability Breakdown
   */
  static async getProfitByProduct(businessId) {
    const { rows } = await query(
      `SELECT 
        p.product_id AS id,
        p.product_id,
        p.name AS product_name,
        p.category,
        p.unit,
        p.selling_price,
        p.cost_per_unit,
        (p.selling_price - p.cost_per_unit) AS unit_profit,
        CASE 
          WHEN p.selling_price > 0 THEN ROUND(((p.selling_price - p.cost_per_unit) / p.selling_price) * 100, 2)
          ELSE 0.0
        END AS margin_percent,
        p.current_stock AS stock_on_hand
      FROM product p
      WHERE p.business_id = $1 AND p.active = true
      ORDER BY margin_percent DESC`,
      [businessId]
    );
    return rows;
  }

  /**
   * Weekly Margin & Trend Analytics
   */
  static async getWeeklyMargin(businessId) {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();

    const currentWeekSummary = await this.getProfitSummary(businessId, sevenDaysAgo, null);
    const priorWeekSummary = await this.getProfitSummary(businessId, fourteenDaysAgo, sevenDaysAgo);

    let trend = 0;
    if (priorWeekSummary.net_profit !== 0) {
      trend = Math.round(((currentWeekSummary.net_profit - priorWeekSummary.net_profit) / Math.abs(priorWeekSummary.net_profit)) * 100);
    } else if (currentWeekSummary.net_profit > 0) {
      trend = 100;
    }

    return {
      amount: currentWeekSummary.net_profit,
      trend,
      revenue: currentWeekSummary.total_revenue,
      cost: currentWeekSummary.total_cost,
      margin_percent: currentWeekSummary.profit_margin_percent,
    };
  }

  /**
   * Receivables & Overdue Balances Summary
   */
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

  /**
   * Material Stock Runway Estimation
   */
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
      // No consumption history for this material yet — daysLeft is
      // genuinely unknown, not "999" or "30". null means "no data", and
      // the frontend must treat it as an empty/neutral state, not a number.
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

    // Materials with real daysLeft (some consumption history) sort first,
    // most-constrained first; materials with no data yet trail behind them.
    detailedRunways.sort((a, b) => {
      if (a.daysLeft === null && b.daysLeft === null) return 0;
      if (a.daysLeft === null) return 1;
      if (b.daysLeft === null) return -1;
      return a.daysLeft - b.daysLeft;
    });

    // No materials tracked at all (non-bakery business hasn't set up
    // inventory yet, or a fresh account) — no invented material name.
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
  /**
   * Day-by-day Profit Trend within a date range.
   *
   * Buckets revenue (from dispatch_order.dispatched_at) and cost (from
   * production_log.produced_at) separately by calendar day, then merges
   * them client-side into one array so days with revenue-but-no-production
   * (or vice versa) still show up with the other side at 0 rather than
   * being dropped by an INNER JOIN across two unrelated tables.
   *
   * If startDate/endDate are omitted, defaults to the last 30 days —
   * an unbounded trend query would return one point per day since the
   * business was created, which is a reasonable UI cap point but should
   * be revisited if "All time" needs a real full-range chart later.
   */
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

    // Merge both series into one map keyed by ISO day string
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