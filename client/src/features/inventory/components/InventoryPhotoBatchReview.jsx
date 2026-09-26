import { useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Trash2, Check, Loader2 } from 'lucide-react'

// Same carousel pattern as production's PhotoBatchReview, simplified —
// a material has no recipe to review, just quantity/cost (restock) or
// name/unit/starting-stock/cost/supplier (new material).
export default function InventoryPhotoBatchReview({
  items,
  currency,
  onUpdateItem,
  onRemoveItem,
  onConfirm,
  canConfirm,
  submitting,
}) {
  const [index, setIndex] = useState(0)
  const [confirmRemoveIndex, setConfirmRemoveIndex] = useState(null)
  const touchStartX = useRef(null)

  const total = items.length
  const item = items[index]

  function goNext() {
    setConfirmRemoveIndex(null)
    setIndex((i) => Math.min(i + 1, total - 1))
  }
  function goPrev() {
    setConfirmRemoveIndex(null)
    setIndex((i) => Math.max(i - 1, 0))
  }

  function handleTouchStart(e) {
    touchStartX.current = e.touches[0].clientX
  }
  function handleTouchEnd(e) {
    if (touchStartX.current == null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    touchStartX.current = null
    if (Math.abs(dx) < 50) return
    if (dx < 0) goNext()
    else goPrev()
  }

  function handleRemoveClick() {
    if (confirmRemoveIndex !== index) { setConfirmRemoveIndex(index); return }
    const removingLast = index === total - 1
    onRemoveItem(index)
    setConfirmRemoveIndex(null)
    if (removingLast) setIndex((i) => Math.max(0, i - 1))
  }

  if (!item) return null

  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-[var(--color-ink-muted)] lg:text-base">
          Reviewing {total} material{total === 1 ? '' : 's'} from your photos
        </p>
        <div className="flex items-center gap-1.5">
          {items.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 w-1.5 rounded-full ${i === index ? 'bg-[var(--color-stamp)]' : 'bg-[var(--color-border)]'}`}
            />
          ))}
        </div>
      </div>

      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="flex flex-col gap-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-paper-light)] p-5 lg:gap-6 lg:p-7"
      >
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-[var(--color-ink-muted)] lg:text-sm">
            Material {index + 1} of {total}
          </p>
          <button
            type="button"
            onClick={handleRemoveClick}
            className={`flex items-center gap-1 text-xs font-medium lg:text-sm ${
              confirmRemoveIndex === index ? 'text-[var(--color-error)]' : 'text-[var(--color-ink-muted)] hover:text-[var(--color-error)]'
            }`}
          >
            <Trash2 size={14} strokeWidth={2} className="lg:h-4 lg:w-4" />
            {confirmRemoveIndex === index ? 'Tap again to remove' : 'Remove'}
          </button>
        </div>

        {item.merged && (
          <p className="rounded-xl border border-dashed border-[var(--color-success)] px-4 py-2.5 text-xs text-[var(--color-success)] lg:text-sm">
            Mentioned in more than one photo — combined into one entry, quantities summed.
          </p>
        )}

        {item.type === 'restock' ? (
          <>
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-paper)] px-4 py-3 lg:px-6 lg:py-4">
              <span className="font-sans text-base font-semibold text-[var(--color-ink)] lg:text-lg">
                {item.material.name}
              </span>
              <p className="text-xs text-[var(--color-ink-muted)] lg:text-sm">
                Matched an existing material — this adds to its current stock.
              </p>
            </div>

            <label className="flex flex-col gap-1.5 lg:gap-2">
              <span className="text-sm font-medium text-[var(--color-ink)] lg:text-base">
                Quantity added ({item.material.unit})
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={item.quantityAdded}
                onChange={(e) => {
                  const next = e.target.value
                  if (next === '' || /^\d*\.?\d*$/.test(next)) onUpdateItem(index, { quantityAdded: next })
                }}
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] px-4 py-2.5 text-sm text-[var(--color-ink)] focus:border-[var(--color-stamp)] focus:outline-none lg:py-3.5 lg:text-base"
              />
            </label>

            <label className="flex flex-col gap-1.5 lg:gap-2">
              <span className="text-sm font-medium text-[var(--color-ink)] lg:text-base">
                Total cost ({currency}, optional)
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={item.cost}
                onChange={(e) => {
                  const next = e.target.value
                  if (next === '' || /^\d*\.?\d*$/.test(next)) onUpdateItem(index, { cost: next })
                }}
                placeholder="0.00"
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] px-4 py-2.5 text-sm text-[var(--color-ink)] focus:border-[var(--color-stamp)] focus:outline-none lg:py-3.5 lg:text-base"
              />
            </label>
          </>
        ) : (
          <>
            {item.unrecognized ? (
              <p className="rounded-xl border border-dashed border-[var(--color-error)] px-4 py-2.5 text-xs text-[var(--color-error)] lg:text-sm">
                This photo didn't look like an inventory delivery or stock note — check the details below, fill
                them in yourself, or remove it.
              </p>
            ) : (
              <p className="rounded-xl border border-dashed border-[var(--color-border)] px-4 py-2.5 text-xs text-[var(--color-ink-muted)] lg:text-sm">
                Couldn't match this to a material you already have — fill in the rest to add it as new.
              </p>
            )}

            <label className="flex flex-col gap-1.5 lg:gap-2">
              <span className="text-sm font-medium text-[var(--color-ink)] lg:text-base">Material name</span>
              <input
                type="text"
                value={item.name}
                onChange={(e) => onUpdateItem(index, { name: e.target.value })}
                placeholder="e.g. Cocoa powder"
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] px-4 py-2.5 text-sm text-[var(--color-ink)] focus:border-[var(--color-stamp)] focus:outline-none lg:py-3.5 lg:text-base"
              />
            </label>

            <div className="grid grid-cols-2 gap-4 lg:gap-5">
              <label className="flex flex-col gap-1.5 lg:gap-2">
                <span className="text-sm font-medium text-[var(--color-ink)] lg:text-base">Unit</span>
                <input
                  type="text"
                  value={item.unit}
                  onChange={(e) => onUpdateItem(index, { unit: e.target.value })}
                  placeholder="kg, g, l, ml, units…"
                  className="rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] px-4 py-2.5 text-sm text-[var(--color-ink)] focus:border-[var(--color-stamp)] focus:outline-none lg:py-3.5 lg:text-base"
                />
              </label>
              <label className="flex flex-col gap-1.5 lg:gap-2">
                <span className="text-sm font-medium text-[var(--color-ink)] lg:text-base">Starting quantity</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={item.startingStock}
                  onChange={(e) => {
                    const next = e.target.value
                    if (next === '' || /^\d*\.?\d*$/.test(next)) onUpdateItem(index, { startingStock: next })
                  }}
                  className="rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] px-4 py-2.5 text-sm text-[var(--color-ink)] focus:border-[var(--color-stamp)] focus:outline-none lg:py-3.5 lg:text-base"
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-4 lg:gap-5">
              <label className="flex flex-col gap-1.5 lg:gap-2">
                <span className="text-sm font-medium text-[var(--color-ink)] lg:text-base">
                  Cost per unit ({currency}, optional)
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={item.unitCost}
                  onChange={(e) => onUpdateItem(index, { unitCost: e.target.value })}
                  placeholder="0.00"
                  className="rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] px-4 py-2.5 text-sm text-[var(--color-ink)] focus:border-[var(--color-stamp)] focus:outline-none lg:py-3.5 lg:text-base"
                />
              </label>
              <label className="flex flex-col gap-1.5 lg:gap-2">
                <span className="text-sm font-medium text-[var(--color-ink)] lg:text-base">Supplier (optional)</span>
                <input
                  type="text"
                  value={item.supplierName}
                  onChange={(e) => onUpdateItem(index, { supplierName: e.target.value })}
                  placeholder="e.g. Apex Grains"
                  className="rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] px-4 py-2.5 text-sm text-[var(--color-ink)] focus:border-[var(--color-stamp)] focus:outline-none lg:py-3.5 lg:text-base"
                />
              </label>
            </div>
          </>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={goPrev}
          disabled={index === 0}
          aria-label="Previous material"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--color-border)] text-[var(--color-ink-muted)] disabled:opacity-30 lg:h-12 lg:w-12"
        >
          <ChevronLeft size={20} strokeWidth={2} />
        </button>
        <button
          type="button"
          onClick={goNext}
          disabled={index === total - 1}
          aria-label="Next material"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--color-border)] text-[var(--color-ink-muted)] disabled:opacity-30 lg:h-12 lg:w-12"
        >
          <ChevronRight size={20} strokeWidth={2} />
        </button>
      </div>

      <button
        type="button"
        disabled={!canConfirm || submitting}
        onClick={onConfirm}
        className="flex items-center justify-center gap-2 rounded-xl bg-[var(--color-stamp)] py-4 font-sans text-base font-semibold text-[var(--color-paper-light)] disabled:opacity-40 lg:gap-3 lg:py-5 lg:text-lg"
      >
        {submitting ? <Loader2 size={20} strokeWidth={2} className="animate-spin" /> : <Check size={20} strokeWidth={2} />}
        Confirm all {total}
      </button>
      {!canConfirm && !submitting && (
        <p className="text-center text-xs text-[var(--color-error)] lg:text-sm">
          Finish filling in every material's name, unit, and quantity before confirming.
        </p>
      )}
    </div>
  )
}