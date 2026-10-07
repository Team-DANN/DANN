const express = require('express');
const StaffController = require('../controllers/staffController');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/authMiddleware');
const { requireStaffAdmin, requireOwner } = require('../middleware/access');
const { createStaffSchema, updateStaffSchema } = require('../schemas/staffSchemas');

const router = express.Router();

router.use(requireAuth, requireStaffAdmin);

router.get('/', StaffController.list);
router.post('/', validate(createStaffSchema), StaffController.create);
router.patch('/:id', validate(updateStaffSchema), StaffController.update);
// Only works before the person's first sign-in (see StaffService.resetPin).
router.post('/:id/reset-pin', StaffController.resetPin);
// Owner only. Soft removal: blocks login, keeps their history.
router.delete('/:id', requireOwner, StaffController.remove);

module.exports = router;