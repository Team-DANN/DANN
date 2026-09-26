//routes/productPhotoRoutes.js
const express = require('express');
const ProductPhotoController = require('../controllers/productPhotoController');

const router = express.Router();

// authMiddleware already runs globally on every request (app.use(authMiddleware)
// in index.js, before any route is mounted) — no per-route auth needed here,
// same as materialRoutes/productRoutes/etc.
router.get('/', ProductPhotoController.search);

module.exports = router;