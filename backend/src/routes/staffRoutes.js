const express = require('express');
const StaffController = require('../controllers/staffController');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/authMiddleware');
const { requireStaffAdmin } = require('../middleware/access');
const { createStaffSchema, updateStaffSchema } = require('../schemas/staffSchemas');

const router = express.Router();

router.use(requireAuth, requireStaffAdmin);

router.get('/', StaffController.list);
router.post('/', validate(createStaffSchema), StaffController.create);
router.patch('/:id', validate(updateStaffSchema), StaffController.update);
// Only works before the person's first sign-in (see StaffService.resetPin).
router.post('/:id/reset-pin', StaffController.resetPin);
// Owner or manager. StaffService.terminate stops a manager from removing
// another manager or the owner. Soft removal: blocks login, keeps history.
router.delete('/:id', StaffController.remove);

module.exports = router;