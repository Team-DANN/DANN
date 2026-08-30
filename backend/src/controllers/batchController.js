const BatchService = require('../services/batchService');

class BatchController {
  static getAll(req, res, next) {
    try {
      const batches = BatchService.getBatches(req.business_id);
      res.json({ success: true, data: batches });
    } catch (err) {
      next(err);
    }
  }

  static getById(req, res, next) {
    try {
      const batch = BatchService.getBatchById(req.params.id, req.business_id);
      res.json({ success: true, data: batch });
    } catch (err) {
      next(err);
    }
  }

  static createBatch(req, res, next) {
    try {
      const batch = BatchService.recordProduction(req.body, req.business_id, req.user_id);
      res.status(201).json({ success: true, message: 'Production batch recorded & materials deducted successfully', data: batch });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = BatchController;
