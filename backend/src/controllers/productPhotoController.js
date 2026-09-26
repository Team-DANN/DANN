//product photo controller
const ProductPhotoService = require('../services/productPhotoService');

class ProductPhotoController {
  static async search(req, res, next) {
    try {
      const imageUrl = await ProductPhotoService.searchPhoto(req.query.query);
      res.json({ success: true, data: { imageUrl } });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = ProductPhotoController;