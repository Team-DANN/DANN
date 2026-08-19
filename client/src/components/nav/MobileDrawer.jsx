import { useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { X } from 'lucide-react'
import { navLinks } from './navLinks.js'
import AccountMenuTrigger from './AccountMenuTrigger.jsx'
import logo from '../../assets/logo/DANN-logo-charcoal.webp'

const drawerNavLinks = navLinks.filter((link) => link.to !== '/settings')

export default function MobileDrawer({ open, onClose }) {
  // Lock body scroll while open, and pad for the vanished scrollbar so
  // the page width doesn't jump — that jump is what reads as "moving."
  useEffect(() => {
    if (!open) return
    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth
    document.body.style.overflow = 'hidden'
    document.body.style.paddingRight = `${scrollBarWidth}px`
    return () => {
      document.body.style.overflow = ''
      document.body.style.paddingRight = ''
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-30 md:hidden">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />

      <div className="fixed inset-y-0 left-0 flex w-72 flex-col bg-[var(--color-paper-light)] p-4 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <img src={logo} alt="DANN" className="h-8 w-auto object-contain" />
          <button type="button" onClick={onClose} aria-label="Close menu">
            <X size={22} strokeWidth={2} className="text-[var(--color-ink-muted)]" />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {drawerNavLinks.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium ${
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

        <AccountMenuTrigger onNavigate={onClose} />
      </div>
    </div>
  )
}