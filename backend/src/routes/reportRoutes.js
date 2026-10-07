//reportRoutes.js
const express = require('express');
const ReportController = require('../controllers/reportController');
const { requireModule } = require('../middleware/access');

const router = express.Router();

const financeOnly = requireModule('finance');

router.get('/profit-summary', financeOnly, ReportController.getProfitSummary);
router.get('/profit-trend', financeOnly, ReportController.getProfitTrend);
router.get('/profit-by-product', financeOnly, ReportController.getProfitByProduct);
router.get('/weekly-margin', financeOnly, ReportController.getWeeklyMargin);
router.get('/receivables', financeOnly, ReportController.getReceivables);
// Runway is about materials, so inventory and production staff see it.
router.get('/runway', requireModule('inventory', 'production'), ReportController.getRunway);

module.exports = router;