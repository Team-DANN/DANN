// src/routes/authRoutes.js
const express = require('express');
const AuthController = require('../controllers/authController');
const validate = require('../middleware/validate');
const {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
  deleteAccountSchema,
} = require('../schemas/validationSchemas');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/google', AuthController.google);
router.get('/google/callback', AuthController.googleCallback);
router.get('/verify-email', AuthController.verifyEmail);
router.post('/register', validate(registerSchema), AuthController.register);
router.post('/login', validate(loginSchema), AuthController.login);
router.get('/me', requireAuth, AuthController.me);
router.patch('/me', requireAuth, validate(updateProfileSchema), AuthController.updateProfile);
router.patch(
  '/password',
  requireAuth,
  validate(changePasswordSchema),
  AuthController.changePassword
);
router.delete(
  '/account',
  requireAuth,
  validate(deleteAccountSchema),
  AuthController.deleteAccount
);

module.exports = router;
