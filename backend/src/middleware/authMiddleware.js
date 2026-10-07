const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { query } = require('../db/database');
const { buildAccess } = require('./access');

function unauthorized(message) {
  const error = new Error(message);
  error.status = 401;
  return error;
}

async function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];

  // No credentials at all: leave the request anonymous. requireAuth
  // decides whether anonymous is allowed. business_id and user_id are
  // never taken from headers or query params.
  if (!authHeader) return next();

  // Anything that isn't a Bearer token is rejected outright.
  if (!authHeader.startsWith('Bearer ')) {
    return next(unauthorized('Invalid or expired token'));
  }

  let decoded;
  try {
    decoded = jwt.verify(authHeader.substring(7), env.JWT_SECRET, {
      algorithms: ['HS256'],
    });
    // Email-confirmation and Google-onboarding tokens share the secret
    // and carry a `purpose` claim. They must not work as access tokens.
    if (decoded.purpose || !decoded.user_id || !decoded.business_id) {
      throw new Error('Not an access token');
    }
  } catch (err) {
    return next(unauthorized('Invalid or expired token'));
  }

  try {
    // The token only proves who the user is. What they may do is read
    // fresh from the database on every request, so removing a staff
    // member or changing their modules takes effect immediately.
    const { rows } = await query(
      `SELECT u.role, u.status, u.modules, b.deleted_at
       FROM "user" u
       JOIN business b ON b.business_id = u.business_id
       WHERE u.user_id = $1 AND u.business_id = $2`,
      [decoded.user_id, decoded.business_id]
    );
    const row = rows[0];

    // 401 (not 403) on purpose: the session itself is no longer valid,
    // so apiClient.js should sign this browser out.
    if (!row || row.status !== 'active' || row.deleted_at) {
      return next(unauthorized('Session is no longer valid'));
    }

    req.user = decoded;
    req.business_id = decoded.business_id;
    req.user_id = decoded.user_id;
    req.access = buildAccess(row.role, row.modules);
    return next();
  } catch (err) {
    return next(err);
  }
}

function requireAuth(req, res, next) {
  if (!req.user) return next(unauthorized('Authentication token required'));
  next();
}

module.exports = {
  authMiddleware,
  requireAuth,
};