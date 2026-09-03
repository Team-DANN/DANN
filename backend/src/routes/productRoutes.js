//productRoutes.js
const express = require('express');
const ProductController = require('../controllers/productController');
const validate = require('../middleware/validate');
const { createProductSchema } = require('../schemas/validationSchemas');

const router = express.Router();

router.get('/', ProductController.getAll);
router.get('/:id', ProductController.getById);
router.post('/', validate(createProductSchema), ProductController.create);
router.put('/:id/recipe', ProductController.updateRecipe);

module.exports = router;
