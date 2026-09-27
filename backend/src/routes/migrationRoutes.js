const express = require('express');
const MigrationController = require('../controllers/migrationController');
const { requireAuth } = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');
const { migrationAnalyzeSchema, migrationCommitSchema } = require('../schemas/validationSchemas');

const router = express.Router();

router.use(requireAuth);
router.get('/', MigrationController.getHistory);
router.post('/analyze', validate(migrationAnalyzeSchema), MigrationController.analyze);
router.post('/:id/commit', validate(migrationCommitSchema), MigrationController.commit);
router.post('/:id/rollback', MigrationController.rollback);

module.exports = router;
