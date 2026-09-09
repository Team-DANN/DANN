import { useState } from 'react'
import { ArrowLeft, IndianRupee } from 'lucide-react'

// Logs a purchase: qty added, cost, supplier. This write now also updates
// the material's real cost basis server-side (weighted average unit_cost)
// — see MaterialService.recordRestock — so the cost entered here actually
// flows through to product cost_per_unit and Finance's profit numbers,
// not just a log entry that goes nowhere.
export default function RestockEntry({ material, onBack, onConfirm, submitting }) {
  const [qtyAdded, setQtyAdded] = useState('')
  const [cost, setCost] = useState('')
  const [supplier, setSupplier] = useState('')

  const qtyNum = parseFloat(qtyAdded) || 0
  const canSubmit = qtyNum > 0 && !submitting

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
    <div className="flex flex-col gap-6 lg:gap-8">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-2 text-sm font-medium text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] lg:gap-2.5 lg:text-base"
      >
        <ArrowLeft size={16} strokeWidth={2} className="lg:h-5 lg:w-5" />
        Back
      </button>

      <div>
        <h2 className="font-sans text-lg font-semibold text-[var(--color-ink)] lg:text-2xl">Log restock</h2>
        <p className="text-sm text-[var(--color-ink-muted)] lg:text-base">
          {material.name} · currently {material.qtyOnHand} {material.unit}
        </p>
      </div>

      <div className="flex flex-col gap-4 lg:gap-5">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-[var(--color-ink-muted)] lg:text-sm">
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
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] px-4 py-3 font-mono text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:border-[var(--color-stamp)] focus:outline-none lg:px-5 lg:py-4 lg:text-lg"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-[var(--color-ink-muted)] lg:text-sm">Total cost (optional)</span>
          <div className="relative">
            <IndianRupee
              size={14}
              strokeWidth={2}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)] lg:left-4 lg:h-4 lg:w-4"
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
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] py-3 pl-8 pr-4 font-mono text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:border-[var(--color-stamp)] focus:outline-none lg:py-4 lg:pl-11 lg:text-base"
            />
          </div>
          <span className="text-xs text-[var(--color-ink-muted)] lg:text-sm">
            Entering a cost updates this material's average cost per {material.unit}, which flows into your product costs and profit numbers.
          </span>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-[var(--color-ink-muted)] lg:text-sm">Supplier (optional)</span>
          <input
            type="text"
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
            placeholder="e.g. Sharma Wholesale"
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
        {submitting ? 'Saving…' : 'Confirm restock'}
      </button>
    </div>
  )
}