import { useMemo } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { navLinks } from './navLinks.js'

// The nav links this person may see. One hook shared by the sidebar, the
// mobile drawer, the bottom bar and search, so they always agree.
export function useVisibleNavLinks() {
  const { access } = useAuth()

  return useMemo(
    () =>
      navLinks.filter((link) => {
        if (link.adminOnly) return access.canManageStaff
        if (link.module) return access.hasAny(link.module)
        return true
      }),
    [access]
  )
}