const express = require('express');
const MaterialController = require('../controllers/materialController');

const router = express.Router();

router.get('/', MaterialController.getAll);
router.get('/low-stock', MaterialController.getLowStock);
router.get('/:id', MaterialController.getById);
router.post('/', MaterialController.create);
router.patch('/:id', MaterialController.update);
router.delete('/:id', MaterialController.delete);
router.post('/:id/restock', MaterialController.restock);
router.post('/:id/adjust', MaterialController.adjust);

module.exports = router;
