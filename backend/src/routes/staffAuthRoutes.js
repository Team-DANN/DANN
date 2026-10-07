const express = require('express');
const StaffController = require('../controllers/staffController');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/authMiddleware');
const { staffLoginSchema, changePinSchema } = require('../schemas/staffSchemas');

const router = express.Router();

// Public: staff have no token yet.
router.post('/staff-login', validate(staffLoginSchema), StaffController.staffLogin);

// Any signed-in staff member or manager changes their OWN PIN.
router.patch('/pin', requireAuth, validate(changePinSchema), StaffController.changePin);

module.exports = router;