// PATH: src/features/home/setup/SetupIngredientsStep.jsx
import { useState } from 'react'
import { Check, X } from 'lucide-react'
import SetupField, { inputClass } from './SetupField.jsx'

export const MATERIAL_UNITS = ['kg', 'g', 'litre', 'ml', 'units']
const EMPTY_FORM = { name: '', unit: 'kg', stock: '', unitCost: '', qtyPerUnit: '' }

function validate(f) {
  const errs = {}
  if (!f.name.trim()) errs.name = 'Name this ingredient'
  const stock = Number(f.stock)
  if (f.stock === '' || Number.isNaN(stock) || stock < 0) errs.stock = 'Enter how much you have (0 or more)'
  if (f.unitCost !== '' && (Number.isNaN(Number(f.unitCost)) || Number(f.unitCost) < 0)) {
    errs.unitCost = 'Must be 0 or more'
  }
  if (f.qtyPerUnit !== '' && (Number.isNaN(Number(f.qtyPerUnit)) || Number(f.qtyPerUnit) <= 0)) {
    errs.qtyPerUnit = 'Must be more than 0'
  }
  return errs
}

// Unit alone doesn't count — it always has a default value.
function formHasContent(f) {
  return f.name.trim() !== '' || f.stock !== '' || f.unitCost !== '' || f.qtyPerUnit !== ''
}

function makeIngredient(f) {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: f.name.trim(),
    unit: f.unit,
    stock: f.stock,
    unitCost: f.unitCost,
    qtyPerUnit: f.qtyPerUnit,
  }
}

export default function SetupIngredientsStep({
  productName,
  productUnit,
  ingredients,
  onAdd,
  onRemove,
  onSubmit,
  onBack,
  submitting,
  error,
}) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [showErrors, setShowErrors] = useState(false)

  const errs = validate(form)
  const shownErrs = showErrors ? errs : {}
  const hasContent = formHasContent(form)
  const canFinish = ingredients.length > 0 || hasContent

  const set = (patch) => setForm((prev) => ({ ...prev, ...patch }))

  function addAnother() {
    if (Object.keys(errs).length > 0) {
      setShowErrors(true)
      return
    }
    onAdd(makeIngredient(form))
    setForm(EMPTY_FORM)
    setShowErrors(false)
  }

  // Whatever is typed in the form when "Save & continue" is pressed is
  // included — nobody should lose an ingredient by forgetting to press
  // "add another" first.
  function finish() {
    let finalList = ingredients
    if (hasContent) {
      if (Object.keys(errs).length > 0) {
        setShowErrors(true)
        return
      }
      finalList = [...ingredients, makeIngredient(form)]
    }
    onSubmit(finalList)
  }

  return (
    <div className="flex flex-col gap-5 lg:gap-6">
      <div>
        <h2 className="font-sans text-lg font-bold text-[var(--color-ink)] lg:text-2xl">
          What goes into {productName || 'this product'}?
        </h2>
        <p className="mt-1 text-sm text-[var(--color-ink-muted)] lg:text-base">
          You don't have any materials yet. Add each ingredient and how much you have on hand — one at a time.
        </p>
      </div>

      {ingredients.length > 0 && (
        <ul className="flex flex-col gap-2">
          {ingredients.map((ing) => (
            <li
              key={ing.key}
              className="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-paper)] px-4 py-2.5"
            >
              <span className="min-w-0 truncate text-sm text-[var(--color-ink)] lg:text-base">
                <span className="font-medium">{ing.name}</span>{' '}
                <span className="font-mono text-xs text-[var(--color-ink-muted)] lg:text-sm">
                  {ing.stock} {ing.unit}
                  {ing.qtyPerUnit ? ` · ${ing.qtyPerUnit} ${ing.unit} per ${productUnit}` : ''}
                </span>
              </span>
              {ing.createdId ? (
                <span className="flex flex-shrink-0 items-center gap-1 text-xs font-medium text-[var(--color-success)]">
                  <Check size={14} strokeWidth={2.5} /> Saved
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => onRemove(ing.key)}
                  disabled={submitting}
                  aria-label={`Remove ${ing.name}`}
                  className="flex-shrink-0 text-[var(--color-ink-muted)] hover:text-[var(--color-error)] disabled:opacity-40"
                >
                  <X size={16} strokeWidth={2} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-4 rounded-xl border border-dashed border-[var(--color-border)] p-4 lg:p-5">
        <SetupField label="Ingredient name" error={shownErrs.name}>
          <input
            type="text"
            value={form.name}
            onChange={(e) => set({ name: e.target.value })}
            placeholder="e.g. Lemons"
            className={inputClass}
          />
        </SetupField>

        <div className="grid grid-cols-2 gap-4">
          <SetupField label="Stock on hand" error={shownErrs.stock}>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={form.stock}
              onChange={(e) => set({ stock: e.target.value })}
              placeholder="e.g. 20"
              className={inputClass}
            />
          </SetupField>
          <SetupField label="Unit">
            <select value={form.unit} onChange={(e) => set({ unit: e.target.value })} className={inputClass}>
              {MATERIAL_UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </SetupField>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SetupField label={`Cost per ${form.unit}`} optional error={shownErrs.unitCost}>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={form.unitCost}
              onChange={(e) => set({ unitCost: e.target.value })}
              placeholder="e.g. 120"
              className={inputClass}
            />
          </SetupField>
          <SetupField
            label={`Used in each ${productUnit}`}
            optional
            error={shownErrs.qtyPerUnit}
            hint={`How many ${form.unit} go into one ${productUnit}.`}
          >
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={form.qtyPerUnit}
              onChange={(e) => set({ qtyPerUnit: e.target.value })}
              placeholder="e.g. 0.25"
              className={inputClass}
            />
          </SetupField>
        </div>
      </div>

      <p className="text-xs text-[var(--color-ink-muted)] lg:text-sm">
        "Used in each" is what lets DANN work out this product's cost and how long your stock will last. Ingredients
        without it are still saved to Inventory, just not linked to this product.
      </p>

      {error && (
        <p className="rounded-xl border border-[var(--color-error)] px-4 py-3 text-sm text-[var(--color-error)]">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <button
          type="button"
          onClick={onBack}
          disabled={submitting}
          className="text-sm font-medium text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] disabled:opacity-40"
        >
          ← Back
        </button>

        <div className="flex flex-wrap items-center gap-3">
          {!canFinish && (
            <button
              type="button"
              onClick={() => onSubmit([])}
              disabled={submitting}
              className="text-sm font-medium text-[var(--color-ink-muted)] underline hover:text-[var(--color-ink)] disabled:opacity-40"
            >
              Skip ingredients
            </button>
          )}
          <button
            type="button"
            onClick={addAnother}
            disabled={submitting || !hasContent}
            className="rounded-xl border border-[var(--color-border)] px-4 py-3 text-sm font-semibold text-[var(--color-ink)] hover:border-[var(--color-stamp)] disabled:opacity-40 lg:text-base"
          >
            ＋ Save &amp; add another
          </button>
          <button
            type="button"
            onClick={finish}
            disabled={submitting || !canFinish}
            className="rounded-xl bg-[var(--color-stamp)] px-6 py-3 font-sans text-sm font-semibold text-[var(--color-paper-light)] hover:bg-[var(--color-stamp-dark)] disabled:opacity-40 lg:text-base"
          >
            {submitting ? 'Saving…' : 'Save & continue →'}
          </button>
        </div>
      </div>
    </div>
  )
}