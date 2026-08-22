import { Link } from 'react-router-dom'
import { Menu, Bell, ArrowUpCircle } from 'lucide-react'
import { mockUser } from '../../lib/mockData.js'
import { useAlerts } from '../../context/useAlerts.js'
import logo from '../../assets/logo/DANN-logo-charcoal.webp'

export default function TopBar({ onMenuClick }) {
  const { unreadCount } = useAlerts()

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

      <div className="ml-auto flex items-center gap-3 sm:gap-4">
        <Link
          to="/settings?upgrade=true"
          className="flex shrink-0 items-center gap-1 rounded-full border border-[var(--color-stamp)]/30 bg-[var(--color-stamp)]/10 px-2 py-1 text-xs font-medium leading-none whitespace-nowrap text-[var(--color-stamp)] transition-colors hover:bg-[var(--color-stamp)]/15 sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-sm"
          aria-label="Upgrade plan"
        >
          <ArrowUpCircle size={14} strokeWidth={2} className="shrink-0 sm:hidden" />
          <ArrowUpCircle size={16} strokeWidth={2} className="hidden shrink-0 sm:block" />
          <span>Upgrade plan</span>
        </Link>

        <Link
          to="/alerts"
          className="relative text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
          aria-label={unreadCount > 0 ? `${unreadCount} unread alerts` : 'Notifications'}
        >
          <Bell size={20} strokeWidth={2} />
          {unreadCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-error)] px-1 font-mono text-[10px] font-semibold leading-none text-[var(--color-paper-light)]">
              {unreadCount > 9 ? '9+' : unreadCount}
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
