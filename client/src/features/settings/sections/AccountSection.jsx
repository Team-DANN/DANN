import { useState } from 'react'
import { mockUser } from '../../../lib/mockData.js'

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-[var(--color-ink-muted)]">{label}</label>
      {children}
    </div>
  )
}

const inputClass =
  'rounded-md border border-[var(--color-border)] bg-[var(--color-paper-light)] px-3 py-2.5 text-sm text-[var(--color-ink)] shadow-sm outline-none focus:border-[var(--color-verdigris-dark)] focus:ring-1 focus:ring-[var(--color-verdigris-dark)]'

export function AccountSection() {
  const [name, setName] = useState(mockUser.name)
  const [email, setEmail] = useState(mockUser.email)

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h3 className="mb-3 font-[Roboto_Slab] text-sm font-semibold text-[var(--color-ink)]">
          Account
        </h3>
        <div className="flex flex-col gap-3">
          <Field label="Name">
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Email">
            <input className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
        </div>
      </div>

      <div>
        <h3 className="mb-3 font-[Roboto_Slab] text-sm font-semibold text-[var(--color-ink)]">
          Password
        </h3>
        <button
          type="button"
          className="rounded-md border border-[var(--color-border)] bg-[var(--color-paper-light)] px-3 py-2 text-sm font-medium text-[var(--color-ink)] shadow-sm hover:bg-[var(--color-paper)]"
        >
          Change password
        </button>
      </div>
    </div>
  )
}