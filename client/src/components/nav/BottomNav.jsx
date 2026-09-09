import { NavLink } from 'react-router-dom'
import { navLinks } from './navLinks.js'

const primaryLinks = navLinks.filter((link) => link.primary)

// Mobile-only bottom tab bar — the 4 highest-frequency destinations:
// Home, Production, Orders, Profit. Inventory, Insights, and Settings
// live behind the hamburger drawer instead.
export default function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-[var(--color-border)] bg-[var(--color-paper-light)] md:hidden">
      {primaryLinks.map(({ to, label, icon: Icon }) => (
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