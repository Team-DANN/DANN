//materialController.js
const MaterialService = require('../services/materialService');

class MaterialController {
  static async getAll(req, res, next) {
    try {
      const materials = await MaterialService.getAllMaterials(req.business_id);
      res.json({ success: true, data: materials });
    } catch (err) {
      next(err);
    }
  }

  static async getById(req, res, next) {
    try {
      const material = await MaterialService.getMaterialById(req.params.id, req.business_id);
      res.json({ success: true, data: material });
    } catch (err) {
      next(err);
    }
  }

  static async create(req, res, next) {
    try {
      const material = await MaterialService.createMaterial(req.body, req.business_id);
      res.status(201).json({ success: true, data: material });
    } catch (err) {
      next(err);
    }
  }

  static async update(req, res, next) {
    try {
      const material = await MaterialService.updateMaterial(req.params.id, req.body, req.business_id);
      res.json({ success: true, data: material });
    } catch (err) {
      next(err);
    }
  }

  static async delete(req, res, next) {
    try {
      const force = req.query.force === 'true';
      const result = await MaterialService.deleteMaterial(req.params.id, req.business_id, { force });
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  static async restock(req, res, next) {
    try {
      const material = await MaterialService.recordRestock(req.params.id, req.body, req.business_id, req.user_id);
      res.json({ success: true, message: 'Stock restocked successfully', data: material });
    } catch (err) {
      next(err);
    }
  }

  static async adjust(req, res, next) {
    try {
      const material = await MaterialService.recordAdjustment(req.params.id, req.body, req.business_id, req.user_id);
      res.json({ success: true, message: 'Stock adjusted successfully', data: material });
    } catch (err) {
      next(err);
    }
  }

  static async getLowStock(req, res, next) {
    try {
      const lowStockMaterials = await MaterialService.getLowStockMaterials(req.business_id);
      res.json({ success: true, count: lowStockMaterials.length, data: lowStockMaterials });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = MaterialController;