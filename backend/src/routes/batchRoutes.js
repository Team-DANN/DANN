const express = require('express');
const BatchController = require('../controllers/batchController');

const router = express.Router();

router.get('/', BatchController.getAll);
router.get('/:id', BatchController.getById);
router.post('/', BatchController.createBatch);

module.exports = router;
