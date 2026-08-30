const express = require('express');
const BatchController = require('../controllers/batchController');
const validate = require('../middleware/validate');
const { createBatchSchema } = require('../schemas/validationSchemas');

const router = express.Router();

router.get('/', BatchController.getAll);
router.get('/:id', BatchController.getById);
router.post('/', validate(createBatchSchema), BatchController.createBatch);

module.exports = router;
