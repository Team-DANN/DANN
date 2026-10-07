//productRoutes.js
const express = require('express');
const ProductController = require('../controllers/productController');
const validate = require('../middleware/validate');
const { requireModule } = require('../middleware/access');
const { createProductSchema } = require('../schemas/validationSchemas');

const router = express.Router();

// Products are shared reference data: production builds them, orders
// dispatches them, inventory counts finished stock.
const canReadProducts = requireModule('production', 'orders', 'inventory');
const productionOnly = requireModule('production');

router.get('/', canReadProducts, ProductController.getAll);
router.get('/:id', canReadProducts, ProductController.getById);
router.post('/', productionOnly, validate(createProductSchema), ProductController.create);
router.put('/:id/recipe', productionOnly, ProductController.updateRecipe);
// Soft delete only (active = false): production and order history stays intact.
router.delete('/:id', productionOnly, ProductController.delete);

module.exports = router;