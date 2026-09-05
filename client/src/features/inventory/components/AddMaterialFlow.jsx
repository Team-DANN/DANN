import { useState } from 'react'
import { ArrowLeft, Loader2 } from 'lucide-react'

const UNIT_OPTIONS = ['kg', 'g', 'l', 'ml', 'units']

// Real form now — no more client-only fake object. Collects the payload
// and hands it to the parent (InventoryPage), which makes the single real
// POST /api/materials call and refetches. Same convention as
// AddRetailerFlow/AddProductFlow.
//
// reorder_threshold is now collected — previously missing entirely, which
// meant every material silently defaulted to threshold 0 on the backend
// and could never trigger a low-stock alert (AlertService.syncMaterialStockAlert
// compares current_stock <= reorder_threshold) no matter how depleted it got.
export default function AddMaterialFlow({ onBack, onAdd }) {
  const [name, setName] = useState('')
  const [unit, setUnit] = useState('kg')
  const [currentStock, setCurrentStock] = useState('')
  const [reorderThreshold, setReorderThreshold] = useState('')
  const [unitCost, setUnitCost] = useState('')
  const [supplierName, setSupplierName] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  const canSubmit =
    name.trim().length > 0 &&
    currentStock !== '' &&
    parseFloat(currentStock) >= 0 &&
    !submitting

  async function handleSubmit() {
    if (!canSubmit) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      await onAdd({
        name: name.trim(),
        unit,
        current_stock: parseFloat(currentStock) || 0,
        reorder_threshold: reorderThreshold !== '' ? parseFloat(reorderThreshold) : 0,
        unit_cost: unitCost !== '' ? parseFloat(unitCost) : 0,
        supplier_name: supplierName.trim() || undefined,
      })
    } catch (err) {
      setSubmitError(err.message || 'Failed to add material')
      setSubmitting(false)
    }
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
            value={currentStock}
            onChange={(e) => {
              const next = e.target.value
              if (next === '' || /^\d*\.?\d*$/.test(next)) setCurrentStock(next)
            }}
            placeholder="0"
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] px-4 py-3 font-mono text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:border-[var(--color-stamp)] focus:outline-none lg:px-5 lg:py-4 lg:text-base"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-[var(--color-ink-muted)] lg:text-sm">
            Low-stock alert threshold
          </span>
          <input
            type="text"
            inputMode="decimal"
            value={reorderThreshold}
            onChange={(e) => {
              const next = e.target.value
              if (next === '' || /^\d*\.?\d*$/.test(next)) setReorderThreshold(next)
            }}
            placeholder="e.g. 5 — alert fires at or below this"
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] px-4 py-3 font-mono text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:border-[var(--color-stamp)] focus:outline-none lg:px-5 lg:py-4 lg:text-base"
          />
          <span className="text-xs text-[var(--color-ink-muted)] lg:text-sm">
            Leave at 0 to skip low-stock alerts for this material.
          </span>
        </label>

        <div className="grid grid-cols-2 gap-4 lg:gap-5">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-[var(--color-ink-muted)] lg:text-sm">
              Cost per unit (₹, optional)
            </span>
            <input
              type="text"
              inputMode="decimal"
              value={unitCost}
              onChange={(e) => {
                const next = e.target.value
                if (next === '' || /^\d*\.?\d*$/.test(next)) setUnitCost(next)
              }}
              placeholder="0.00"
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] px-4 py-3 font-mono text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:border-[var(--color-stamp)] focus:outline-none lg:px-5 lg:py-4 lg:text-base"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-[var(--color-ink-muted)] lg:text-sm">
              Supplier (optional)
            </span>
            <input
              type="text"
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              placeholder="e.g. Apex Grains"
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] px-4 py-3 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:border-[var(--color-stamp)] focus:outline-none lg:px-5 lg:py-4 lg:text-base"
            />
          </label>
        </div>
      </div>

      {submitError && <p className="text-sm text-[var(--color-error)] lg:text-base">{submitError}</p>}

      <button
        type="button"
        disabled={!canSubmit}
        onClick={handleSubmit}
        className="flex items-center justify-center gap-2 rounded-xl bg-[var(--color-stamp)] py-4 font-sans text-base font-semibold text-[var(--color-paper-light)] disabled:opacity-40 lg:gap-3 lg:py-5 lg:text-lg"
      >
        {submitting ? <Loader2 size={20} strokeWidth={2} className="animate-spin" /> : 'Add material'}
      </button>
    </div>
  )
}