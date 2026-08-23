const ProductService = require('../services/productService');

class ProductController {
  static getAll(req, res, next) {
    try {
      const products = ProductService.getAllProducts(req.business_id);
      res.json({ success: true, data: products });
    } catch (err) {
      next(err);
    }
  }

  static getById(req, res, next) {
    try {
      const product = ProductService.getProductById(req.params.id, req.business_id);
      res.json({ success: true, data: product });
    } catch (err) {
      next(err);
    }
  }

  static create(req, res, next) {
    try {
      const product = ProductService.createProduct(req.body, req.business_id);
      res.status(201).json({ success: true, data: product });
    } catch (err) {
      next(err);
    }
  }

  static updateRecipe(req, res, next) {
    try {
      const recipe = req.body.recipe || req.body;
      const product = ProductService.updateRecipe(req.params.id, recipe, req.business_id);
      res.json({ success: true, message: 'Recipe updated successfully', data: product });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = ProductController;
