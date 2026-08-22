import { NavLink } from 'react-router-dom'
import { navLinks } from './navLinks.js'
import AccountMenuTrigger from '../layout/AccountMenuTrigger.jsx'
import logo from '../../assets/logo/DANN-logo-charcoal.webp'

const sidebarLinks = navLinks.filter((link) => link.to !== '/settings')

export default function Sidebar() {
  return (
    <aside
      className="
        hidden
        md:sticky md:top-0 md:flex
        md:h-screen md:w-56
        md:flex-shrink-0 md:self-start
        md:flex-col
        md:border-r md:border-[var(--color-border)]
        md:bg-[var(--color-paper-light)]
        md:p-4
      "
    >
      <div className="mb-6 px-2">
        <img
          src={logo}
          alt="DANN"
          className="h-8 w-auto object-contain"
        />
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex flex-col gap-1">
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
        </div>
      </nav>

      <AccountMenuTrigger />
    </aside>
  )
}