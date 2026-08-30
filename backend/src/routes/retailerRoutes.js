const express = require('express');
const RetailerController = require('../controllers/retailerController');
const validate = require('../middleware/validate');
const { createRetailerSchema, updateRetailerSchema } = require('../schemas/validationSchemas');

const router = express.Router();

router.get('/', RetailerController.getAll);
router.get('/:id', RetailerController.getById);
router.post('/', validate(createRetailerSchema), RetailerController.create);
router.patch('/:id', validate(updateRetailerSchema), RetailerController.update);
router.delete('/:id', RetailerController.delete);

module.exports = router;
