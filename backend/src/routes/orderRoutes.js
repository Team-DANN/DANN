//orderRoutes.js
const express = require('express');
const OrderController = require('../controllers/orderController');
const validate = require('../middleware/validate');
const { createOrderSchema, recordPaymentSchema } = require('../schemas/validationSchemas');

const router = express.Router();

router.get('/', OrderController.getAll);
router.get('/unpaid-summary', OrderController.getUnpaidSummary);
router.get('/:id', OrderController.getById);
router.post('/', validate(createOrderSchema), OrderController.createOrder);
router.post('/:id/payment', validate(recordPaymentSchema), OrderController.recordPayment);

module.exports = router;
