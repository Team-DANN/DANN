const express = require('express');
const BusinessController = require('../controllers/businessController');
const validate = require('../middleware/validate');
const { updateBusinessSchema, alertSettingsSchema } = require('../schemas/validationSchemas');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', requireAuth, BusinessController.getProfile);
router.patch('/', requireAuth, validate(updateBusinessSchema), BusinessController.updateProfile);
router.get('/alert-settings', requireAuth, BusinessController.getAlertSettings);
router.patch(
  '/alert-settings',
  requireAuth,
  validate(alertSettingsSchema),
  BusinessController.updateAlertSettings
);

module.exports = router;