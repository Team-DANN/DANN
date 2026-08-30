const { getDb } = require('../db/database');

class ReportService {
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
}

module.exports = ReportService;
