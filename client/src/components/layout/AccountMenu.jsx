import { useState } from 'react'
import {
  Settings,
  Globe,
  CircleHelp,
  Download,
  SunMoon,
  ArrowUpCircle,
  LogOut,
  ChevronDown,
} from 'lucide-react'
import { useTheme } from '../../context/ThemeContext.jsx'
import { useSettings } from '../../context/SettingsContext.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { useChatbot } from '../../features/ai-insights/chatbot/ChatbotContext.jsx'
import { languageOptions } from '../../lib/constants/languageOptions.js'
import { getInitials } from '../../lib/utils/getInitials.js'
import { AccountSwitcher } from '../nav/AccountSwitcher.jsx'

export function AccountFooter({ onClick }) {
  const { user } = useAuth()
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left hover:bg-[var(--color-paper)] lg:gap-3 lg:py-2.5"
    >
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-stamp)] font-mono text-xs font-semibold text-[var(--color-paper-light)] lg:h-9 lg:w-9 lg:text-sm">
        {getInitials(user?.name)}
      </div>
      <div className="flex-1 overflow-hidden">
        <p className="truncate text-sm font-medium text-[var(--color-ink)] lg:text-base">
          {user?.name}
        </p>
        <p className="text-xs text-[var(--color-ink-muted)] lg:text-sm">
          {user?.plan_tier || 'Free'} plan
        </p>
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
        className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium text-[var(--color-ink-muted)] hover:bg-[var(--color-paper)] hover:text-[var(--color-ink)] lg:px-4 lg:py-2.5 lg:text-base"
      >
        <span className="flex items-center gap-3">
          <Icon size={18} strokeWidth={2} className="lg:h-5 lg:w-5" />
          {label}
        </span>
        <span className="flex items-center gap-1 text-xs text-[var(--color-ink-muted)] lg:text-sm">
          {value}
          <ChevronDown size={14} strokeWidth={2} className="lg:h-4 lg:w-4" />
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-10 mt-1 max-h-56 w-40 overflow-y-auto rounded-md border border-[var(--color-border)] bg-[var(--color-paper-light)] p-1 shadow-lg lg:w-48">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              disabled={opt.disabled}
              onClick={() => {
                if (opt.disabled) return
                onSelect(opt.value)
                setOpen(false)
              }}
              className={`block w-full rounded px-2 py-1.5 text-left text-sm lg:px-3 lg:py-2 lg:text-base disabled:cursor-not-allowed disabled:opacity-40 ${
                opt.value === value
                  ? 'bg-[var(--color-stamp)] text-[var(--color-paper-light)]'
                  : 'text-[var(--color-ink)] hover:bg-[var(--color-paper)]'
              }`}
            >
              {opt.label}
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
  const { openHelp } = useChatbot()
  const { user, logout } = useAuth()
  const [language, setLanguage] = useState('English')

  // logout() now only signs out the ACTIVE account — if other accounts
  // are still stored it hands off to one of them and reloads instead of
  // forcing a trip to /login, and only redirects when none are left.
  // That redirect decision lives inside AuthContext.logout() now, so
  // this handler doesn't need to force window.location.href itself.
  const handleLogout = () => {
    onNavigate?.()
    logout()
  }

  return (
    <div className="flex flex-col gap-1">
      <p className="truncate px-3 pb-1 pt-0.5 text-xs text-[var(--color-ink-muted)]/70 lg:text-sm">
        {user?.email}
      </p>

      <button
        type="button"
        onClick={() => {
          openSettings('account')
          onNavigate?.()
        }}
        className="flex items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium text-[var(--color-ink-muted)] hover:bg-[var(--color-paper)] hover:text-[var(--color-ink)] lg:px-4 lg:py-2.5 lg:text-base"
      >
        <Settings size={18} strokeWidth={2} className="lg:h-5 lg:w-5" />
        Settings
      </button>

      <InlineDropdown
        icon={SunMoon}
        label="Appearance"
        value={theme === 'dark' ? 'Dark' : 'Light'}
        options={[
          { value: 'Dark', label: 'Dark' },
          { value: 'Light', label: 'Light' },
        ]}
        onSelect={(val) => setTheme(val.toLowerCase())}
      />

      <InlineDropdown
        icon={Globe}
        label="Language"
        value={language}
        options={languageOptions.map((opt) => ({
          value: opt,
          label: opt === 'English' ? opt : `${opt} (soon)`,
          disabled: opt !== 'English',
        }))}
        onSelect={setLanguage}
      />

      <button
        type="button"
        onClick={() => {
          openHelp()
          onNavigate?.()
        }}
        className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-[var(--color-ink-muted)] hover:bg-[var(--color-paper)] hover:text-[var(--color-ink)] lg:px-4 lg:py-2.5 lg:text-base"
      >
        <CircleHelp size={18} strokeWidth={2} className="lg:h-5 lg:w-5" />
        Get help
      </button>

      <button
        type="button"
        disabled
        className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-[var(--color-ink-muted)] opacity-50 lg:px-4 lg:py-2.5 lg:text-base"
      >
        <Download size={18} strokeWidth={2} className="lg:h-5 lg:w-5" />
        Get apps
      </button>

      <div className="my-1 border-t border-[var(--color-border)]" />

      <button
        type="button"
        className="sticky top-0 z-10 flex items-center gap-3 rounded-md bg-[var(--color-paper-light)] px-3 py-2 text-sm font-medium text-[var(--color-stamp)] hover:bg-[var(--color-paper)] lg:px-4 lg:py-2.5 lg:text-base"
        onClick={() => console.log('open upgrade plan')}
      >
        <ArrowUpCircle size={18} strokeWidth={2} className="lg:h-5 lg:w-5" />
        Upgrade plan
      </button>

      <AccountSwitcher onNavigate={onNavigate} />

      <div className="my-1 border-t border-[var(--color-border)]" />

      <button
        type="button"
        className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-[var(--color-ink-muted)] hover:bg-[var(--color-paper)] hover:text-[var(--color-error)] lg:px-4 lg:py-2.5 lg:text-base"
        onClick={handleLogout}
      >
        <LogOut size={18} strokeWidth={2} className="lg:h-5 lg:w-5" />
        Log out
      </button>
    </div>
  )
}
