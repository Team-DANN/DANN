const { getDb } = require('../db/database');

class ReportService {
  /**
   * Overall Profit Summary for a given date range (or all-time)
   */
  static getProfitSummary(businessId, startDate = null, endDate = null) {
    const db = getDb();
    
    // Revenue from orders
    let revenueQuery = `
      SELECT COALESCE(SUM(total_amount), 0.0) AS total_revenue, COUNT(*) AS total_orders
      FROM dispatch_order
      WHERE business_id = ?
    `;
    const revenueParams = [businessId];
    if (startDate) {
      revenueQuery += ` AND dispatched_at >= ?`;
      revenueParams.push(startDate);
    }
    if (endDate) {
      revenueQuery += ` AND dispatched_at <= ?`;
      revenueParams.push(endDate);
    }
    const revenueRes = db.prepare(revenueQuery).get(...revenueParams);

    // Costs from production batches
    let costQuery = `
      SELECT 
        COALESCE(SUM(total_material_cost), 0.0) AS total_material_cost,
        COALESCE(SUM(labor_cost), 0.0) AS total_labor_cost,
        COUNT(*) AS total_batches
      FROM production_log
      WHERE business_id = ?
    `;
    const costParams = [businessId];
    if (startDate) {
      costQuery += ` AND produced_at >= ?`;
      costParams.push(startDate);
    }
    if (endDate) {
      costQuery += ` AND produced_at <= ?`;
      costParams.push(endDate);
    }
    const costRes = db.prepare(costQuery).get(...costParams);

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
  static getProfitByProduct(businessId) {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT 
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
      WHERE p.business_id = ? AND p.active = 1
      ORDER BY margin_percent DESC
    `);
    return stmt.all(businessId);
  }

  /**
   * Weekly Margin & Trend Analytics
   */
  static getWeeklyMargin(businessId) {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();

    const currentWeekSummary = this.getProfitSummary(businessId, sevenDaysAgo, null);
    const priorWeekSummary = this.getProfitSummary(businessId, fourteenDaysAgo, sevenDaysAgo);

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
  static getReceivablesSummary(businessId) {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT 
        COALESCE(SUM(total_amount - amount_paid), 0.0) AS total_receivables,
        COUNT(CASE WHEN status IN ('owes', 'partial') THEN 1 END) AS unpaid_orders_count
      FROM dispatch_order
      WHERE business_id = ? AND status IN ('owes', 'partial')
    `);
    const res = stmt.get(businessId);
    return {
      amount: res ? res.total_receivables : 0,
      overdueCount: res ? res.unpaid_orders_count : 0,
    };
  }

  /**
   * Material Stock Runway Estimation
   */
  static getRunwayEstimate(businessId) {
    const db = getDb();
    
    // Aggregate material consumption over all recorded batches
    const usagesStmt = db.prepare(`
      SELECT 
        m.material_id,
        m.name AS material_name,
        m.current_stock,
        m.unit,
        COALESCE(SUM(bmu.quantity_used), 0.0) AS total_consumed
      FROM material m
      LEFT JOIN batch_material_usage bmu ON m.material_id = bmu.material_id
      WHERE m.business_id = ?
      GROUP BY m.material_id, m.name, m.current_stock, m.unit
    `);
    const usages = usagesStmt.all(businessId);

    // Get count of days with production
    const daysStmt = db.prepare(`
      SELECT COUNT(DISTINCT DATE(produced_at)) AS production_days
      FROM production_log
      WHERE business_id = ?
    `);
    const daysRes = daysStmt.get(businessId);
    const productionDays = Math.max(daysRes && daysRes.production_days ? daysRes.production_days : 1, 1);

    const detailedRunways = usages.map(u => {
      const avgDailyUse = u.total_consumed / productionDays;
      const daysLeft = avgDailyUse > 0 ? Number((u.current_stock / avgDailyUse).toFixed(1)) : 999;
      return {
        material_id: u.material_id,
        material: u.material_name,
        current_stock: u.current_stock,
        unit: u.unit,
        avg_daily_consumption: Number(avgDailyUse.toFixed(2)),
        daysLeft,
      };
    });

    detailedRunways.sort((a, b) => a.daysLeft - b.daysLeft);
    const mostConstrained = detailedRunways[0] || { material: 'Wheat flour', daysLeft: 0 };

    return {
      material: mostConstrained.material,
      daysLeft: mostConstrained.daysLeft === 999 ? 30 : Math.round(mostConstrained.daysLeft),
      details: detailedRunways,
    };
  }
}

module.exports = ReportService;
