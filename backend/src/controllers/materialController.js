const MaterialService = require('../services/materialService');

class MaterialController {
  static getAll(req, res, next) {
    try {
      const materials = MaterialService.getAllMaterials(req.business_id);
      res.json({ success: true, data: materials });
    } catch (err) {
      next(err);
    }
  }

  static getById(req, res, next) {
    try {
      const material = MaterialService.getMaterialById(req.params.id, req.business_id);
      res.json({ success: true, data: material });
    } catch (err) {
      next(err);
    }
  }

  static create(req, res, next) {
    try {
      const material = MaterialService.createMaterial(req.body, req.business_id);
      res.status(201).json({ success: true, data: material });
    } catch (err) {
      next(err);
    }
  }

  static update(req, res, next) {
    try {
      const material = MaterialService.updateMaterial(req.params.id, req.body, req.business_id);
      res.json({ success: true, data: material });
    } catch (err) {
      next(err);
    }
  }

  static delete(req, res, next) {
    try {
      const result = MaterialService.deleteMaterial(req.params.id, req.business_id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  static restock(req, res, next) {
    try {
      const material = MaterialService.recordRestock(req.params.id, req.body, req.business_id, req.user_id);
      res.json({ success: true, message: 'Stock restocked successfully', data: material });
    } catch (err) {
      next(err);
    }
  }

  static adjust(req, res, next) {
    try {
      const material = MaterialService.recordAdjustment(req.params.id, req.body, req.business_id, req.user_id);
      res.json({ success: true, message: 'Stock adjusted successfully', data: material });
    } catch (err) {
      next(err);
    }
  }

  static getLowStock(req, res, next) {
    try {
      const lowStockMaterials = MaterialService.getLowStockMaterials(req.business_id);
      res.json({ success: true, count: lowStockMaterials.length, data: lowStockMaterials });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = MaterialController;
