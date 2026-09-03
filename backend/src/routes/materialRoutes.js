//materialRoutes.js
const express = require('express');
const MaterialController = require('../controllers/materialController');
const validate = require('../middleware/validate');
const {
  createMaterialSchema,
  updateMaterialSchema,
  restockMaterialSchema,
  adjustMaterialSchema,
} = require('../schemas/validationSchemas');

const router = express.Router();

router.get('/', MaterialController.getAll);
router.get('/low-stock', MaterialController.getLowStock);
router.get('/:id', MaterialController.getById);
router.post('/', validate(createMaterialSchema), MaterialController.create);
router.patch('/:id', validate(updateMaterialSchema), MaterialController.update);
router.delete('/:id', MaterialController.delete);
router.post('/:id/restock', validate(restockMaterialSchema), MaterialController.restock);
router.post('/:id/adjust', validate(adjustMaterialSchema), MaterialController.adjust);

module.exports = router;
