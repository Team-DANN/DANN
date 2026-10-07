//retailerRoutes.js
const express = require('express');
const RetailerController = require('../controllers/retailerController');
const validate = require('../middleware/validate');
const { requireModule } = require('../middleware/access');
const { createRetailerSchema, updateRetailerSchema } = require('../schemas/validationSchemas');

const router = express.Router();

// Finance can read retailers (to follow up on payments) but not change them.
const ordersOrFinance = requireModule('orders', 'finance');
const ordersOnly = requireModule('orders');

router.get('/', ordersOrFinance, RetailerController.getAll);
router.get('/:id', ordersOrFinance, RetailerController.getById);
router.post('/', ordersOnly, validate(createRetailerSchema), RetailerController.create);
router.patch('/:id', ordersOnly, validate(updateRetailerSchema), RetailerController.update);
router.delete('/:id', ordersOnly, RetailerController.delete);

module.exports = router;