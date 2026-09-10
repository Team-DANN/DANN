//alertRoutes.js
const express = require('express');
const AlertController = require('../controllers/alertController');

const router = express.Router();

router.get('/', AlertController.getAll);
router.get('/unread-count', AlertController.getUnreadCount);
router.patch('/:id/read', AlertController.markAsRead);

module.exports = router;
