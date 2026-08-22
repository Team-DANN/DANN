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
    <div className="flex flex-col gap-6">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-2 text-sm font-medium text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
      >
        <ArrowLeft size={16} strokeWidth={2} />
        Back
      </button>

      <h2 className="font-sans text-lg font-semibold text-[var(--color-ink)]">Add material</h2>

      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-[var(--color-ink-muted)]">Material name</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Cocoa powder"
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] px-4 py-3 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:border-[var(--color-stamp)] focus:outline-none"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-[var(--color-ink-muted)]">Unit</span>
          <div className="grid grid-cols-5 gap-2">
            {UNIT_OPTIONS.map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => setUnit(u)}
                className={`rounded-lg border py-2 text-sm font-medium ${
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
          <span className="text-xs font-medium text-[var(--color-ink-muted)]">
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
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] px-4 py-3 font-mono text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:border-[var(--color-stamp)] focus:outline-none"
          />
        </label>
      </div>

      <button
        type="button"
        disabled={!canSubmit}
        onClick={handleSubmit}
        className="rounded-xl bg-[var(--color-stamp)] py-4 font-sans text-base font-semibold text-[var(--color-paper-light)] disabled:opacity-40"
      >
        Add material
      </button>
    </div>
  )
}