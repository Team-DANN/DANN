import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../../../context/AuthContext.jsx'
import { changePin } from '../../../lib/api/account.js'

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

const MODULE_LABELS = {
  production: 'Production',
  orders: 'Orders',
  inventory: 'Inventory',
  finance: 'Finance',
}

// Same naming the backend uses (staffService roleLabel), only used when
// /api/auth/me does not send a `label`.
function roleLabel(user, access) {
  if (user?.label) return user.label
  if (access.role === 'manager') return 'Manager'
  const names = access.modules.map((m) => MODULE_LABELS[m]).filter(Boolean)
  return names.length > 0 ? names.join(' + ') : 'No access'
}

// Same rule as the backend (staffService isWeakPin), so the person hears
// about it straight away. The backend still enforces it.
function isWeakPin(pin) {
  if (/^(\d)\1+$/.test(pin)) return true // 000000, 111111, ...
  return '0123456789'.includes(pin) || '9876543210'.includes(pin) // 123456, 654321, ...
}

function PinField({ label, value, onChange, autoComplete, show }) {
  return (
    <Field label={label}>
      <input
        type={show ? 'text' : 'password'}
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={6}
        autoComplete={autoComplete}
        placeholder="6 digits"
        value={value}
        onChange={onChange}
        className={`${inputClass} font-mono tracking-widest`}
      />
    </Field>
  )
}

// Account page for managers and staff (they sign in with a PIN, not an
// email and password). The owner keeps the original AccountSection.
// Name, username and role come from the signed-in user and are read-only:
// the owner manages them from the staff screen.
export function StaffAccountSection() {
  const { user, access } = useAuth()

  const [showForm, setShowForm] = useState(false)
  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [showPins, setShowPins] = useState(false)
  const [status, setStatus] = useState('idle') // idle | saving | saved | error
  const [error, setError] = useState('')

  const digitsOnly = (setter) => (e) => setter(e.target.value.replace(/\D/g, '').slice(0, 6))

  const complete = currentPin.length === 6 && newPin.length === 6 && confirmPin.length === 6

  function resetForm() {
    setCurrentPin('')
    setNewPin('')
    setConfirmPin('')
    setShowPins(false)
    setError('')
  }

  function validate() {
    if (isWeakPin(newPin)) return 'Choose a PIN that is not repeated or in sequence'
    if (newPin === currentPin) return 'New PIN must be different from the current one'
    if (confirmPin !== newPin) return 'The two new PINs do not match'
    return null
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const problem = validate()
    if (problem) {
      setStatus('error')
      setError(problem)
      return
    }

    setStatus('saving')
    setError('')
    try {
      await changePin({ current_pin: currentPin, new_pin: newPin })
      setStatus('saved')
      resetForm()
      setTimeout(() => {
        setStatus('idle')
        setShowForm(false)
      }, 1500)
    } catch (err) {
      // A wrong current PIN is a 403 from the backend, so it shows here
      // instead of signing the person out.
      setStatus('error')
      setError(err.message || 'Could not change your PIN')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="mb-3 font-[Roboto_Slab] text-sm font-semibold text-[var(--color-ink)]">
          Account
        </h3>
        <div className="flex flex-col gap-3">
          <Field label="Name">
            <p className={`${inputClass} cursor-default select-text`}>{user?.name || '—'}</p>
          </Field>
          {user?.username && (
            <Field label="Username">
              <p className={`${inputClass} cursor-default select-text`}>{user.username}</p>
            </Field>
          )}
          <Field label="Role">
            <p className={`${inputClass} cursor-default select-text`}>{roleLabel(user, access)}</p>
          </Field>
          <p className="text-xs text-[var(--color-ink-muted)]">
            Your owner manages your name, username and access.
          </p>
        </div>
      </div>

      <div>
        <h3 className="mb-3 font-[Roboto_Slab] text-sm font-semibold text-[var(--color-ink)]">PIN</h3>

        {!showForm ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-paper-light)] px-3 py-2 text-sm font-medium text-[var(--color-ink)] shadow-sm hover:bg-[var(--color-paper)]"
          >
            Change PIN
          </button>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <PinField
              label="Current PIN"
              value={currentPin}
              onChange={digitsOnly(setCurrentPin)}
              autoComplete="current-password"
              show={showPins}
            />
            <PinField
              label="New PIN"
              value={newPin}
              onChange={digitsOnly(setNewPin)}
              autoComplete="new-password"
              show={showPins}
            />
            <PinField
              label="Confirm new PIN"
              value={confirmPin}
              onChange={digitsOnly(setConfirmPin)}
              autoComplete="new-password"
              show={showPins}
            />

            <button
              type="button"
              onClick={() => setShowPins((v) => !v)}
              className="flex w-fit items-center gap-1.5 text-xs font-medium text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
            >
              {showPins ? <EyeOff size={14} /> : <Eye size={14} />}
              {showPins ? 'Hide PINs' : 'Show PINs'}
            </button>

            {status === 'error' && <p className="text-xs text-[var(--color-error)]">{error}</p>}

            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={!complete || status === 'saving'}
                className="rounded-md bg-[var(--color-stamp)] px-3 py-2 text-sm font-medium text-[var(--color-paper-light)] shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                {status === 'saving' ? 'Updating…' : 'Update PIN'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false)
                  setStatus('idle')
                  resetForm()
                }}
                className="text-sm font-medium text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
              >
                Cancel
              </button>
              {status === 'saved' && (
                <span className="text-xs text-[var(--color-success)]">PIN updated</span>
              )}
            </div>
          </form>
        )}

        <p className="mt-3 text-xs text-[var(--color-ink-muted)]">
          Your PIN is private: nobody else can see or reset it once you have signed in. If you forget
          it, ask your owner to remove your access and add you again.
        </p>
      </div>
    </div>
  )
}