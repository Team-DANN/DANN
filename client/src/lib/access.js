// What a signed-in user may see in the browser. The backend enforces the
// same rules on every request (src/middleware/access.js); this only decides
// which pages and links to show.

export const ALL_MODULES = ['production', 'orders', 'inventory', 'finance']

// Where each module's people land first, in priority order.
const MODULE_HOME = [
  ['production', '/production'],
  ['inventory', '/inventory'],
  ['orders', '/orders'],
  ['finance', '/finance'],
]

// `user` is the object from /api/auth/me: { role, modules, ... }.
export function buildAccess(user) {
  const role = user?.role ?? null
  const fullAccess = role === 'owner' || role === 'manager'
  const modules = fullAccess
    ? ALL_MODULES
    : (Array.isArray(user?.modules) ? user.modules.filter((m) => ALL_MODULES.includes(m)) : [])

  return {
    role,
    fullAccess,
    isOwner: role === 'owner',
    canManageStaff: fullAccess,
    modules,
    // True if the user holds ANY of the given modules.
    hasAny: (...wanted) => fullAccess || wanted.some((m) => modules.includes(m)),
    // Owners and managers start on Home. Staff start on their first module.
    // A user with no module at all falls back to Alerts, which is open to
    // everyone signed in, so a redirect can never loop.
    firstAllowedPath: fullAccess
      ? '/'
      : (MODULE_HOME.find(([m]) => modules.includes(m))?.[1] ?? '/alerts'),
  }
}