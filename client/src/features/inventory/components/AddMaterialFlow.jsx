import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'

const UNIT_OPTIONS = ['kg', 'g', 'l', 'ml', 'units']

// Deliberately a single short form, not a wizard — unlike products, a raw
// material doesn't need an AI-suggested recipe, just a name/unit/qty.
export default function AddMaterialFlow({ onBack, onAdd }) {
  const [name, setName] = useState('')
  const [unit, setUnit] = useState('kg')
  const [qtyOnHand, setQtyOnHand] = useState('')

  const canSubmit = name.trim().length > 0 && qtyOnHand !== '' && parseFloat(qtyOnHand) >= 0

  function handleSubmit() {
    if (!canSubmit) return
    onAdd({
      id: name.trim().toLowerCase().replace(/\s+/g, '-'),
      name: name.trim(),
      unit,
      qtyOnHand: parseFloat(qtyOnHand),
      avgDailyConsumption: 0, // no usage history yet — shows "No data" until it's used in production
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

      <h2 className="font-sans text-lg font-semibold text-[var(--color-ink)] lg:text-2xl">Add material</h2>

      <div className="flex flex-col gap-4 lg:gap-5">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-[var(--color-ink-muted)] lg:text-sm">Material name</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Cocoa powder"
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] px-4 py-3 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:border-[var(--color-stamp)] focus:outline-none lg:px-5 lg:py-4 lg:text-base"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-[var(--color-ink-muted)] lg:text-sm">Unit</span>
          <div className="grid grid-cols-5 gap-2 lg:gap-3">
            {UNIT_OPTIONS.map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => setUnit(u)}
                className={`rounded-lg border py-2 text-sm font-medium lg:py-3 lg:text-base ${
                  unit === u
                    ? 'border-[var(--color-stamp)] bg-[var(--color-stamp)] text-[var(--color-paper-light)]'
                    : 'border-[var(--color-border)] text-[var(--color-ink)]'
                }`}
              >
                {u}
              </button>
            ))}
          </div>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-[var(--color-ink-muted)] lg:text-sm">
            Starting quantity on hand
          </span>
          <input
            type="text"
            inputMode="decimal"
            value={qtyOnHand}
            onChange={(e) => {
              const next = e.target.value
              if (next === '' || /^\d*\.?\d*$/.test(next)) setQtyOnHand(next)
            }}
            placeholder="0"
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] px-4 py-3 font-mono text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:border-[var(--color-stamp)] focus:outline-none lg:px-5 lg:py-4 lg:text-base"
          />
        </label>
      </div>

      <button
        type="button"
        disabled={!canSubmit}
        onClick={handleSubmit}
        className="rounded-xl bg-[var(--color-stamp)] py-4 font-sans text-base font-semibold text-[var(--color-paper-light)] disabled:opacity-40 lg:py-5 lg:text-lg"
      >
        Add material
      </button>
    </div>
  )
}