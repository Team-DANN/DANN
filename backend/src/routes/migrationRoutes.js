const express = require('express');
const MigrationController = require('../controllers/migrationController');
const validate = require('../middleware/validate');
const { requireStaffAdmin } = require('../middleware/access');
const { migrationAnalyzeSchema, migrationCommitSchema } = require('../schemas/validationSchemas');

const router = express.Router();

// Bulk data import and rollback touch every module at once, so they stay
// with the owner and managers. index.js already applies requireAuth.
router.use(requireStaffAdmin);
router.get('/', MigrationController.getHistory);
router.post('/analyze', validate(migrationAnalyzeSchema), MigrationController.analyze);
router.post('/:id/commit', validate(migrationCommitSchema), MigrationController.commit);
router.post('/:id/rollback', MigrationController.rollback);

module.exports = router;