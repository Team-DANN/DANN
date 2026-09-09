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
import { languageOptions } from '../../lib/constants/languageOptions.js'
import { getInitials } from '../../lib/utils/getInitials.js'
import { SettingsSectionList, SettingsSectionBody } from './SettingsContent.jsx'

function QuickActionRow({ icon: Icon, label, onClick, danger, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-3 rounded-md px-3 py-3 text-left text-sm font-medium ${
        danger ? 'text-[var(--color-error)]' : 'text-[var(--color-ink)]'
      } hover:bg-[var(--color-paper)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent`}
    >
      <Icon size={18} strokeWidth={2} />
      {label}
    </button>
  )
}

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
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
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
  const { user, logout } = useAuth()
  const [language, setLanguage] = useState('English')

  const requestedSection = searchParams.get('section')
  const [activeSection, setActiveSection] = useState(requestedSection)

  useEffect(() => {
    if (isDesktop) {
      navigate('/', { replace: true })
      openSettingsModal(requestedSection ?? 'account')
    }
  }, [isDesktop, navigate, openSettingsModal, requestedSection])

  if (isDesktop) return null

  const handleLogout = () => {
    logout()
    window.location.href = '/login'
  }

  if (activeSection) {
    return (
      <div className="mx-auto max-w-md px-4 pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <SettingsSectionBody sectionId={activeSection} onBack={() => setActiveSection(null)} />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md px-4 pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
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
          {getInitials(user?.name)}
        </div>
        <div>
          <p className="text-sm font-medium text-[var(--color-ink)]">{user?.name}</p>
          <p className="text-xs text-[var(--color-ink-muted)]">{user?.email}</p>
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
          options={languageOptions.map((opt) => ({
            value: opt,
            label: opt === 'English' ? opt : `${opt} (coming soon)`,
            disabled: opt !== 'English',
          }))}
          onChange={setLanguage}
        />
        <QuickActionRow
          icon={Download}
          label="Get apps"
          disabled
          onClick={() => console.log('open get apps')}
        />
        <QuickActionRow
          icon={ArrowUpCircle}
          label="Upgrade plan"
          onClick={() => setActiveSection('plan')}
        />
        <QuickActionRow
          icon={UserPlus}
          label="Add account"
          onClick={() => console.log('add account')}
        />
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