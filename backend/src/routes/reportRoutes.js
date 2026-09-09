//reportRoutes.js
const express = require('express');
const ReportController = require('../controllers/reportController');

const router = express.Router();

router.get('/profit-summary', ReportController.getProfitSummary);
router.get('/profit-trend', ReportController.getProfitTrend);
router.get('/profit-by-product', ReportController.getProfitByProduct);
router.get('/weekly-margin', ReportController.getWeeklyMargin);
router.get('/receivables', ReportController.getReceivables);
router.get('/runway', ReportController.getRunway);

module.exports = router;
