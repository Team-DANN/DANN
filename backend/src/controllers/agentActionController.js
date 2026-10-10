const AgentActionModel = require('../models/AgentActionModel');

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

class AgentActionController {
  // Reserve an action before it runs. A repeated action_id is a 409.
  static async create(req, res, next) {
    try {
      const { action_id, tool, arguments: args } = req.body;
      const row = await AgentActionModel.reserve({
        action_id,
        business_id: req.business_id,
        user_id: req.user_id,
        tool,
        args,
      });
      if (!row) throw httpError(409, 'This action was already submitted.');
      res.status(201).json({ success: true, data: row, message: 'Action recorded' });
    } catch (err) {
      next(err);
    }
  }

  // Close a pending action as executed or failed.
  static async complete(req, res, next) {
    try {
      const { action_id } = req.params;
      const existing = await AgentActionModel.getById(action_id, req.business_id);
      if (!existing || existing.user_id !== req.user_id) {
        throw httpError(404, 'Action not found');
      }
      const row = await AgentActionModel.complete({
        action_id,
        business_id: req.business_id,
        user_id: req.user_id,
        status: req.body.status,
        result: req.body.result,
      });
      if (!row) throw httpError(409, 'This action was already completed.');
      res.json({ success: true, data: row, message: 'Action updated' });
    } catch (err) {
      next(err);
    }
  }

  static async getAll(req, res, next) {
    try {
      const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
      const rows = await AgentActionModel.getAll(req.business_id, limit);
      res.json({ success: true, data: rows });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = AgentActionController;