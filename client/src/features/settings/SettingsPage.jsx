import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ChevronLeft,
  ChevronDown,
  SunMoon,
  Globe,
  Download,
  ArrowUpCircle,
  UserPlus,
  LogOut,
} from 'lucide-react'
import { useTheme } from '../../context/ThemeContext.jsx'
import { useSettings } from '../../context/SettingsContext.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { useIsDesktop } from '../../hooks/useIsDesktop.js'
import { mockUser, languageOptions } from '../../lib/mockData.js'
import { SettingsSectionList, SettingsSectionBody } from './SettingsContent.jsx'

function QuickActionRow({ icon: Icon, label, onClick, danger }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-md px-3 py-3 text-left text-sm font-medium ${
        danger ? 'text-[var(--color-error)]' : 'text-[var(--color-ink)]'
      } hover:bg-[var(--color-paper)]`}
    >
      <Icon size={18} strokeWidth={2} />
      {label}
    </button>
  )
}

// Real <select>-backed dropdown, styled as a visible box so it reads as
// a dropdown at a glance — not just clickable text.
function DropdownRow({ icon: Icon, label, value, options, onChange }) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-3">
      <span className="flex items-center gap-3 text-sm font-medium text-[var(--color-ink)]">
        <Icon size={18} strokeWidth={2} />
        {label}
      </span>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="appearance-none rounded-md border border-[var(--color-border)] bg-[var(--color-paper-light)] py-1.5 pl-3 pr-8 text-sm font-medium text-[var(--color-ink)] shadow-sm outline-none focus:border-[var(--color-verdigris-dark)]"
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={14}
          strokeWidth={2}
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)]"
        />
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isDesktop = useIsDesktop()
  const { open: openSettingsModal } = useSettings()
  const { theme, setTheme } = useTheme()
  const { logout } = useAuth()
  const [language, setLanguage] = useState(mockUser.language)

  // Deep-links like /settings?section=plan land directly on that section
  // instead of the default account list — same entry point TopBar's
  // "Upgrade plan" button uses on mobile.
  const requestedSection = searchParams.get('section')
  const [activeSection, setActiveSection] = useState(requestedSection)

  // /settings is a route that only makes sense as a mobile full-page view.
  // If a desktop viewport ever lands here directly (typed URL, refresh,
  // back/forward nav), redirect home and open the overlay instead — so
  // desktop never renders the page shell, only the modal. Any requested
  // section carries over so the modal opens on the right tab too.
  useEffect(() => {
    if (isDesktop) {
      navigate('/', { replace: true })
      openSettingsModal(requestedSection ?? 'account')
    }
  }, [isDesktop, navigate, openSettingsModal, requestedSection])

  if (isDesktop) return null

  // Sign the user out and send them to /login. This is a hard navigation
  // (window.location.href), not React Router's navigate() — /login lives
  // in the marketing app's bundle, not this dashboard router, so a client
  // side route change can't reach it. dann_has_authenticated is left
  // untouched on purpose: it means "this browser has logged in before,"
  // and staying true is what makes a future visit to `/` land on /login
  // instead of the marketing homepage.
  const handleLogout = () => {
    logout()
    window.location.href = '/login'
  }

  if (activeSection) {
    return (
      <div className="mx-auto max-w-md px-4 py-6">
        <SettingsSectionBody sectionId={activeSection} onBack={() => setActiveSection(null)} />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <div className="mb-1 flex items-center gap-2">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="rounded-md p-1 -ml-1 text-[var(--color-ink-muted)] hover:bg-[var(--color-paper)] hover:text-[var(--color-ink)]"
        >
          <ChevronLeft size={20} strokeWidth={2} />
        </button>
        <h1 className="font-[Roboto_Slab] text-lg font-semibold text-[var(--color-ink)]">
          Settings
        </h1>
      </div>

      <div className="mb-4 mt-4 flex items-center gap-3 px-1">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-stamp)] font-mono text-sm font-semibold text-[var(--color-paper-light)]">
          {mockUser.initials}
        </div>
        <div>
          <p className="text-sm font-medium text-[var(--color-ink)]">{mockUser.name}</p>
          <p className="text-xs text-[var(--color-ink-muted)]">{mockUser.email}</p>
        </div>
      </div>

      <div className="mb-2 flex flex-col divide-y divide-[var(--color-border)] rounded-lg border border-[var(--color-border)] bg-[var(--color-paper-light)] p-1">
        <DropdownRow
          icon={SunMoon}
          label="Appearance"
          value={theme}
          options={[
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
          ]}
          onChange={setTheme}
        />
        <DropdownRow
          icon={Globe}
          label="Language"
          value={language}
          options={languageOptions.map((opt) => ({ value: opt, label: opt }))}
          onChange={setLanguage}
        />
        <QuickActionRow icon={Download} label="Get apps" onClick={() => console.log('open get apps')} />
        <QuickActionRow
          icon={ArrowUpCircle}
          label="Upgrade plan"
          onClick={() => setActiveSection('plan')}
        />
        <QuickActionRow icon={UserPlus} label="Add account" onClick={() => console.log('add account')} />
      </div>

      <div className="my-3 border-t border-[var(--color-border)]" />

      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-paper-light)] p-1">
        <SettingsSectionList onSelect={setActiveSection} />
      </div>

      <div className="my-3 border-t border-[var(--color-border)]" />

      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-paper-light)] p-1">
        <QuickActionRow icon={LogOut} label="Log out" onClick={handleLogout} danger />
      </div>
    </div>
  )
}