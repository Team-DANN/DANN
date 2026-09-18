const express = require('express');
const OcrCaptureController = require('../controllers/ocrCaptureController');
const validate = require('../middleware/validate');
const { createOcrCaptureSchema } = require('../schemas/validationSchemas');

const router = express.Router();

router.get('/', OcrCaptureController.getAll);
router.post('/', validate(createOcrCaptureSchema), OcrCaptureController.create);

module.exports = router;