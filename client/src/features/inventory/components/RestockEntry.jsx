import { useState } from 'react'
import { ArrowLeft, IndianRupee } from 'lucide-react'

// Logs a purchase: qty added, cost, supplier. Real version: this write also
// feeds Finance's cost-of-goods reporting — Inventory owns the action,
// Finance owns the reporting, not a duplicate entry typed twice.
export default function RestockEntry({ material, onBack, onConfirm }) {
  const [qtyAdded, setQtyAdded] = useState('')
  const [cost, setCost] = useState('')
  const [supplier, setSupplier] = useState('')

  const qtyNum = parseFloat(qtyAdded) || 0
  const canSubmit = qtyNum > 0

  function handleSubmit() {
    if (!canSubmit) return
    onConfirm({
      materialId: material.id,
      qtyAdded: qtyNum,
      cost: parseFloat(cost) || 0,
      supplier: supplier.trim(),
      date: new Date().toISOString(),
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

      <div>
        <h2 className="font-sans text-lg font-semibold text-[var(--color-ink)]">Log restock</h2>
        <p className="text-sm text-[var(--color-ink-muted)]">
          {material.name} · currently {material.qtyOnHand} {material.unit}
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-[var(--color-ink-muted)]">
            Quantity added ({material.unit})
          </span>
          <input
            type="text"
            inputMode="decimal"
            value={qtyAdded}
            onChange={(e) => {
              const next = e.target.value
              if (next === '' || /^\d*\.?\d*$/.test(next)) setQtyAdded(next)
            }}
            placeholder="0"
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] px-4 py-3 font-mono text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:border-[var(--color-stamp)] focus:outline-none"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-[var(--color-ink-muted)]">Total cost (optional)</span>
          <div className="relative">
            <IndianRupee
              size={14}
              strokeWidth={2}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)]"
            />
            <input
              type="text"
              inputMode="decimal"
              value={cost}
              onChange={(e) => {
                const next = e.target.value
                if (next === '' || /^\d*\.?\d*$/.test(next)) setCost(next)
              }}
              placeholder="0"
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] py-3 pl-8 pr-4 font-mono text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:border-[var(--color-stamp)] focus:outline-none"
            />
          </div>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-[var(--color-ink-muted)]">Supplier (optional)</span>
          <input
            type="text"
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
            placeholder="e.g. Sharma Wholesale"
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] px-4 py-3 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:border-[var(--color-stamp)] focus:outline-none"
          />
        </label>
      </div>

      <button
        type="button"
        disabled={!canSubmit}
        onClick={handleSubmit}
        className="rounded-xl bg-[var(--color-stamp)] py-4 font-sans text-base font-semibold text-[var(--color-paper-light)] disabled:opacity-40"
      >
        Confirm restock
      </button>
    </div>
  )
}