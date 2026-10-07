//materialRoutes.js
const express = require('express');
const MaterialController = require('../controllers/materialController');
const validate = require('../middleware/validate');
const { requireModule, stampCreatedBy } = require('../middleware/access');
const { canDeleteMaterial } = require('../middleware/materialGuards');
const {
  createMaterialSchema,
  updateMaterialSchema,
  restockMaterialSchema,
  adjustMaterialSchema,
} = require('../schemas/validationSchemas');

const router = express.Router();

// Production staff need to read materials to log batches, and may create
// new ones during photo import.
const inventoryOrProduction = requireModule('inventory', 'production');
const inventoryOnly = requireModule('inventory');

router.get('/', inventoryOrProduction, MaterialController.getAll);
router.get('/low-stock', inventoryOrProduction, MaterialController.getLowStock);
router.get('/:id', inventoryOrProduction, MaterialController.getById);
router.post('/', inventoryOrProduction, validate(createMaterialSchema), stampCreatedBy, MaterialController.create);
router.patch('/:id', inventoryOnly, validate(updateMaterialSchema), MaterialController.update);
router.delete('/:id', canDeleteMaterial, MaterialController.delete);
router.post('/:id/restock', inventoryOnly, validate(restockMaterialSchema), MaterialController.restock);
router.post('/:id/adjust', inventoryOnly, validate(adjustMaterialSchema), MaterialController.adjust);

module.exports = router;