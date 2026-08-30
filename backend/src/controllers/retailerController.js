const RetailerService = require('../services/retailerService');

class RetailerController {
  static getAll(req, res, next) {
    try {
      const retailers = RetailerService.getAllRetailers(req.business_id);
      res.json({ success: true, data: retailers });
    } catch (err) {
      next(err);
    }
  }

  static getById(req, res, next) {
    try {
      const retailer = RetailerService.getRetailerById(req.params.id, req.business_id);
      res.json({ success: true, data: retailer });
    } catch (err) {
      next(err);
    }
  }

  static create(req, res, next) {
    try {
      const retailer = RetailerService.createRetailer(req.body, req.business_id);
      res.status(201).json({ success: true, message: 'Retailer created successfully', data: retailer });
    } catch (err) {
      next(err);
    }
  }

  static update(req, res, next) {
    try {
      const retailer = RetailerService.updateRetailer(req.params.id, req.body, req.business_id);
      res.json({ success: true, message: 'Retailer updated successfully', data: retailer });
    } catch (err) {
      next(err);
    }
  }

  static delete(req, res, next) {
    try {
      const result = RetailerService.deleteRetailer(req.params.id, req.business_id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = RetailerController;
