const ReportService = require('../services/reportService');

class ReportController {
  static getProfitSummary(req, res, next) {
    try {
      const { start_date, end_date } = req.query;
      const summary = ReportService.getProfitSummary(req.business_id, start_date, end_date);
      res.json({ success: true, data: summary });
    } catch (err) {
      next(err);
    }
  }

  static getProfitByProduct(req, res, next) {
    try {
      const breakdown = ReportService.getProfitByProduct(req.business_id);
      res.json({ success: true, data: breakdown });
    } catch (err) {
      next(err);
    }
  }

  static getWeeklyMargin(req, res, next) {
    try {
      const weeklyMargin = ReportService.getWeeklyMargin(req.business_id);
      res.json({ success: true, data: weeklyMargin });
    } catch (err) {
      next(err);
    }
  }

  static getReceivables(req, res, next) {
    try {
      const receivables = ReportService.getReceivablesSummary(req.business_id);
      res.json({ success: true, data: receivables });
    } catch (err) {
      next(err);
    }
  }

  static getRunway(req, res, next) {
    try {
      const runway = ReportService.getRunwayEstimate(req.business_id);
      res.json({ success: true, data: runway });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = ReportController;
