const express = require('express');
const AuthController = require('../controllers/authController');
const validate = require('../middleware/validate');
const { registerSchema, loginSchema } = require('../schemas/validationSchemas');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', validate(registerSchema), AuthController.register);
router.post('/login', validate(loginSchema), AuthController.login);
router.get('/me', requireAuth, AuthController.me);

module.exports = router;
