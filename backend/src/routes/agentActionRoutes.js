const express = require('express');
const AgentActionController = require('../controllers/agentActionController');
const validate = require('../middleware/validate');
const { requireStaffAdmin } = require('../middleware/access');
const {
  createAgentActionSchema,
  completeAgentActionSchema,
} = require('../schemas/agentActionSchemas');

const router = express.Router();

// Owner and manager only, like the assistant itself for now. Loosen this
// when staff get the assistant (per-tool modules).
router.get('/', requireStaffAdmin, AgentActionController.getAll);
router.post('/', requireStaffAdmin, validate(createAgentActionSchema), AgentActionController.create);
router.patch(
  '/:action_id',
  requireStaffAdmin,
  validate(completeAgentActionSchema),
  AgentActionController.complete
);

module.exports = router;