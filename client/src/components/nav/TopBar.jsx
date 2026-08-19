import { Link } from 'react-router-dom'
import { Menu, Bell } from 'lucide-react'
import { mockUser, mockAlerts } from '../../lib/mockData.js'
import logo from '../../assets/logo/DANN-logo-charcoal.webp'

export default function TopBar({ onMenuClick }) {
  const alertCount = mockAlerts.length

  return (
   <header className="sticky top-0 z-20 flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-paper-light)] px-4 py-3">
      <button
        type="button"
        onClick={onMenuClick}
        className="text-[var(--color-ink)] md:hidden"
        aria-label="Open menu"
      >
        <Menu size={24} strokeWidth={2} />
      </button>

      <img src={logo} alt="DANN" className="h-8 w-auto object-contain md:hidden" />

      <div className="ml-auto flex items-center gap-4">
        <Link
          to="/alerts"
          className="relative text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
          aria-label={alertCount > 0 ? `${alertCount} alerts` : 'Notifications'}
        >
          <Bell size={20} strokeWidth={2} />
          {alertCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-error)] px-1 font-mono text-[10px] font-semibold leading-none text-[var(--color-paper-light)]">
              {alertCount > 9 ? '9+' : alertCount}
            </span>
          )}
        </Link>

        <div
          className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-stamp)] font-mono text-xs font-semibold text-[var(--color-paper-light)]"
          title={mockUser.name}
        >
          {mockUser.initials}
        </div>
      </div>
    </header>
  )
}