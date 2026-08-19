import { NavLink } from 'react-router-dom'
import { navLinks } from './navLinks.js'
import AccountMenuTrigger from './AccountMenuTrigger.jsx'

const sidebarLinks = navLinks.filter((link) => link.to !== '/settings')

export default function Sidebar() {
  return (
    <aside className="hidden md:flex md:w-56 md:flex-col md:border-r md:border-[var(--color-border)] md:bg-[var(--color-paper-light)] md:p-4">
      <div className="mb-6 px-2">
        <span className="font-sans text-lg font-bold text-[var(--color-stamp)]">DANN</span>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {sidebarLinks.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-[var(--color-stamp)] text-[var(--color-paper-light)]'
                  : 'text-[var(--color-ink-muted)] hover:bg-[var(--color-paper)] hover:text-[var(--color-ink)]'
              }`
            }
          >
            <Icon size={18} strokeWidth={2} />
            {label}
          </NavLink>
        ))}
      </nav>

      <AccountMenuTrigger />
    </aside>
  )
}