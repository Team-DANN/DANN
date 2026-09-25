const MigrationService = require('../services/migrationService');

class MigrationController {
  static async analyze(req, res, next) {
    try {
      const migration = await MigrationService.analyze(req.body, req.business_id, req.user_id);
      res.status(201).json({ success: true, data: migration });
    } catch (error) {
      next(error);
    }
  }

  static async commit(req, res, next) {
    try {
      const migration = await MigrationService.commit(
        req.params.id,
        req.business_id,
        req.body.confirm_attention
      );
      res.json({ success: true, data: migration });
    } catch (error) {
      next(error);
    }
  }

  static async getHistory(req, res, next) {
    try {
      const migrations = await MigrationService.getHistory(req.business_id);
      res.json({ success: true, data: migrations });
    } catch (error) {
      next(error);
    }
  }

  static async rollback(req, res, next) {
    try {
      const migration = await MigrationService.rollback(req.params.id, req.business_id);
      res.json({ success: true, data: migration });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = MigrationController;
