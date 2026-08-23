const express = require('express');
const ReportController = require('../controllers/reportController');

const router = express.Router();

router.get('/profit-summary', ReportController.getProfitSummary);
router.get('/profit-by-product', ReportController.getProfitByProduct);

module.exports = router;
