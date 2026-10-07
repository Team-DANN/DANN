import { NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { useVisibleNavLinks } from './useVisibleNavLinks.js'

// Mobile-only bottom tab bar. Owners and managers get the highest-frequency
// destinations (the links marked `primary`); everything else is in the
// drawer. Staff get ALL of the links their modules allow, since they only
// have a few and there is no reason to hide any of them.
export default function BottomNav() {
  const { access } = useAuth()
  const visible = useVisibleNavLinks()
  const links = access.fullAccess ? visible.filter((link) => link.primary) : visible

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-[var(--color-border)] bg-[var(--color-paper-light)] md:hidden">
      {links.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center gap-1 py-2 text-xs font-medium ${
              isActive ? 'text-[var(--color-stamp)]' : 'text-[var(--color-ink-muted)]'
            }`
          }
        >
          <Icon size={22} strokeWidth={2} />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}