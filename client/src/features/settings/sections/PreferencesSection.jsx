import { useState } from 'react'
import { Download } from 'lucide-react'
import { useTheme } from '../../../context/ThemeContext.jsx'
import { languageOptions } from '../../../lib/constants/languageOptions.js'

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-[var(--color-ink-muted)]">{label}</label>
      {children}
    </div>
  )
}

const inputClass =
  'rounded-md border border-[var(--color-border)] bg-[var(--color-paper-light)] px-3 py-2.5 text-sm text-[var(--color-ink)] shadow-sm outline-none focus:border-[var(--color-verdigris-dark)] focus:ring-1 focus:ring-[var(--color-verdigris-dark)] disabled:opacity-60'

const THEMES = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

// Everything that used to sit in the avatar popover and is not already a
// Settings section: Appearance, Language, Get apps. Shown to everyone.
// (Help is its own section; Log out is in the sidebar; Upgrade is in Plan.)
export function PreferencesSection() {
  const { theme, setTheme } = useTheme()
  // Only English exists, so this is not saved anywhere yet.
  const [language, setLanguage] = useState('English')

  return (
    <div className="flex flex-col gap-6">
      <h3 className="font-[Roboto_Slab] text-sm font-semibold text-[var(--color-ink)]">
        Preferences
      </h3>

      <Field label="Appearance">
        <div className="inline-flex w-fit rounded-md border border-[var(--color-border)] bg-[var(--color-paper-light)] p-1 shadow-sm">
          {THEMES.map((t) => (
            <button
              key={t.value}
              type="button"
              aria-pressed={theme === t.value}
              onClick={() => setTheme(t.value)}
              className={`rounded px-4 py-1.5 text-sm font-medium transition-colors ${
                theme === t.value
                  ? 'bg-[var(--color-stamp)] text-[var(--color-paper-light)]'
                  : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Language">
        <select
          className={inputClass}
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
        >
          {languageOptions.map((opt) => (
            <option key={opt} value={opt} disabled={opt !== 'English'}>
              {opt === 'English' ? opt : `${opt} (coming soon)`}
            </option>
          ))}
        </select>
      </Field>

      <div>
        <button
          type="button"
          disabled
          className="flex cursor-not-allowed items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-paper-light)] px-3 py-2 text-sm font-medium text-[var(--color-ink-muted)] opacity-60"
        >
          <Download size={16} strokeWidth={2} />
          Get apps — coming soon
        </button>
      </div>
    </div>
  )
}