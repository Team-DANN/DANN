import { useState } from 'react'

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

// Mock business data — real values arrive once the Business table exists.
const mockBusiness = {
  name: "Leo's Bakery",
  type: 'Bakery',
  timezone: 'Asia/Kolkata',
  currency: 'INR (₹)',
}

export function BusinessProfileSection() {
  const [business, setBusiness] = useState(mockBusiness)

  const update = (key) => (e) => setBusiness((b) => ({ ...b, [key]: e.target.value }))

  return (
    <div className="flex flex-col gap-5">
      <h3 className="font-[Roboto_Slab] text-sm font-semibold text-[var(--color-ink)]">
        Business profile
      </h3>
      <div className="flex flex-col gap-3">
        <Field label="Business name">
          <input className={inputClass} value={business.name} onChange={update('name')} />
        </Field>
        <Field label="Business type">
          <input className={inputClass} value={business.type} onChange={update('type')} />
        </Field>
        <Field label="Timezone">
          <input className={inputClass} value={business.timezone} onChange={update('timezone')} />
        </Field>
        <Field label="Currency">
          <input className={inputClass} value={business.currency} onChange={update('currency')} />
        </Field>
      </div>
    </div>
  )
}