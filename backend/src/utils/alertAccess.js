// Which alert types each module may see. Anything not listed here is
// hidden from staff by default, so a new alert type added later can never
// leak to the wrong module until it is mapped on purpose.
const ALERT_TYPE_MODULES = {
  low_stock: ['inventory', 'production'],
  runway_low: ['inventory', 'production'],
  payment_overdue: ['orders', 'finance'],
};

// Returns null for "no filter" (owner and manager see every alert, including
// types added later), or the list of alert types this user may see.
function allowedAlertTypes(access) {
  if (access.fullAccess) return null;
  return Object.entries(ALERT_TYPE_MODULES)
    .filter(([, modules]) => access.hasAny(...modules))
    .map(([type]) => type);
}

module.exports = { allowedAlertTypes, ALERT_TYPE_MODULES };