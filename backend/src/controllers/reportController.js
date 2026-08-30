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
}

module.exports = ReportController;
