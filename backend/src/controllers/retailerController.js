//retailerController
const RetailerService = require('../services/retailerService');

class RetailerController {
  static async getAll(req, res, next) {
    try {
      const retailers = await RetailerService.getAllRetailers(req.business_id);
      res.json({ success: true, data: retailers });
    } catch (err) {
      next(err);
    }
  }

  static async getById(req, res, next) {
    try {
      const retailer = await RetailerService.getRetailerById(req.params.id, req.business_id);
      res.json({ success: true, data: retailer });
    } catch (err) {
      next(err);
    }
  }

  static async create(req, res, next) {
    try {
      const retailer = await RetailerService.createRetailer(req.body, req.business_id);
      res.status(201).json({ success: true, message: 'Retailer created successfully', data: retailer });
    } catch (err) {
      next(err);
    }
  }

  static async update(req, res, next) {
    try {
      const retailer = await RetailerService.updateRetailer(req.params.id, req.body, req.business_id);
      res.json({ success: true, message: 'Retailer updated successfully', data: retailer });
    } catch (err) {
      next(err);
    }
  }

  static async delete(req, res, next) {
    try {
      const result = await RetailerService.deleteRetailer(req.params.id, req.business_id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = RetailerController;