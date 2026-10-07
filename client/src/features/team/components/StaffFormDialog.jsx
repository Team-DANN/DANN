import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import Dialog, { inputClass, primaryButton, secondaryButton } from './Dialog.jsx'
import { createStaff, updateStaff } from '../../../lib/api/staff.js'

const MODULE_OPTIONS = [
  { key: 'production', label: 'Production', hint: 'Log batches and manage products' },
  { key: 'orders', label: 'Orders', hint: 'Log dispatches and record payments' },
  { key: 'inventory', label: 'Inventory', hint: 'Manage raw materials' },
  { key: 'finance', label: 'Finance', hint: 'View reports and record payments' },
]

const USERNAME_PATTERN = /^[a-z0-9._-]{3,30}$/

function sameModules(a, b) {
  const x = [...(a || [])].sort()
  const y = [...(b || [])].sort()
  return x.length === y.length && x.every((m, i) => m === y[i])
}

function Field({ label, hint, children }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium text-[var(--color-ink)]">{label}</span>
      {children}
      {hint && <span className="text-xs text-[var(--color-ink-muted)]">{hint}</span>}
    </label>
  )
}

// Add (mode="add") or edit (mode="edit") one person.
//   add:  onSaved({ staff, pin, business_code })
//   edit: onSaved(updatedStaff)
// Only the owner sees the Staff/Manager choice. Edits send only what changed.
export default function StaffFormDialog({ mode, person, isOwner, onClose, onSaved }) {
  const editing = mode === 'edit'

  const [name, setName] = useState(person?.name ?? '')
  const [username, setUsername] = useState('')
  const [phone, setPhone] = useState(person?.phone ?? '')
  const [role, setRole] = useState(person?.role ?? 'staff')
  const [modules, setModules] = useState(person?.modules ?? [])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  function toggleModule(key) {
    setModules((current) =>
      current.includes(key) ? current.filter((m) => m !== key) : [...current, key]
    )
  }

  function buildPatch() {
    const patch = {}
    if (name.trim() !== person.name) patch.name = name.trim()
    if ((phone.trim() || null) !== (person.phone || null)) patch.phone = phone.trim() || null
    if (role !== person.role) patch.role = role
    // Staff always send their modules when the role changes (a demoted
    // manager must say what they keep) or when the modules themselves change.
    if (role === 'staff' && (role !== person.role || !sameModules(modules, person.modules))) {
      patch.modules = modules
    }
    return patch
  }

  const patch = editing ? buildPatch() : null
  const unchanged = editing && Object.keys(patch).length === 0

  async function handleSubmit(event) {
    event.preventDefault()
    const cleanName = name.trim()
    const cleanUsername = username.trim().toLowerCase()

    if (cleanName.length < 2) return setError('Enter a name of at least 2 characters.')
    if (!editing && !USERNAME_PATTERN.test(cleanUsername)) {
      return setError('Username must be 3-30 characters: letters, numbers, dot, dash or underscore.')
    }
    if (role === 'staff' && modules.length === 0) return setError('Choose at least one module.')

    setBusy(true)
    setError('')
    try {
      if (editing) {
        onSaved(await updateStaff(person.id, patch))
      } else {
        const payload = {
          name: cleanName,
          username: cleanUsername,
          phone: phone.trim() || null,
          role,
        }
        if (role === 'staff') payload.modules = modules
        onSaved(await createStaff(payload))
      }
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <Dialog title={editing ? `Edit ${person.name}` : 'Add a person'} onClose={busy ? () => {} : onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            className={inputClass}
            placeholder="e.g. Amara Okoye"
          />
        </Field>

        {editing ? (
          <div>
            <p className="text-sm font-medium text-[var(--color-ink)]">Username</p>
            <p className="mt-1 font-mono text-sm text-[var(--color-ink-muted)]">{person.username}</p>
          </div>
        ) : (
          <Field label="Username" hint="They sign in with this. Letters, numbers, dot, dash or underscore.">
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
              maxLength={30}
              autoComplete="off"
              className={`${inputClass} font-mono`}
              placeholder="e.g. amara.o"
            />
          </Field>
        )}

        <Field label="Phone (optional)">
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            maxLength={20}
            className={inputClass}
          />
        </Field>

        {isOwner && (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-medium text-[var(--color-ink)]">Access level</legend>
            {[
              { value: 'staff', title: 'Staff', text: 'Only the modules you choose.' },
              {
                value: 'manager',
                title: 'Manager',
                text: 'Every module. Can add and edit staff, but cannot remove anyone.',
              },
            ].map((option) => (
              <label
                key={option.value}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${
                  role === option.value
                    ? 'border-[var(--color-stamp)] bg-[var(--color-stamp)]/10'
                    : 'border-[var(--color-border)]'
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value={option.value}
                  checked={role === option.value}
                  onChange={() => setRole(option.value)}
                  className="mt-1 accent-[var(--color-stamp)]"
                />
                <span>
                  <span className="block text-sm font-medium text-[var(--color-ink)]">{option.title}</span>
                  <span className="block text-xs text-[var(--color-ink-muted)]">{option.text}</span>
                </span>
              </label>
            ))}
          </fieldset>
        )}

        {role === 'staff' && (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-medium text-[var(--color-ink)]">Modules they can use</legend>
            {MODULE_OPTIONS.map((option) => (
              <label
                key={option.key}
                className="flex cursor-pointer items-start gap-3 rounded-lg border border-[var(--color-border)] p-3"
              >
                <input
                  type="checkbox"
                  checked={modules.includes(option.key)}
                  onChange={() => toggleModule(option.key)}
                  className="mt-1 accent-[var(--color-stamp)]"
                />
                <span>
                  <span className="block text-sm font-medium text-[var(--color-ink)]">{option.label}</span>
                  <span className="block text-xs text-[var(--color-ink-muted)]">{option.hint}</span>
                </span>
              </label>
            ))}
          </fieldset>
        )}

        {error && (
          <p role="alert" className="text-sm text-[var(--color-error)]">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={busy} className={secondaryButton}>
            Cancel
          </button>
          <button type="submit" disabled={busy || unchanged} className={primaryButton}>
            {busy && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
            {editing ? 'Save changes' : 'Add and get PIN'}
          </button>
        </div>
      </form>
    </Dialog>
  )
}