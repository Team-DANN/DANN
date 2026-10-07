import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import { useTheme } from '../../context/ThemeContext.jsx'
import { publicFetch } from '../../lib/apiClient.js'
import logoCharcoal from '../../assets/logo/DANN-logo-charcoal.webp'
import logoTerracotta from '../../assets/logo/DANN-logo-terracotta.webp'

// The business code is not a secret (it only identifies the business), so
// it is remembered on this device to save typing it every time.
const LAST_CODE_KEY = 'dann_staff_business_code'

function readLastCode() {
  try {
    return localStorage.getItem(LAST_CODE_KEY) || ''
  } catch {
    return ''
  }
}

const inputClass =
  'w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-paper)] px-4 py-3.5 text-base text-[var(--color-ink)] outline-none transition-shadow placeholder:text-[var(--color-ink-muted)]/60 focus:border-[var(--color-stamp)] focus:ring-2 focus:ring-[var(--color-stamp)]/20'

// Staff and managers sign in here with the business code, username and PIN
// their owner gave them. Owners use the email login on the marketing site.
// A 401 here only means "wrong details", so this page calls the API through
// publicFetch rather than apiFetch (which would treat it as an expired session).
export default function StaffLoginPage() {
  const { login, loading, isAuthenticated, access } = useAuth()
  const { theme } = useTheme()
  const [form, setForm] = useState(() => ({ businessCode: readLastCode(), username: '', pin: '' }))
  const [showPin, setShowPin] = useState(false)
  const [status, setStatus] = useState('idle') // idle | submitting | error
  const [error, setError] = useState('')

  const logo = theme === 'dark' ? logoTerracotta : logoCharcoal

  const canSubmit =
    form.businessCode.length >= 4 &&
    form.username.trim().length > 0 &&
    form.pin.length === 6 &&
    status !== 'submitting'

  function handleChange(event) {
    const { name, value } = event.target
    let next = value
    if (name === 'businessCode') next = value.toUpperCase().replace(/\s/g, '')
    if (name === 'pin') next = value.replace(/\D/g, '').slice(0, 6)
    setForm((prev) => ({ ...prev, [name]: next }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!canSubmit) return
    setStatus('submitting')
    setError('')

    try {
      const body = await publicFetch('/api/auth/staff-login', {
        method: 'POST',
        body: JSON.stringify({
          business_code: form.businessCode,
          username: form.username.trim(),
          pin: form.pin,
        }),
      })

      try {
        localStorage.setItem(LAST_CODE_KEY, form.businessCode)
      } catch {
        /* storage unavailable: ignore */
      }

      // Stores the session and loads the user. Once the user is set, the
      // redirect below sends them to their first module.
      await login(body.data.token)
    } catch (err) {
      setStatus('error')
      setError(err.message || 'Could not sign you in. Please try again.')
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-[var(--color-paper)]">
        <Loader2 className="animate-spin text-stamp" size={28} aria-hidden="true" />
      </div>
    )
  }

  if (isAuthenticated) return <Navigate to={access.firstAllowedPath} replace />

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-[var(--color-paper)] px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-paper-light)] p-6 shadow-sm sm:p-8">
        <img src={logo} alt="DANN" className="mb-6 h-10 w-auto object-contain" />

        <h1 className="font-sans text-2xl font-bold text-[var(--color-ink)]">Staff sign in</h1>
        <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
          Use the business code, username and PIN your owner gave you.
        </p>

        {status === 'error' && (
          <div
            role="alert"
            className="mt-5 flex items-start gap-2.5 rounded-xl border border-[var(--color-error)]/30 bg-[var(--color-error)]/10 p-4 text-sm text-[var(--color-error)]"
          >
            <AlertCircle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-5">
          <div>
            <label htmlFor="businessCode" className="mb-2 block text-sm font-medium text-[var(--color-ink)]">
              Business code
            </label>
            <input
              id="businessCode"
              name="businessCode"
              type="text"
              required
              maxLength={12}
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              value={form.businessCode}
              onChange={handleChange}
              placeholder="e.g. ZL2GJS"
              className={`${inputClass} font-mono tracking-widest`}
            />
          </div>

          <div>
            <label htmlFor="username" className="mb-2 block text-sm font-medium text-[var(--color-ink)]">
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              required
              autoCapitalize="none"
              autoComplete="username"
              spellCheck={false}
              value={form.username}
              onChange={handleChange}
              placeholder="Your username"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="pin" className="mb-2 block text-sm font-medium text-[var(--color-ink)]">
              PIN
            </label>
            <div className="relative">
              <input
                id="pin"
                name="pin"
                type={showPin ? 'text' : 'password'}
                required
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                autoComplete="current-password"
                value={form.pin}
                onChange={handleChange}
                placeholder="6-digit PIN"
                className={`${inputClass} pr-12 font-mono tracking-widest`}
              />
              <button
                type="button"
                onClick={() => setShowPin((prev) => !prev)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
                aria-label={showPin ? 'Hide PIN' : 'Show PIN'}
              >
                {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-stamp)] font-sans text-base font-semibold text-[var(--color-paper-light)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {status === 'submitting' && <Loader2 size={18} className="animate-spin" aria-hidden="true" />}
            {status === 'submitting' ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--color-ink-muted)]">
          Business owner?{' '}
          <a href="/login" className="font-medium text-[var(--color-stamp)] hover:opacity-80">
            Log in with email
          </a>
        </p>
      </div>
    </main>
  )
}