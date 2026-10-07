import { useMemo, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  User,
  SunMoon,
  Building2,
  BellRing,
  Sparkles,
  CircleHelp,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import { AccountSection as OwnerAccountSection } from './sections/AccountSection.jsx'
import { StaffAccountSection } from './sections/StaffAccountSection.jsx'
import { PreferencesSection } from './sections/PreferencesSection.jsx'
import { BusinessProfileSection } from './sections/BusinessProfileSection.jsx'
import { AlertsThresholdsSection } from './sections/AlertsThresholdsSection.jsx'
import { PlanSection } from './sections/PlanSection.jsx'
import { HelpSection } from './sections/HelpSection.jsx'

// The owner signs in with email and password and edits profile, password and
// the account itself. Managers and staff sign in with a PIN and get the PIN
// screen instead.
function AccountSectionForRole() {
  const { access } = useAuth()
  return access.isOwner ? <OwnerAccountSection /> : <StaffAccountSection />
}

// `who` decides who sees the section:
//   all    everyone signed in
//   admin  owner and manager (they edit the business and its alert rules)
//   owner  the owner only (billing)
const SECTIONS = [
  { id: 'account', label: 'Account', icon: User, Component: AccountSectionForRole, who: 'all' },
  { id: 'preferences', label: 'Preferences', icon: SunMoon, Component: PreferencesSection, who: 'all' },
  { id: 'business', label: 'Business profile', icon: Building2, Component: BusinessProfileSection, who: 'admin' },
  { id: 'alerts', label: 'Alerts & thresholds', icon: BellRing, Component: AlertsThresholdsSection, who: 'admin' },
  { id: 'plan', label: 'Plan', icon: Sparkles, Component: PlanSection, who: 'owner' },
  { id: 'help', label: 'Help', icon: CircleHelp, Component: HelpSection, who: 'all' },
]

// The sections this person may see. Shared by the desktop modal, the mobile
// list and the mobile page, so they always agree.
export function useVisibleSections() {
  const { access } = useAuth()

  return useMemo(
    () =>
      SECTIONS.filter((s) => {
        if (s.who === 'owner') return access.isOwner
        if (s.who === 'admin') return access.canManageStaff
        return true
      }),
    [access]
  )
}

export function SettingsContent({ variant = 'modal', initialSection = 'account' }) {
  const sections = useVisibleSections()
  const [activeId, setActiveId] = useState(initialSection)
  // A section this person can't see (for example 'plan' for a manager)
  // falls back to the first visible one instead of showing nothing.
  const active = sections.find((s) => s.id === activeId) ?? sections[0]
  const ActiveComponent = active.Component

  if (variant === 'modal') {
    return (
      <div className="flex h-full min-h-0">
        <nav className="w-48 shrink-0 border-r border-[var(--color-border)] p-2">
          {sections.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setActiveId(s.id)}
              className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors ${
                s.id === active.id
                  ? 'bg-[var(--color-stamp)] text-[var(--color-paper-light)]'
                  : 'text-[var(--color-ink-muted)] hover:bg-[var(--color-paper)] hover:text-[var(--color-ink)]'
              }`}
            >
              <s.icon size={16} strokeWidth={2} />
              {s.label}
            </button>
          ))}
        </nav>
        <div className="flex-1 min-h-0 overflow-y-auto p-6">
          <ActiveComponent />
        </div>
      </div>
    )
  }

  // variant === 'page' → drill-down for mobile
  if (!activeId || activeId === '__list__') return null

  return (
    <div className="flex flex-col">
      {activeId && activeId !== '__list__' ? null : null}
    </div>
  )
}

// Separate list view exported for the mobile page shell to render first,
// keeping the drill-down state owned by SettingsPage (needs a real back button
// in the page header, not just inside this component).
export function SettingsSectionList({ onSelect }) {
  const sections = useVisibleSections()

  return (
    <div className="flex flex-col gap-1">
      {sections.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => onSelect(s.id)}
          className="flex items-center justify-between rounded-md px-3 py-3 text-left text-sm font-medium text-[var(--color-ink)] hover:bg-[var(--color-paper)]"
        >
          <span className="flex items-center gap-3">
            <s.icon size={18} strokeWidth={2} />
            {s.label}
          </span>
          <ChevronRight size={16} strokeWidth={2} className="text-[var(--color-ink-muted)]" />
        </button>
      ))}
    </div>
  )
}

export function SettingsSectionBody({ sectionId, onBack }) {
  const sections = useVisibleSections()
  const active = sections.find((s) => s.id === sectionId)
  if (!active) return null
  const ActiveComponent = active.Component

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={onBack}
        className="mb-4 flex items-center gap-1 text-sm font-medium text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
      >
        <ChevronLeft size={16} strokeWidth={2} />
        {active.label}
      </button>
      <ActiveComponent />
    </div>
  )
}