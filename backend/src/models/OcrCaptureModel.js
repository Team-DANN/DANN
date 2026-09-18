const { query } = require('../db/database');

class OcrCaptureModel {
  static async create(data) {
    const { capture_id, business_id, category, raw_text, confirmed_text, logged_by } = data;
    const { rows } = await query(
      `INSERT INTO ocr_capture (capture_id, business_id, category, raw_text, confirmed_text, logged_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [capture_id, business_id, category, raw_text || null, confirmed_text, logged_by || null]
    );
    return rows[0];
  }

  static async getAll(businessId) {
    const { rows } = await query(
      `SELECT * FROM ocr_capture WHERE business_id = $1 ORDER BY created_at DESC`,
      [businessId]
    );
    return rows;
  }
}

module.exports = OcrCaptureModel;