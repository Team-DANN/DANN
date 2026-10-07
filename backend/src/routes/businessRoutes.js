const express = require('express');
const BusinessController = require('../controllers/businessController');
const validate = require('../middleware/validate');
const { updateBusinessSchema, alertSettingsSchema } = require('../schemas/validationSchemas');
const { requireStaffAdmin } = require('../middleware/access');

const router = express.Router();

// index.js already applies requireAuth to this whole router.

// Any signed-in user can read the business profile (name, currency).
router.get('/', BusinessController.getProfile);

// Only the owner or a manager can change business settings.
router.patch('/', requireStaffAdmin, validate(updateBusinessSchema), BusinessController.updateProfile);
router.get('/alert-settings', requireStaffAdmin, BusinessController.getAlertSettings);
router.patch(
  '/alert-settings',
  requireStaffAdmin,
  validate(alertSettingsSchema),
  BusinessController.updateAlertSettings
);

module.exports = router;