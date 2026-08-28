import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'

// Single short form — same weight as AddMaterialFlow, not a wizard.
export default function AddRetailerFlow({ onBack, onAdd }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')

  const canSubmit = name.trim().length > 0

  function handleSubmit() {
    if (!canSubmit) return
    onAdd({
      id: name.trim().toLowerCase().replace(/\s+/g, '-'),
      name: name.trim(),
      phone: phone.trim(),
    })
  }

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-2 text-sm font-medium text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] lg:gap-2.5 lg:text-base"
      >
        <ArrowLeft size={16} strokeWidth={2} className="lg:h-5 lg:w-5" />
        Back
      </button>

      <h2 className="font-sans text-lg font-semibold text-[var(--color-ink)] lg:text-2xl">Add retailer</h2>

      <div className="flex flex-col gap-4 lg:gap-5">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-[var(--color-ink-muted)] lg:text-sm">Retailer name</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Sharma Stores"
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] px-4 py-3 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:border-[var(--color-stamp)] focus:outline-none lg:px-5 lg:py-4 lg:text-base"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-[var(--color-ink-muted)] lg:text-sm">
            Phone (optional)
          </span>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="e.g. 9876543210"
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] px-4 py-3 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:border-[var(--color-stamp)] focus:outline-none lg:px-5 lg:py-4 lg:text-base"
          />
        </label>
      </div>

      <button
        type="button"
        disabled={!canSubmit}
        onClick={handleSubmit}
        className="rounded-xl bg-[var(--color-stamp)] py-4 font-sans text-base font-semibold text-[var(--color-paper-light)] disabled:opacity-40 lg:py-5 lg:text-lg"
      >
        Add retailer
      </button>
    </div>
  )
}