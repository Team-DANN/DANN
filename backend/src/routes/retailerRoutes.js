const express = require('express');
const RetailerController = require('../controllers/retailerController');

const router = express.Router();

router.get('/', RetailerController.getAll);
router.get('/:id', RetailerController.getById);
router.post('/', RetailerController.create);
router.patch('/:id', RetailerController.update);
router.delete('/:id', RetailerController.delete);

module.exports = router;
