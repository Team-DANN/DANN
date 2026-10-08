const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const AuthService = require('./authService');
const AlertService = require('./alertService');
const StaffModel = require('../models/StaffModel');
const { MODULES } = require('../middleware/access');

const SALT_ROUNDS = 10;
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;
const STAFF_ROLES = ['manager', 'staff'];
const USERNAME_PATTERN = /^[a-z0-9._-]{3,30}$/;

const MODULE_LABELS = {
  production: 'Production',
  orders: 'Orders',
  inventory: 'Inventory',
  finance: 'Finance',
};

// Compared against when the account doesn't exist, so a wrong username
// and a wrong PIN take the same time to reject.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-pin', SALT_ROUNDS);

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

// The label is derived from modules and never stored, so naming never
// needs a migration.
function roleLabel(role, modules) {
  if (role === 'owner') return 'Owner';
  if (role === 'manager') return 'Manager';
  const names = (modules || []).map((m) => MODULE_LABELS[m]).filter(Boolean);
  return names.length > 0 ? names.join(' + ') : 'No access';
}

function toPublicStaff(row) {
  return {
    id: row.user_id,
    user_id: row.user_id,
    name: row.name,
    username: row.username,
    phone: row.phone,
    role: row.role,
    modules: row.modules,
    label: roleLabel(row.role, row.modules),
    status: row.status,
    // True once they have signed in at least once. Until then the owner
    // can still reset their PIN; afterwards the PIN is theirs.
    has_signed_in: Boolean(row.first_login_at),
    first_login_at: row.first_login_at,
    created_at: row.created_at,
    terminated_at: row.terminated_at,
  };
}

function isWeakPin(pin) {
  if (/^(\d)\1+$/.test(pin)) return true; // 000000, 111111, ...
  return '0123456789'.includes(pin) || '9876543210'.includes(pin); // 123456, 654321, ...
}

function generatePin() {
  let pin;
  do {
    pin = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  } while (isWeakPin(pin));
  return pin;
}

function cleanModules(modules) {
  if (!Array.isArray(modules)) throw httpError(400, 'Choose at least one module');
  const unique = [...new Set(modules)];
  if (unique.length === 0 || unique.some((m) => !MODULES.includes(m))) {
    throw httpError(400, 'Choose at least one valid module');
  }
  return unique;
}

function assertCanManage(actor, target) {
  if (!actor.access.canManageStaff) throw httpError(403, 'Only the owner or a manager can do this');
  // 404 for the owner too, so this endpoint never confirms who the owner is.
  if (!target || target.role === 'owner') throw httpError(404, 'Staff member not found');
  if (target.user_id === actor.user_id) throw httpError(400, 'You cannot do this to your own account');
  if (target.role === 'manager' && !actor.access.isOwner) {
    throw httpError(403, 'Only the owner can change a manager');
  }
}

function sessionUser(row) {
  return {
    user_id: row.user_id,
    business_id: row.business_id,
    name: row.name,
    username: row.username,
    email: null,
    phone: row.phone,
    role: row.role,
    modules: row.modules,
    label: roleLabel(row.role, row.modules),
    business_name: row.business_name,
    business_code: row.business_code,
    currency: row.currency,
    plan_tier: row.plan_tier,
  };
}

class StaffService {
  // actor = { user_id, business_id, access }, built from req in the controller.

  static async listStaff(actor) {
    if (!actor.access.canManageStaff) throw httpError(403, 'Only the owner or a manager can do this');
    const rows = await StaffModel.listByBusiness(actor.business_id);
    return rows.map(toPublicStaff);
  }

  // Returns the generated PIN ONCE. It is stored only as a hash, so
  // nobody, including the owner, can read it again afterwards.
  static async createStaff(actor, payload) {
    if (!actor.access.canManageStaff) throw httpError(403, 'Only the owner or a manager can do this');

    const role = payload.role || 'staff';
    if (!STAFF_ROLES.includes(role)) throw httpError(400, 'Invalid role');
    if (role === 'manager' && !actor.access.isOwner) {
      throw httpError(403, 'Only the owner can add a manager');
    }

    const name = String(payload.name || '').trim();
    if (!name) throw httpError(400, 'Name is required');

    const username = String(payload.username || '').trim().toLowerCase();
    if (!USERNAME_PATTERN.test(username)) {
      throw httpError(400, 'Username must be 3-30 characters: letters, numbers, dot, dash or underscore');
    }

    const modules = role === 'staff' ? cleanModules(payload.modules) : null;
    const pin = generatePin();
    const pin_hash = await bcrypt.hash(pin, SALT_ROUNDS);
    const user_id = `user_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

    try {
      await StaffModel.create({
        user_id,
        business_id: actor.business_id,
        name,
        username,
        phone: payload.phone || null,
        role,
        modules,
        pin_hash,
        created_by: actor.user_id,
      });
    } catch (err) {
      if (err.code === '23505') throw httpError(409, 'That username is already taken in your business');
      throw err;
    }

    const row = await StaffModel.findInBusiness(user_id, actor.business_id);
    const business_code = await StaffModel.getBusinessCode(actor.business_id);
    return { staff: toPublicStaff(row), pin, business_code };
  }

  static async updateStaff(actor, staffId, patch) {
    const target = await StaffModel.findInBusiness(staffId, actor.business_id);
    assertCanManage(actor, target);
    if (target.status !== 'active') throw httpError(409, 'This account has been removed');

    const fields = {};

    if (patch.name !== undefined) {
      const name = String(patch.name).trim();
      if (!name) throw httpError(400, 'Name cannot be empty');
      fields.name = name;
    }
    if (patch.phone !== undefined) fields.phone = patch.phone || null;

    let nextRole = target.role;
    if (patch.role !== undefined && patch.role !== target.role) {
      if (!actor.access.isOwner) throw httpError(403, 'Only the owner can promote or demote a manager');
      if (!STAFF_ROLES.includes(patch.role)) throw httpError(400, 'Invalid role');
      nextRole = patch.role;
      fields.role = patch.role;
    }

    if (nextRole === 'manager') {
      if (fields.role === 'manager') fields.modules = null; // all modules
    } else if (patch.modules !== undefined || fields.role === 'staff') {
      // Demoting a manager to staff must say which modules they keep.
      fields.modules = cleanModules(patch.modules);
    }

    const updated = await StaffModel.update(staffId, actor.business_id, fields);
    return toPublicStaff(updated);
  }

  // The owner or a manager can generate a fresh PIN ONLY while the person
  // has never signed in (for example the first PIN was lost before it was
  // handed over). Once they have signed in, the PIN is their own, whether
  // they kept the one they were given or changed it, and nobody else can
  // reset it. If they forget it, their access is removed and they are added
  // again; the same username is free to reuse.
  static async resetPin(actor, staffId) {
    const target = await StaffModel.findInBusiness(staffId, actor.business_id);
    assertCanManage(actor, target);
    if (target.status !== 'active') throw httpError(409, 'This account has been removed');
    if (target.first_login_at) {
      throw httpError(
        409,
        'This person has already signed in, so their PIN is their own now. If they have forgotten it, remove their access and add them again.'
      );
    }

    const pin = generatePin();
    await StaffModel.updatePinHash(staffId, await bcrypt.hash(pin, SALT_ROUNDS));
    return { pin };
  }

  // OWNER OR MANAGER. A manager can remove staff but never another manager
  // or the owner (assertCanManage refuses both). Blocks login and, via
  // authMiddleware, every request they make next. Everything they logged
  // stays in the business, and their username becomes free to reuse.
  static async terminate(actor, staffId) {
    const target = await StaffModel.findInBusiness(staffId, actor.business_id);
    assertCanManage(actor, target);
    if (target.status !== 'active') throw httpError(409, 'This account has already been removed');

    const updated = await StaffModel.terminate(staffId, actor.business_id, actor.user_id);
    return toPublicStaff(updated);
  }

  // `context` = { ip, userAgent }, passed in by the controller. It is only
  // used to describe the sign-in in the alert for the owner and managers.
  static async staffLogin({ business_code, username, pin }, context = {}) {
    const invalid = httpError(401, 'Invalid business code, username or PIN');
    const row = await StaffModel.findForStaffLogin(String(business_code || ''), String(username || ''));

    if (!row || row.deleted_at) {
      await bcrypt.compare(String(pin || ''), DUMMY_HASH);
      throw invalid;
    }

    if (row.locked_until && new Date(row.locked_until) > new Date()) {
      const mins = Math.ceil((new Date(row.locked_until).getTime() - Date.now()) / 60000);
      throw httpError(429, `Too many attempts. Try again in ${mins} minute${mins === 1 ? '' : 's'}.`);
    }

    const matches = row.password_hash && (await bcrypt.compare(String(pin || ''), row.password_hash));
    if (!matches) {
      await StaffModel.recordFailedAttempt(row.user_id, MAX_FAILED_ATTEMPTS, LOCK_MINUTES);
      throw invalid;
    }

    // Only said AFTER the PIN is correct, so it can't be used to probe
    // which usernames exist.
    if (row.status !== 'active') {
      throw httpError(403, 'Your access has been removed. Please contact your business owner.');
    }

    // Read BEFORE recordSuccessfulLogin stamps first_login_at, so the alert
    // can say whether this is their first sign-in.
    const before = await StaffModel.findInBusiness(row.user_id, row.business_id);
    const isFirstSignIn = !before?.first_login_at;

    // Clears any lockout and stamps the first sign-in (see resetPin).
    await StaffModel.recordSuccessfulLogin(row.user_id);
    const token = AuthService.signToken(row.user_id, row.business_id);

    // Not awaited and never throws into the login: the owner and managers
    // get an alert, but a problem here must not stop anyone signing in.
    AlertService.notifyStaffSignIn({
      business_id: row.business_id,
      user_id: row.user_id,
      name: row.name,
      label: roleLabel(row.role, row.modules),
      isFirstSignIn,
      context,
    }).catch((err) => console.error('[Alerts] Could not record sign-in alert:', err.message));

    return { token, user: sessionUser(row) };
  }

  // Staff change their own PIN; nobody else is involved. 403 for a
  // wrong current PIN, because 401 would sign them out.
  static async changePin(userId, { current_pin, new_pin }) {
    const row = await StaffModel.findByIdWithHash(userId);
    if (!row) throw httpError(404, 'User not found');
    if (row.role === 'owner') throw httpError(403, 'Owners change their password in Settings');

    if (row.locked_until && new Date(row.locked_until) > new Date()) {
      throw httpError(429, 'Too many attempts. Please try again later.');
    }

    const matches = row.password_hash && (await bcrypt.compare(String(current_pin || ''), row.password_hash));
    if (!matches) {
      await StaffModel.recordFailedAttempt(userId, MAX_FAILED_ATTEMPTS, LOCK_MINUTES);
      throw httpError(403, 'Current PIN is incorrect');
    }

    if (!/^\d{6}$/.test(String(new_pin || ''))) throw httpError(400, 'PIN must be exactly 6 digits');
    if (isWeakPin(new_pin)) throw httpError(400, 'Choose a PIN that is not repeated or in sequence');
    if (new_pin === current_pin) throw httpError(400, 'New PIN must be different from the current one');

    await StaffModel.updatePinHash(userId, await bcrypt.hash(new_pin, SALT_ROUNDS));
  }
}

module.exports = StaffService;