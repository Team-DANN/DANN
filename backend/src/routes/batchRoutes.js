//batchRoutes.js
const express = require('express');
const BatchController = require('../controllers/batchController');
const validate = require('../middleware/validate');
const { requireModule } = require('../middleware/access');
const { createBatchSchema } = require('../schemas/validationSchemas');
const { updateBatchSchema } = require('../schemas/batchSchemas');

const router = express.Router();

const productionOnly = requireModule('production');

router.get('/', productionOnly, BatchController.getAll);
router.get('/:id', productionOnly, BatchController.getById);
router.get('/:id/history', productionOnly, BatchController.getHistory);
router.post('/', productionOnly, validate(createBatchSchema), BatchController.createBatch);
// Own batches only for staff (enforced in the services); owner and manager
// can edit or undo any batch.
router.patch('/:id', productionOnly, validate(updateBatchSchema), BatchController.update);
router.delete('/:id', productionOnly, BatchController.undo);

module.exports = router;