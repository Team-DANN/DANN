const env = require('../config/env');

function authMiddleware(req, res, next) {
  // Scopes tenant business_id from headers/query or defaults to biz_default
  req.business_id = req.headers['x-business-id'] || req.query.business_id || env.DEFAULT_BUSINESS_ID;
  req.user_id = req.headers['x-user-id'] || req.query.user_id || 'user_default';
  next();
}

module.exports = authMiddleware;
