//batchController
const BatchService = require('../services/batchService');
const BatchUndoService = require('../services/batchUndoService');

// The edit rule lives in BatchService.updateBatch; this flag only tells the
// frontend whether to show an Edit button. Owner and manager can edit any
// batch, everyone else only their own.
function withCanEdit(batch, req) {
  return { ...batch, can_edit: req.access.fullAccess || batch.logged_by === req.user_id };
}

class BatchController {
  static async getAll(req, res, next) {
    try {
      const batches = await BatchService.getBatches(req.business_id);
      res.json({ success: true, data: batches.map((b) => withCanEdit(b, req)) });
    } catch (err) {
      next(err);
    }
  }

  static async getById(req, res, next) {
    try {
      const batch = await BatchService.getBatchById(req.params.id, req.business_id);
      res.json({ success: true, data: withCanEdit(batch, req) });
    } catch (err) {
      next(err);
    }
  }

  static async createBatch(req, res, next) {
    try {
      const batch = await BatchService.recordProduction(req.body, req.business_id, req.user_id);
      res.status(201).json({ success: true, message: 'Production batch recorded & materials deducted successfully', data: batch });
    } catch (err) {
      next(err);
    }
  }

  static async update(req, res, next) {
    try {
      const batch = await BatchService.updateBatch(
        req.params.id,
        req.body,
        { user_id: req.user_id, access: req.access },
        req.business_id
      );
      res.json({
        success: true,
        message: 'Production batch updated. Stock and costs were adjusted.',
        data: withCanEdit(batch, req),
      });
    } catch (err) {
      next(err);
    }
  }

  static async undo(req, res, next) {
    try {
      const result = await BatchUndoService.undoBatch(
        req.params.id,
        { user_id: req.user_id, access: req.access },
        req.business_id
      );
      res.json({
        success: true,
        message: 'Production batch undone. Ingredients were returned to stock and the finished stock was removed.',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getHistory(req, res, next) {
    try {
      const history = await BatchService.getBatchHistory(req.params.id, req.business_id);
      res.json({ success: true, data: history });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = BatchController;