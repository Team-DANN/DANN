import { NavLink } from 'react-router-dom'
import { navLinks } from './navLinks.js'
import AccountMenuTrigger from '../layout/AccountMenuTrigger.jsx'
import { useTheme } from '../../context/ThemeContext.jsx'
import logoCharcoal from '../../assets/logo/DANN-logo-charcoal.webp'
import logoTerracotta from '../../assets/logo/DANN-logo-terracotta.webp'

const sidebarLinks = navLinks.filter((link) => link.to !== '/settings')

export default function Sidebar() {
  const { theme } = useTheme()
  const logo = theme === 'dark' ? logoTerracotta : logoCharcoal

  return (
    <aside
      className="
        hidden
        md:sticky md:top-0 md:flex
        md:h-screen md:w-56
        md:flex-shrink-0 md:self-start
        md:flex-col
        md:bg-[var(--color-paper-light)]
        md:p-4
        lg:w-64
      "
    >
      <div className="mb-6 px-2">
        <img
          src={logo}
          alt="DANN"
          className="h-9 w-auto object-contain lg:h-12 xl:h-14"
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
                `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors lg:gap-4 lg:px-4 lg:py-3 lg:text-base ${
                  isActive
                    ? 'bg-[var(--color-stamp)] text-[var(--color-paper-light)]'
                    : 'text-[var(--color-ink-muted)] hover:bg-[var(--color-paper)] hover:text-[var(--color-ink)]'
                }`
              }
            >
              <Icon size={18} strokeWidth={2} className="lg:h-5 lg:w-5" />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>

      <AccountMenuTrigger />
    </aside>
  )
}