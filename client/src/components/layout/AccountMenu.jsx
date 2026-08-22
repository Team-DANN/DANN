import { useState } from 'react'
import {
  Settings,
  Globe,
  CircleHelp,
  Download,
  SunMoon,
  ArrowUpCircle,
  UserPlus,
  LogOut,
  ChevronDown,
} from 'lucide-react'
import { useTheme } from '../../context/ThemeContext.jsx'
import { useSettings } from '../../context/SettingsContext.jsx'
import { mockUser, languageOptions } from '../../lib/mockData.js'

export function AccountFooter({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left hover:bg-[var(--color-paper)]"
    >
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-stamp)] font-mono text-xs font-semibold text-[var(--color-paper-light)]">
        {mockUser.initials}
      </div>
      <div className="flex-1 overflow-hidden">
        <p className="truncate text-sm font-medium text-[var(--color-ink)]">{mockUser.name}</p>
        <p className="text-xs text-[var(--color-ink-muted)]">{mockUser.plan} plan</p>
      </div>
    </button>
  )
}

function InlineDropdown({ icon: Icon, label, value, options, onSelect }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium text-[var(--color-ink-muted)] hover:bg-[var(--color-paper)] hover:text-[var(--color-ink)]"
      >
        <span className="flex items-center gap-3">
          <Icon size={18} strokeWidth={2} />
          {label}
        </span>
        <span className="flex items-center gap-1 text-xs text-[var(--color-ink-muted)]">
          {value}
          <ChevronDown size={14} strokeWidth={2} />
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-10 mt-1 max-h-56 w-40 overflow-y-auto rounded-md border border-[var(--color-border)] bg-[var(--color-paper-light)] p-1 shadow-lg">
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => {
                onSelect(opt)
                setOpen(false)
              }}
              className={`block w-full rounded px-2 py-1.5 text-left text-sm ${
                opt === value
                  ? 'bg-[var(--color-stamp)] text-[var(--color-paper-light)]'
                  : 'text-[var(--color-ink)] hover:bg-[var(--color-paper)]'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function AccountMenuList({ onNavigate }) {
  const { theme, setTheme } = useTheme()
  const { open: openSettings } = useSettings()
  const [language, setLanguage] = useState(mockUser.language)

  return (
    <div className="flex flex-col gap-1">
      <p className="truncate px-3 pb-1 pt-0.5 text-xs text-[var(--color-ink-muted)]/70">
        {mockUser.email}
      </p>

      <button
        type="button"
        onClick={() => {
          openSettings('account')
          onNavigate?.()
        }}
        className="flex items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium text-[var(--color-ink-muted)] hover:bg-[var(--color-paper)] hover:text-[var(--color-ink)]"
      >
        <Settings size={18} strokeWidth={2} />
        Settings
      </button>

      <InlineDropdown
        icon={SunMoon}
        label="Appearance"
        value={theme === 'dark' ? 'Dark' : 'Light'}
        options={['Dark', 'Light']}
        onSelect={(val) => setTheme(val.toLowerCase())}
      />

      <InlineDropdown
        icon={Globe}
        label="Language"
        value={language}
        options={languageOptions}
        onSelect={setLanguage}
      />

      <button
        type="button"
        className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-[var(--color-ink-muted)] hover:bg-[var(--color-paper)] hover:text-[var(--color-ink)]"
        onClick={() => console.log('open help')}
      >
        <CircleHelp size={18} strokeWidth={2} />
        Get help
      </button>

      <button
        type="button"
        className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-[var(--color-ink-muted)] hover:bg-[var(--color-paper)] hover:text-[var(--color-ink)]"
        onClick={() => console.log('open get apps')}
      >
        <Download size={18} strokeWidth={2} />
        Get apps
      </button>

      <div className="my-1 border-t border-[var(--color-border)]" />

      <button
        type="button"
        className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-[var(--color-stamp)] hover:bg-[var(--color-paper)]"
        onClick={() => console.log('open upgrade plan')}
      >
        <ArrowUpCircle size={18} strokeWidth={2} />
        Upgrade plan
      </button>

      <button
        type="button"
        className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-[var(--color-ink-muted)] hover:bg-[var(--color-paper)] hover:text-[var(--color-ink)]"
        onClick={() => console.log('add account')}
      >
        <UserPlus size={18} strokeWidth={2} />
        Add account
      </button>

      <div className="my-1 border-t border-[var(--color-border)]" />

      <button
        type="button"
        className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-[var(--color-ink-muted)] hover:bg-[var(--color-paper)] hover:text-[var(--color-error)]"
        onClick={() => {
          console.log('logout')
          onNavigate?.()
        }}
      >
        <LogOut size={18} strokeWidth={2} />
        Log out
      </button>
    </div>
  )
}