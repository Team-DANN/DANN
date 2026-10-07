import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'

// Wraps a route's page and sends people without access to the first page
// they ARE allowed to open.
//
//   <RouteGuard modules={['production']}>   any ONE of these modules is enough
//   <RouteGuard adminOnly>                  owner and manager only
//
// If both are given, adminOnly wins. Owner and manager hold every module, so
// they always pass.
//
// This only decides what the browser shows. The backend enforces the same
// rules on every request.
//
// It cannot redirect in a loop: access.firstAllowedPath is '/' for owner and
// manager (who always pass), a module page the person holds, or '/alerts'
// (open to everyone signed in) for staff with no modules.
//
// AppShell has already waited for the user to load before any guarded page
// renders, so `access` is final by the time this runs.
export default function RouteGuard({ modules, adminOnly = false, children }) {
  const { access } = useAuth()

  let allowed = true
  if (adminOnly) {
    allowed = access.canManageStaff
  } else if (Array.isArray(modules) && modules.length > 0) {
    allowed = access.hasAny(...modules)
  }

  if (!allowed) {
    return <Navigate to={access.firstAllowedPath} replace />
  }

  return children
}