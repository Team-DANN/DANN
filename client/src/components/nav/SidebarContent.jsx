import { NavLink, useNavigate } from 'react-router-dom'
import { ArrowUpCircle, LogOut, Search, Settings, Sparkles } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import { useSettings } from '../../context/SettingsContext.jsx'
import { useIsDesktop } from '../../hooks/useIsDesktop.js'
import { useVisibleNavLinks } from './useVisibleNavLinks.js'
import SyncDataMenu from './SyncDataMenu.jsx'

const itemBase =
  'flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors lg:gap-4 lg:px-4 lg:py-3 lg:text-base'
const itemIdle =
  'text-[var(--color-ink-muted)] hover:bg-[var(--color-paper)] hover:text-[var(--color-ink)]'
const itemActive = 'bg-[var(--color-stamp)] text-[var(--color-paper-light)]'

// Dividers use the muted ink colour at 30% instead of --color-border, which
// is too faint to see on the dark theme. Raise /30 to /50 for a stronger line.
const dividerColor = 'border-[var(--color-ink-muted)]/30'

function navClass({ isActive }) {
  return `${itemBase} ${isActive ? itemActive : itemIdle}`
}

// Everything under the logo, shared by the desktop Sidebar and the mobile
// drawer so the two can never drift apart:
//   top     Search, DANN AI, Sync Data
//   divider
//   middle  Home, Production, Orders, Inventory, Finance (only the ones this
//           person's modules allow)
//   bottom  Settings, Log out, and the Upgrade card (owner only)
export default function SidebarContent({ onNavigate, onOpenSearch }) {
  const { access, logout } = useAuth()
  const { open: openSettings } = useSettings()
  const isDesktop = useIsDesktop()
  const navigate = useNavigate()
  const links = useVisibleNavLinks()

  // The desktop shows Settings as a modal; mobile has its own page.
  function goToSettings(section) {
    onNavigate?.()
    if (isDesktop) {
      openSettings(section)
    } else {
      navigate(section === 'account' ? '/settings' : `/settings?section=${section}`)
    }
  }

  function handleSearch() {
    onNavigate?.()
    onOpenSearch?.()
  }

  function handleLogout() {
    onNavigate?.()
    logout()
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={handleSearch}
          className={`${itemBase} border border-[var(--color-border)] bg-[var(--color-paper)] ${itemIdle}`}
        >
          <Search size={18} strokeWidth={2} className="lg:h-5 lg:w-5" />
          <span className="flex-1">Search</span>
          <kbd className="hidden rounded border border-[var(--color-border)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--color-ink-muted)] lg:inline">
            Ctrl K
          </kbd>
        </button>

        {/* Owner and manager only for now: the assistant reads the whole
            business. It becomes module-aware once its actions are built. */}
        {access.canManageStaff && (
          <NavLink to="/ai-insights" onClick={onNavigate} className={navClass}>
            <Sparkles size={18} strokeWidth={2} className="lg:h-5 lg:w-5" />
            DANN AI
          </NavLink>
        )}

        <SyncDataMenu onNavigate={onNavigate} />
      </div>

      <div className={`my-5 border-t ${dividerColor}`} />

      <nav className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex flex-col gap-1">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/'} onClick={onNavigate} className={navClass}>
              <Icon size={18} strokeWidth={2} className="lg:h-5 lg:w-5" />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>

      <div className={`mt-3 flex flex-col gap-1 border-t pt-3 ${dividerColor}`}>
        <button type="button" onClick={() => goToSettings('account')} className={`${itemBase} ${itemIdle}`}>
          <Settings size={18} strokeWidth={2} className="lg:h-5 lg:w-5" />
          Settings
        </button>

        <button
          type="button"
          onClick={handleLogout}
          className={`${itemBase} text-[var(--color-ink-muted)] hover:bg-[var(--color-paper)] hover:text-[var(--color-error)]`}
        >
          <LogOut size={18} strokeWidth={2} className="lg:h-5 lg:w-5" />
          Log out
        </button>

        {/* Billing belongs to the owner. Staff and managers never see this. */}
        {access.isOwner && (
          <div className="mt-2 rounded-xl border border-[var(--color-stamp)]/30 bg-[var(--color-stamp)]/10 p-4">
            <div className="mb-1 flex items-center gap-2 text-[var(--color-stamp)]">
              <ArrowUpCircle size={18} strokeWidth={2} className="lg:h-5 lg:w-5" />
              <span className="text-sm font-semibold lg:text-base">Upgrade to Pro</span>
            </div>
            <p className="text-xs text-[var(--color-ink-muted)] lg:text-sm">
              Unlock more of DANN for your business.
            </p>
            <button
              type="button"
              onClick={() => goToSettings('plan')}
              className="mt-3 w-full rounded-lg bg-[var(--color-stamp)] py-2 text-sm font-semibold text-[var(--color-paper-light)] transition-opacity hover:opacity-90 lg:py-2.5"
            >
              See plans
            </button>
          </div>
        )}
      </div>
    </div>
  )
}