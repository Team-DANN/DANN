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
const { requireOwner } = require('../middleware/access');

const router = express.Router();

// Staff and managers sign in with business code + username + PIN. If they
// could set an email here they would gain a second, unguarded way in.
function blockNonOwnerEmailChange(req, res, next) {
  if (req.access && !req.access.isOwner && req.body && req.body.email !== undefined) {
    const error = new Error('Only the account owner can change the account email');
    error.status = 403;
    return next(error);
  }
  next();
}

router.get('/google', AuthController.google);
router.get('/google/callback', AuthController.googleCallback);
router.post('/register', validate(registerSchema), AuthController.register);
router.post('/login', validate(loginSchema), AuthController.login);
router.get('/me', requireAuth, AuthController.me);
router.patch(
  '/me',
  requireAuth,
  blockNonOwnerEmailChange,
  validate(updateProfileSchema),
  AuthController.updateProfile
);
// Owner-only: staff use PINs, and a password change here would lock them
// out of staff login.
router.patch(
  '/password',
  requireAuth,
  requireOwner,
  validate(changePasswordSchema),
  AuthController.changePassword
);
// Owner-only: otherwise any staff member who knew the business name could
// delete the whole account.
router.delete(
  '/account',
  requireAuth,
  requireOwner,
  validate(deleteAccountSchema),
  AuthController.deleteAccount
);

module.exports = router;