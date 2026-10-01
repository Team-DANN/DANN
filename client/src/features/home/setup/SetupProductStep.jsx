// PATH: src/features/home/setup/SetupProductStep.jsx
import { useState } from 'react'
import SetupField, { inputClass } from './SetupField.jsx'

export const PRODUCT_UNITS = ['piece', 'kg', 'g', 'litre', 'ml', 'box']

export default function SetupProductStep({ draft, onChange, onNext, onBack, currency }) {
  const [showErrors, setShowErrors] = useState(false)

  const price = Number(draft.sellingPrice)
  const errors = {
    name: draft.name.trim() ? null : 'Give your product a name',
    price:
      draft.sellingPrice === '' || Number.isNaN(price) || price < 0
        ? 'Enter a selling price (0 or more)'
        : null,
  }

  function handleNext() {
    if (errors.name || errors.price) {
      setShowErrors(true)
      return
    }
    onNext()
  }

  return (
    <div className="flex flex-col gap-5 lg:gap-6">
      <div>
        <h2 className="font-sans text-lg font-bold text-[var(--color-ink)] lg:text-2xl">
          What's the first product you make?
        </h2>
        <p className="mt-1 text-sm text-[var(--color-ink-muted)] lg:text-base">
          Just the basics — you can add photos and more products later.
        </p>
      </div>

      <SetupField label="Product name" error={showErrors ? errors.name : null}>
        <input
          type="text"
          autoFocus
          value={draft.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="e.g. Charred Lemon Marmalade"
          className={inputClass}
        />
      </SetupField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SetupField label="Sold per">
          <select value={draft.unit} onChange={(e) => onChange({ unit: e.target.value })} className={inputClass}>
            {PRODUCT_UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </SetupField>

        <SetupField label={`Selling price per ${draft.unit} (${currency})`} error={showErrors ? errors.price : null}>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={draft.sellingPrice}
            onChange={(e) => onChange({ sellingPrice: e.target.value })}
            placeholder="0.00"
            className={inputClass}
          />
        </SetupField>
      </div>

      <SetupField label="Category" optional>
        <input
          type="text"
          value={draft.category}
          onChange={(e) => onChange({ category: e.target.value })}
          placeholder="e.g. Preserves"
          className={inputClass}
        />
      </SetupField>

      <div className="flex items-center justify-between gap-3 pt-1">
        <button
          type="button"
          onClick={onBack}
          className="text-sm font-medium text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={handleNext}
          className="rounded-xl bg-[var(--color-stamp)] px-6 py-3 font-sans text-sm font-semibold text-[var(--color-paper-light)] hover:bg-[var(--color-stamp-dark)] lg:text-base"
        >
          Continue →
        </button>
      </div>
    </div>
  )
}