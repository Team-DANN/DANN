//reportController
const ReportService = require('../services/reportService');

class ReportController {
  static async getProfitSummary(req, res, next) {
    try {
      const { start_date, end_date } = req.query;
      const summary = await ReportService.getProfitSummary(req.business_id, start_date, end_date);
      res.json({ success: true, data: summary });
    } catch (err) {
      next(err);
    }
  }

  static async getProfitByProduct(req, res, next) {
    try {
      const breakdown = await ReportService.getProfitByProduct(req.business_id);
      res.json({ success: true, data: breakdown });
    } catch (err) {
      next(err);
    }
  }

  static async getWeeklyMargin(req, res, next) {
    try {
      const weeklyMargin = await ReportService.getWeeklyMargin(req.business_id);
      res.json({ success: true, data: weeklyMargin });
    } catch (err) {
      next(err);
    }
  }

  static async getReceivables(req, res, next) {
    try {
      const receivables = await ReportService.getReceivablesSummary(req.business_id);
      res.json({ success: true, data: receivables });
    } catch (err) {
      next(err);
    }
  }

  static async getRunway(req, res, next) {
    try {
      const runway = await ReportService.getRunwayEstimate(req.business_id);
      res.json({ success: true, data: runway });
    } catch (err) {
      next(err);
    }
  }
  static async getProfitTrend(req, res, next) {
  try {
    const { start_date, end_date } = req.query;
    const trend = await ReportService.getProfitTrend(req.business_id, start_date, end_date);
    res.json({ success: true, data: trend });
  } catch (err) {
    next(err);
  }
  }
}

module.exports = ReportController;