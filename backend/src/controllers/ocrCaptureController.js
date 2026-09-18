const OcrCaptureService = require('../services/ocrCaptureService');

class OcrCaptureController {
  static async create(req, res, next) {
    try {
      const capture = await OcrCaptureService.createCapture(req.body, req.business_id, req.user_id);
      res.status(201).json({ success: true, data: capture });
    } catch (err) {
      next(err);
    }
  }

  static async getAll(req, res, next) {
    try {
      const captures = await OcrCaptureService.getAllCaptures(req.business_id);
      res.json({ success: true, data: captures });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = OcrCaptureController;