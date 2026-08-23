const express = require('express');
const OrderController = require('../controllers/orderController');

const router = express.Router();

router.get('/', OrderController.getAll);
router.get('/unpaid-summary', OrderController.getUnpaidSummary);
router.get('/:id', OrderController.getById);
router.post('/', OrderController.createOrder);
router.post('/:id/payment', OrderController.recordPayment);

module.exports = router;
