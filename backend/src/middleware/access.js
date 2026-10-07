const MODULES = ['production', 'orders', 'inventory', 'finance'];

// Owner and manager see every module. Staff see only their own list.
const FULL_ACCESS_ROLES = ['owner', 'manager'];

function buildAccess(role, modules) {
  const fullAccess = FULL_ACCESS_ROLES.includes(role);
  const list = fullAccess
    ? [...MODULES]
    : (Array.isArray(modules) ? modules.filter((m) => MODULES.includes(m)) : []);

  return {
    role,
    fullAccess,
    isOwner: role === 'owner',
    canManageStaff: fullAccess,
    modules: list,
    // True if the user holds ANY of the given modules.
    hasAny(...wanted) {
      return fullAccess || wanted.some((m) => list.includes(m));
    },
  };
}

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

// Used after requireAuth, so req.access normally exists. If it somehow
// doesn't, the request is treated as unauthenticated (401). 403 always
// means "valid session, not allowed".
function requireOwner(req, res, next) {
  if (!req.access) return next(httpError(401, 'Authentication token required'));
  if (!req.access.isOwner) return next(httpError(403, 'Only the account owner can do this'));
  next();
}

function requireStaffAdmin(req, res, next) {
  if (!req.access) return next(httpError(401, 'Authentication token required'));
  if (!req.access.canManageStaff) return next(httpError(403, 'Only the owner or a manager can do this'));
  next();
}

// Passes if the user holds ANY of the listed modules.
function requireModule(...modules) {
  return (req, res, next) => {
    if (!req.access) return next(httpError(401, 'Authentication token required'));
    if (!req.access.hasAny(...modules)) {
      return next(httpError(403, 'You do not have access to this section'));
    }
    next();
  };
}

// For endpoints where the module is named in the request body, such as an
// OCR capture's `category`. Run it AFTER validate() so the value is clean.
function requireModuleFromBody(field) {
  return (req, res, next) => {
    if (!req.access) return next(httpError(401, 'Authentication token required'));
    const wanted = req.body && req.body[field];
    if (!MODULES.includes(wanted)) {
      return next(httpError(400, `${field} must be one of: ${MODULES.join(', ')}`));
    }
    if (!req.access.hasAny(wanted)) {
      return next(httpError(403, 'You do not have access to this section'));
    }
    next();
  };
}

// Records who created a row. Place it AFTER validate(): zod strips unknown
// keys first, so a client can never supply its own created_by.
function stampCreatedBy(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body.created_by = req.user_id;
  }
  next();
}

module.exports = {
  MODULES,
  buildAccess,
  requireOwner,
  requireStaffAdmin,
  requireModule,
  requireModuleFromBody,
  stampCreatedBy,
};