//productController.js
const ProductService = require('../services/productService');

class ProductController {
  static async getAll(req, res, next) {
    try {
      const products = await ProductService.getAllProducts(req.business_id);
      res.json({ success: true, data: products });
    } catch (err) {
      next(err);
    }
  }

  static async getById(req, res, next) {
    try {
      const product = await ProductService.getProductById(req.params.id, req.business_id);
      res.json({ success: true, data: product });
    } catch (err) {
      next(err);
    }
  }

  static async create(req, res, next) {
    try {
      const product = await ProductService.createProduct(req.body, req.business_id);
      res.status(201).json({ success: true, data: product });
    } catch (err) {
      next(err);
    }
  }

  static async updateRecipe(req, res, next) {
    try {
      const recipe = req.body.recipe || req.body;
      const product = await ProductService.updateRecipe(req.params.id, recipe, req.business_id);
      res.json({ success: true, message: 'Recipe updated successfully', data: product });
    } catch (err) {
      next(err);
    }
  }

  static async delete(req, res, next) {
    try {
      const result = await ProductService.deleteProduct(req.params.id, req.business_id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = ProductController;