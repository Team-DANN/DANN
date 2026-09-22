import { useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, Trash2, Check, Loader2 } from 'lucide-react'

// One-card-at-a-time carousel over the photo-derived queue. 'matched'
// items (OCR found a real product) only need a quantity field — the
// recipe and price already exist on that product. 'new' items need the
// full set (name, category, unit, price, recipe) inline, right here,
// since there's no separate Add Product step in the photo path anymore.
export default function PhotoBatchReview({
  items,
  materials,
  currency,
  onUpdateItem,
  onUpdateRecipeRow,
  onAddRecipeRow,
  onRemoveRecipeRow,
  onUpdateUnmatchedIngredient,
  onConfirm,
  canConfirm,
  submitting,
}) {
  const [index, setIndex] = useState(0)
  const touchStartX = useRef(null)

  const total = items.length
  const item = items[index]

  function goNext() {
    setIndex((i) => Math.min(i + 1, total - 1))
  }
  function goPrev() {
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

  if (!item) return null

  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-[var(--color-ink-muted)] lg:text-base">
          Reviewing {total} product{total === 1 ? '' : 's'} from your photos
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
        <p className="text-xs font-medium text-[var(--color-ink-muted)] lg:text-sm">
          Product {index + 1} of {total}
        </p>

        {item.type === 'matched' ? (
          <>
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-paper)] px-4 py-3 lg:px-6 lg:py-4">
              <span className="font-sans text-base font-semibold text-[var(--color-ink)] lg:text-lg">
                {item.product.name}
              </span>
            </div>

            <label className="flex flex-col gap-1.5 lg:gap-2">
              <span className="text-sm font-medium text-[var(--color-ink)] lg:text-base">Quantity produced</span>
              <input
                type="text"
                inputMode="decimal"
                value={item.quantity}
                onChange={(e) => {
                  const next = e.target.value
                  if (next === '' || /^\d*\.?\d*$/.test(next)) onUpdateItem(index, { quantity: next })
                }}
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] px-4 py-2.5 text-sm text-[var(--color-ink)] focus:border-[var(--color-stamp)] focus:outline-none lg:py-3.5 lg:text-base"
              />
            </label>
          </>
        ) : (
          <>
            <p className="rounded-xl border border-dashed border-[var(--color-border)] px-4 py-2.5 text-xs text-[var(--color-ink-muted)] lg:text-sm">
              Couldn't match this to a product you already have — fill in the rest to add it as new.
            </p>

            <label className="flex flex-col gap-1.5 lg:gap-2">
              <span className="text-sm font-medium text-[var(--color-ink)] lg:text-base">Product name</span>
              <input
                type="text"
                value={item.name}
                onChange={(e) => onUpdateItem(index, { name: e.target.value })}
                placeholder="e.g. Bread Loaf"
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] px-4 py-2.5 text-sm text-[var(--color-ink)] focus:border-[var(--color-stamp)] focus:outline-none lg:py-3.5 lg:text-base"
              />
            </label>

            <div className="grid grid-cols-2 gap-4 lg:gap-5">
              <label className="flex flex-col gap-1.5 lg:gap-2">
                <span className="text-sm font-medium text-[var(--color-ink)] lg:text-base">Quantity produced</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={item.quantity}
                  onChange={(e) => {
                    const next = e.target.value
                    if (next === '' || /^\d*\.?\d*$/.test(next)) onUpdateItem(index, { quantity: next })
                  }}
                  className="rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] px-4 py-2.5 text-sm text-[var(--color-ink)] focus:border-[var(--color-stamp)] focus:outline-none lg:py-3.5 lg:text-base"
                />
              </label>
              <label className="flex flex-col gap-1.5 lg:gap-2">
                <span className="text-sm font-medium text-[var(--color-ink)] lg:text-base">
                  Selling price ({currency})
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={item.sellingPrice}
                  onChange={(e) => onUpdateItem(index, { sellingPrice: e.target.value })}
                  placeholder="0.00"
                  className="rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] px-4 py-2.5 text-sm text-[var(--color-ink)] focus:border-[var(--color-stamp)] focus:outline-none lg:py-3.5 lg:text-base"
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-4 lg:gap-5">
              <label className="flex flex-col gap-1.5 lg:gap-2">
                <span className="text-sm font-medium text-[var(--color-ink)] lg:text-base">Category</span>
                <input
                  type="text"
                  value={item.category}
                  onChange={(e) => onUpdateItem(index, { category: e.target.value })}
                  placeholder="Optional"
                  className="rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] px-4 py-2.5 text-sm text-[var(--color-ink)] focus:border-[var(--color-stamp)] focus:outline-none lg:py-3.5 lg:text-base"
                />
              </label>
              <label className="flex flex-col gap-1.5 lg:gap-2">
                <span className="text-sm font-medium text-[var(--color-ink)] lg:text-base">Unit</span>
                <input
                  type="text"
                  value={item.unit}
                  onChange={(e) => onUpdateItem(index, { unit: e.target.value })}
                  placeholder="piece, kg, box…"
                  className="rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] px-4 py-2.5 text-sm text-[var(--color-ink)] focus:border-[var(--color-stamp)] focus:outline-none lg:py-3.5 lg:text-base"
                />
              </label>
            </div>

            <div>
              <h3 className="mb-2 font-sans text-sm font-semibold text-[var(--color-ink-muted)] lg:mb-3 lg:text-base">
                Recipe (optional)
              </h3>
              <div className="flex flex-col gap-2 lg:gap-3">
                {item.recipeRows.map((row, ri) => (
                  <div key={ri} className="flex items-center gap-2 lg:gap-3">
                    <select
                      value={row.materialId}
                      onChange={(e) => onUpdateRecipeRow(index, ri, 'materialId', e.target.value)}
                      className="flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] px-3 py-2.5 text-sm text-[var(--color-ink)] focus:border-[var(--color-stamp)] focus:outline-none lg:py-3 lg:text-base"
                    >
                      <option value="">Select material</option>
                      {materials.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.unit})
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      value={row.qtyPerUnit}
                      onChange={(e) => onUpdateRecipeRow(index, ri, 'qtyPerUnit', e.target.value)}
                      placeholder="Qty per unit"
                      className="w-28 rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] px-3 py-2.5 text-sm text-[var(--color-ink)] focus:border-[var(--color-stamp)] focus:outline-none lg:w-32 lg:py-3 lg:text-base"
                    />
                    <button
                      type="button"
                      onClick={() => onRemoveRecipeRow(index, ri)}
                      aria-label="Remove ingredient"
                      className="text-[var(--color-ink-muted)] hover:text-[var(--color-error)]"
                    >
                      <Trash2 size={18} strokeWidth={2} className="lg:h-5 lg:w-5" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => onAddRecipeRow(index)}
                  className="flex items-center gap-1.5 self-start text-sm font-medium text-[var(--color-stamp)] lg:text-base"
                >
                  <Plus size={16} strokeWidth={2} className="lg:h-5 lg:w-5" />
                  Add ingredient
                </button>
              </div>
            </div>

            {item.unmatchedIngredients?.length > 0 && (
              <div>
                <h3 className="mb-1 font-sans text-sm font-semibold text-[var(--color-ink-muted)] lg:text-base">
                  Ingredients not in your inventory
                </h3>
                <p className="mb-2 text-xs text-[var(--color-ink-muted)] lg:mb-3 lg:text-sm">
                  Your photo mentioned these, but they don't match anything you've stocked yet. Link
                  each to an existing material, add it as new stock, or skip it.
                </p>
                <div className="flex flex-col gap-3 lg:gap-4">
                  {item.unmatchedIngredients.map((ing, ui) => (
                    <div
                      key={ui}
                      className="flex flex-col gap-2.5 rounded-xl border border-dashed border-[var(--color-border)] p-4 lg:gap-3 lg:p-5"
                    >
                      <p className="text-sm text-[var(--color-ink)] lg:text-base">
                        <span className="font-medium">{ing.candidateName}</span>
                        {' — '}
                        {ing.totalAmount}
                        {ing.detectedUnit ? ` ${ing.detectedUnit}` : ''} used in this batch
                      </p>

                      <select
                        value={ing.decision}
                        onChange={(e) => onUpdateUnmatchedIngredient(index, ui, { decision: e.target.value })}
                        className="rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] px-3 py-2.5 text-sm text-[var(--color-ink)] focus:border-[var(--color-stamp)] focus:outline-none lg:py-3 lg:text-base"
                      >
                        <option value="skip">Skip — leave out of the recipe</option>
                        <option value="link">Match to an existing material</option>
                        <option value="create">Add as a new material</option>
                      </select>

                      {ing.decision === 'link' && (
                        <select
                          value={ing.linkedMaterialId}
                          onChange={(e) => onUpdateUnmatchedIngredient(index, ui, { linkedMaterialId: e.target.value })}
                          className="rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] px-3 py-2.5 text-sm text-[var(--color-ink)] focus:border-[var(--color-stamp)] focus:outline-none lg:py-3 lg:text-base"
                        >
                          <option value="">Select material</option>
                          {materials.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name} ({m.unit})
                            </option>
                          ))}
                        </select>
                      )}

                      {ing.decision === 'create' && (
                        <div className="grid grid-cols-2 gap-2.5 lg:gap-3">
                          <label className="col-span-2 flex flex-col gap-1">
                            <span className="text-xs font-medium text-[var(--color-ink-muted)] lg:text-sm">
                              Material name
                            </span>
                            <input
                              type="text"
                              value={ing.candidateName}
                              onChange={(e) => onUpdateUnmatchedIngredient(index, ui, { candidateName: e.target.value })}
                              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] px-3 py-2 text-sm text-[var(--color-ink)] focus:border-[var(--color-stamp)] focus:outline-none lg:py-2.5 lg:text-base"
                            />
                          </label>
                          <label className="flex flex-col gap-1">
                            <span className="text-xs font-medium text-[var(--color-ink-muted)] lg:text-sm">Unit</span>
                            <input
                              type="text"
                              value={ing.newMaterialUnit}
                              onChange={(e) => onUpdateUnmatchedIngredient(index, ui, { newMaterialUnit: e.target.value })}
                              placeholder="g, kg, ml…"
                              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] px-3 py-2 text-sm text-[var(--color-ink)] focus:border-[var(--color-stamp)] focus:outline-none lg:py-2.5 lg:text-base"
                            />
                          </label>
                          <label className="flex flex-col gap-1">
                            <span className="text-xs font-medium text-[var(--color-ink-muted)] lg:text-sm">
                              Cost per unit ({currency}, optional)
                            </span>
                            <input
                              type="number"
                              inputMode="decimal"
                              min="0"
                              step="0.01"
                              value={ing.newMaterialUnitCost}
                              onChange={(e) => onUpdateUnmatchedIngredient(index, ui, { newMaterialUnitCost: e.target.value })}
                              placeholder="0.00"
                              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] px-3 py-2 text-sm text-[var(--color-ink)] focus:border-[var(--color-stamp)] focus:outline-none lg:py-2.5 lg:text-base"
                            />
                          </label>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={goPrev}
          disabled={index === 0}
          aria-label="Previous product"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--color-border)] text-[var(--color-ink-muted)] disabled:opacity-30 lg:h-12 lg:w-12"
        >
          <ChevronLeft size={20} strokeWidth={2} />
        </button>
        <button
          type="button"
          onClick={goNext}
          disabled={index === total - 1}
          aria-label="Next product"
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
          Finish filling in every product's name, quantity, price, and any ingredient decisions before confirming.
        </p>
      )}
    </div>
  )
}