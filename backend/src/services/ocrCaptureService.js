const OcrCaptureModel = require('../models/OcrCaptureModel');

class OcrCaptureService {
  static async createCapture(captureData, businessId, loggedBy) {
    const { category, raw_text, confirmed_text } = captureData;
    const capture_id = `ocr_${Date.now()}`;
    return OcrCaptureModel.create({
      capture_id,
      business_id: businessId,
      category,
      raw_text,
      confirmed_text,
      logged_by: loggedBy,
    });
  }

  static async getAllCaptures(businessId) {
    return OcrCaptureModel.getAll(businessId);
  }
}

module.exports = OcrCaptureService;