import { useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  User,
  Building2,
  BellRing,
  Sparkles,
  CircleHelp,
} from 'lucide-react'
import { AccountSection } from './sections/AccountSection.jsx'
import { BusinessProfileSection } from './sections/BusinessProfileSection.jsx'
import { AlertsThresholdsSection } from './sections/AlertsThresholdsSection.jsx'
import { PlanSection } from './sections/PlanSection.jsx'
import { HelpSection } from './sections/HelpSection.jsx'

const SECTIONS = [
  { id: 'account', label: 'Account', icon: User, Component: AccountSection },
  { id: 'business', label: 'Business profile', icon: Building2, Component: BusinessProfileSection },
  { id: 'alerts', label: 'Alerts & thresholds', icon: BellRing, Component: AlertsThresholdsSection },
  { id: 'plan', label: 'Plan', icon: Sparkles, Component: PlanSection },
  { id: 'help', label: 'Help', icon: CircleHelp, Component: HelpSection },
]

export function SettingsContent({ variant = 'modal', initialSection = 'account' }) {
  const [activeId, setActiveId] = useState(initialSection)
  const active = SECTIONS.find((s) => s.id === activeId) ?? SECTIONS[0]
  const ActiveComponent = active.Component

  if (variant === 'modal') {
    return (
      <div className="flex h-full min-h-0">
        <nav className="w-48 shrink-0 border-r border-[var(--color-border)] p-2">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setActiveId(s.id)}
              className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors ${
                s.id === activeId
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
  return (
    <div className="flex flex-col gap-1">
      {SECTIONS.map((s) => (
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
  const active = SECTIONS.find((s) => s.id === sectionId)
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