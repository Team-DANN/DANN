//orderRoutes.js
const express = require('express');
const OrderController = require('../controllers/orderController');
const validate = require('../middleware/validate');
const { requireModule } = require('../middleware/access');
const { createOrderSchema, recordPaymentSchema } = require('../schemas/validationSchemas');

const router = express.Router();

const ordersOrFinance = requireModule('orders', 'finance');
const ordersOnly = requireModule('orders');

router.get('/', ordersOrFinance, OrderController.getAll);
router.get('/unpaid-summary', ordersOrFinance, OrderController.getUnpaidSummary);
router.get('/overdue', ordersOrFinance, OrderController.getOverdue);
router.get('/:id', ordersOrFinance, OrderController.getById);
// Only orders staff create dispatches (this deducts finished stock).
router.post('/', ordersOnly, validate(createOrderSchema), OrderController.createOrder);
// Payments can be recorded by orders or finance staff.
router.post('/:id/payment', ordersOrFinance, validate(recordPaymentSchema), OrderController.recordPayment);

module.exports = router;