const { query } = require('../db/database');

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

// Inventory staff, owners and managers may remove any material, exactly
// as before. Production-only staff may remove a material only if they
// created it themselves AND nothing uses it yet. That is what the
// photo-import "decline" needs to roll back, and nothing more.
async function canDeleteMaterial(req, res, next) {
  try {
    if (!req.access) return next(httpError(401, 'Authentication token required'));
    if (req.access.hasAny('inventory')) return next();
    if (!req.access.hasAny('production')) {
      return next(httpError(403, 'You do not have access to this section'));
    }
    if (req.query.force) {
      return next(httpError(403, 'Only inventory staff can force-remove a material'));
    }

    const { rows } = await query(
      `SELECT
        m.created_by,
        EXISTS (SELECT 1 FROM recipe r WHERE r.material_id = m.material_id) AS in_recipe,
        EXISTS (SELECT 1 FROM batch_material_usage b WHERE b.material_id = m.material_id) AS has_usage
       FROM material m
       WHERE m.material_id = $1 AND m.business_id = $2`,
      [req.params.id, req.business_id]
    );
    const row = rows[0];

    if (!row) return next(httpError(404, `Material with ID '${req.params.id}' not found`));
    if (row.created_by !== req.user_id) {
      return next(httpError(403, 'You can only remove materials you created yourself'));
    }
    if (row.in_recipe || row.has_usage) {
      return next(httpError(403, 'This material is already in use, so only inventory staff can remove it'));
    }
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { canDeleteMaterial };