// PATH: src/components/layout/TopBar.jsx
import { useNavigate } from 'react-router-dom'
import { Menu, Bell, ArrowUpCircle } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import { useAlerts } from '../../context/useAlerts.js'
import { useSettings } from '../../context/SettingsContext.jsx'
import { useTheme } from '../../context/ThemeContext.jsx'
import { useIsDesktop } from '../../hooks/useIsDesktop.js'
import logoCharcoal from '../../assets/logo/DANN-logo-charcoal.webp'
import logoTerracotta from '../../assets/logo/DANN-logo-terracotta.webp'

// UserModel doesn't return an `initials` field — derived here from the
// real name instead of the old mockUser.initials leftover.
function getInitials(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase()
}

export default function TopBar({ onMenuClick }) {
  const { user } = useAuth()
  const { unreadCount } = useAlerts()
  const { open: openSettings } = useSettings()
  const { theme } = useTheme()
  const isDesktop = useIsDesktop()
  const navigate = useNavigate()

  const logo = theme === 'dark' ? logoTerracotta : logoCharcoal

  function handleAvatarClick() {
    if (isDesktop) {
      openSettings('account')
    } else {
      navigate('/settings?section=account')
    }
  }

  function handleUpgradeClick() {
    if (isDesktop) {
      openSettings('plan')
    } else {
      navigate('/settings?section=plan')
    }
  }

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-paper-light)] px-4 py-3 lg:px-6 lg:py-4">
      <button
        type="button"
        onClick={onMenuClick}
        className="text-[var(--color-ink)] md:hidden"
        aria-label="Open menu"
      >
        <Menu size={24} strokeWidth={2} />
      </button>

      <img src={logo} alt="DANN" className="h-8 w-auto object-contain md:hidden" />

      <div className="ml-auto flex items-center gap-3 sm:gap-4 lg:gap-5">
        <button
          type="button"
          onClick={handleUpgradeClick}
          className="flex shrink-0 items-center gap-1 rounded-full border border-[var(--color-stamp)]/30 bg-[var(--color-stamp)]/10 px-2 py-1 text-xs font-medium leading-none whitespace-nowrap text-[var(--color-stamp)] transition-colors hover:bg-[var(--color-stamp)]/15 sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-sm lg:gap-2 lg:px-4 lg:py-2 lg:text-base"
          aria-label="Upgrade plan"
        >
          <ArrowUpCircle size={14} strokeWidth={2} className="shrink-0 sm:hidden" />
          <ArrowUpCircle size={16} strokeWidth={2} className="hidden shrink-0 sm:block lg:hidden" />
          <ArrowUpCircle size={20} strokeWidth={2} className="hidden shrink-0 lg:block" />
          <span>Upgrade plan</span>
        </button>

        <button
          type="button"
          onClick={() => navigate('/alerts')}
          className="relative shrink-0 text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
          aria-label={unreadCount > 0 ? `${unreadCount} unread alerts` : 'Notifications'}
        >
          <Bell size={20} strokeWidth={2} className="lg:h-6 lg:w-6" />
          {unreadCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-error)] px-1 font-mono text-[10px] font-semibold leading-none text-[var(--color-paper-light)] lg:-right-2 lg:-top-2 lg:h-[18px] lg:min-w-[18px] lg:text-xs">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={handleAvatarClick}
          aria-label="Open account settings"
          title={user?.name ?? ''}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-stamp)] font-mono text-xs font-semibold text-[var(--color-paper-light)] transition-opacity hover:opacity-90 lg:h-10 lg:w-10 lg:text-sm"
        >
          {getInitials(user?.name)}
        </button>
      </div>
    </header>
  )
}
