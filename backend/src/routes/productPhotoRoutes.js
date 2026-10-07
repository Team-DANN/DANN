//routes/productPhotoRoutes.js
const express = require('express');
const ProductPhotoController = require('../controllers/productPhotoController');
const { requireModule } = require('../middleware/access');

const router = express.Router();

// index.js applies requireAuth to this router. Product photos appear
// wherever products do, so the same modules as reading products.
router.get('/', requireModule('production', 'orders', 'inventory'), ProductPhotoController.search);

module.exports = router;