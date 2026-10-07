const express = require('express');
const OcrCaptureController = require('../controllers/ocrCaptureController');
const validate = require('../middleware/validate');
const { requireStaffAdmin, requireModuleFromBody } = require('../middleware/access');
const { createOcrCaptureSchema } = require('../schemas/validationSchemas');

const router = express.Router();

// Listing shows every category, so it stays with the owner and managers.
router.get('/', requireStaffAdmin, OcrCaptureController.getAll);

// Saving a capture needs access to the module its category names:
// production / orders / inventory / finance.
router.post(
  '/',
  validate(createOcrCaptureSchema),
  requireModuleFromBody('category'),
  OcrCaptureController.create
);

module.exports = router;