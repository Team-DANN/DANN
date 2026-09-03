//authMiddleware.js
const jwt = require('jsonwebtoken');
const env = require('../config/env');

function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET);
      req.user = decoded;
      req.business_id = decoded.business_id;
      req.user_id = decoded.user_id;
      return next();
    } catch (err) {
      const error = new Error('Invalid or expired token');
      error.status = 401;
      return next(error);
    }
  }

  // Fallback to headers, query param, or default business scope
  req.business_id = req.headers['x-business-id'] || req.query.business_id || env.DEFAULT_BUSINESS_ID;
  req.user_id = req.headers['x-user-id'] || req.query.user_id || 'user_default';
  next();
}

function requireAuth(req, res, next) {
  if (!req.user && !req.headers['authorization']) {
    const error = new Error('Authentication token required');
    error.status = 401;
    return next(error);
  }
  next();
}

module.exports = {
  authMiddleware,
  requireAuth,
};
