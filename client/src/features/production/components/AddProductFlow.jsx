import { useEffect, useState } from 'react'
import { ArrowLeft, Plus, Trash2, Loader2 } from 'lucide-react'
import { getMaterials } from '../../../lib/api/inventory.js'
import { createProduct } from '../../../lib/api/production.js'

// Real add-product form. Replaces the old vertical-picker + AI-suggestion
// mock entirely — there's no backend/agents endpoint for AI suggestions yet
// (see productionMock.js note), so this is a straightforward manual form
// instead of pretending to suggest anything.
//
// Recipe is entered here and sent in the SAME create call
// (createProductSchema on the backend accepts an optional `recipe` array on
// POST /api/products) — so we don't need a GET-recipe route to show it back
// immediately after creating; we already have it in local state.
export default function AddProductFlow({ onBack, onAdd }) {
  const [materials, setMaterials] = useState([])
  const [materialsLoading, setMaterialsLoading] = useState(true)
  const [materialsError, setMaterialsError] = useState(null)

  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [unit, setUnit] = useState('piece')
  const [sellingPrice, setSellingPrice] = useState('')
  const [recipeRows, setRecipeRows] = useState([{ materialId: '', qtyPerUnit: '' }])

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setMaterialsLoading(true)
    getMaterials()
      .then((data) => {
        if (cancelled) return
        setMaterials(data ?? [])
        setMaterialsError(null)
      })
      .catch((err) => {
        if (cancelled) return
        setMaterialsError(err.message || 'Failed to load materials')
      })
      .finally(() => {
        if (!cancelled) setMaterialsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  function updateRow(index, field, value) {
    setRecipeRows((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)))
  }

  function addRow() {
    setRecipeRows((prev) => [...prev, { materialId: '', qtyPerUnit: '' }])
  }

  function removeRow(index) {
    setRecipeRows((prev) => prev.filter((_, i) => i !== index))
  }

  const canSubmit =
    name.trim().length > 0 &&
    sellingPrice !== '' &&
    Number(sellingPrice) >= 0 &&
    !submitting

  async function handleSubmit(e) {
    e.preventDefault()
    if (!canSubmit) return

    setSubmitting(true)
    setSubmitError(null)

    const recipe = recipeRows
      .filter((r) => r.materialId && r.qtyPerUnit !== '')
      .map((r) => ({
        material_id: r.materialId,
        quantity_per_unit: Number(r.qtyPerUnit),
      }))

    try {
      const product = await createProduct({
        name: name.trim(),
        category: category.trim() || undefined,
        unit,
        selling_price: Number(sellingPrice),
        recipe: recipe.length > 0 ? recipe : undefined,
      })
      onAdd(product)
    } catch (err) {
      setSubmitError(err.message || 'Failed to create product')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 lg:gap-8">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-2 text-sm font-medium text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] lg:gap-2.5 lg:text-base"
      >
        <ArrowLeft size={16} strokeWidth={2} className="lg:h-5 lg:w-5" />
        Back
      </button>

      <h2 className="font-sans text-lg font-semibold text-[var(--color-ink)] lg:text-2xl">
        Add a product
      </h2>

      <div className="flex flex-col gap-4 lg:gap-5">
        <label className="flex flex-col gap-1.5 lg:gap-2">
          <span className="text-sm font-medium text-[var(--color-ink)] lg:text-base">Product name</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Bread Loaf"
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] px-4 py-2.5 text-sm text-[var(--color-ink)] focus:border-[var(--color-stamp)] focus:outline-none lg:py-3.5 lg:text-base"
            required
          />
        </label>

        <div className="grid grid-cols-2 gap-4 lg:gap-5">
          <label className="flex flex-col gap-1.5 lg:gap-2">
            <span className="text-sm font-medium text-[var(--color-ink)] lg:text-base">Category</span>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Optional"
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] px-4 py-2.5 text-sm text-[var(--color-ink)] focus:border-[var(--color-stamp)] focus:outline-none lg:py-3.5 lg:text-base"
            />
          </label>

          <label className="flex flex-col gap-1.5 lg:gap-2">
            <span className="text-sm font-medium text-[var(--color-ink)] lg:text-base">Unit</span>
            <input
              type="text"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="piece, kg, box…"
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] px-4 py-2.5 text-sm text-[var(--color-ink)] focus:border-[var(--color-stamp)] focus:outline-none lg:py-3.5 lg:text-base"
            />
          </label>
        </div>

        <label className="flex flex-col gap-1.5 lg:gap-2">
          <span className="text-sm font-medium text-[var(--color-ink)] lg:text-base">Selling price (₹)</span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={sellingPrice}
            onChange={(e) => setSellingPrice(e.target.value)}
            placeholder="0.00"
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] px-4 py-2.5 text-sm text-[var(--color-ink)] focus:border-[var(--color-stamp)] focus:outline-none lg:py-3.5 lg:text-base"
            required
          />
        </label>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between lg:mb-3">
          <h3 className="font-sans text-sm font-semibold text-[var(--color-ink-muted)] lg:text-base">
            Recipe (optional)
          </h3>
          <span className="text-xs text-[var(--color-ink-muted)] lg:text-sm">
            Skip this and add it later from Settings if you're not sure yet
          </span>
        </div>

        {materialsLoading ? (
          <div className="flex items-center gap-2 py-4 text-sm text-[var(--color-ink-muted)] lg:text-base">
            <Loader2 size={16} strokeWidth={2} className="animate-spin" />
            Loading materials…
          </div>
        ) : materialsError ? (
          <p className="text-sm text-[var(--color-error)] lg:text-base">
            Couldn't load materials — you can still create the product without a recipe.
          </p>
        ) : materials.length === 0 ? (
          <p className="text-sm text-[var(--color-ink-muted)] lg:text-base">
            No materials on file yet — add some in Inventory first if you want a recipe here.
          </p>
        ) : (
          <div className="flex flex-col gap-2 lg:gap-3">
            {recipeRows.map((row, i) => (
              <div key={i} className="flex items-center gap-2 lg:gap-3">
                <select
                  value={row.materialId}
                  onChange={(e) => updateRow(i, 'materialId', e.target.value)}
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
                  onChange={(e) => updateRow(i, 'qtyPerUnit', e.target.value)}
                  placeholder="Qty per unit"
                  className="w-28 rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] px-3 py-2.5 text-sm text-[var(--color-ink)] focus:border-[var(--color-stamp)] focus:outline-none lg:w-32 lg:py-3 lg:text-base"
                />
                <button
                  type="button"
                  onClick={() => removeRow(i)}
                  aria-label="Remove ingredient"
                  className="text-[var(--color-ink-muted)] hover:text-[var(--color-error)]"
                >
                  <Trash2 size={18} strokeWidth={2} className="lg:h-5 lg:w-5" />
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={addRow}
              className="flex items-center gap-1.5 self-start text-sm font-medium text-[var(--color-stamp)] lg:text-base"
            >
              <Plus size={16} strokeWidth={2} className="lg:h-5 lg:w-5" />
              Add ingredient
            </button>
          </div>
        )}
      </div>

      {submitError && (
        <p className="text-sm text-[var(--color-error)] lg:text-base">{submitError}</p>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className="flex items-center justify-center gap-2 rounded-xl bg-[var(--color-stamp)] py-4 font-sans text-base font-semibold text-[var(--color-paper-light)] hover:bg-[var(--color-stamp-dark)] disabled:opacity-50 lg:gap-3 lg:py-5 lg:text-lg"
      >
        {submitting ? (
          <>
            <Loader2 size={20} strokeWidth={2} className="animate-spin lg:h-6 lg:w-6" />
            Saving…
          </>
        ) : (
          'Save product'
        )}
      </button>
    </form>
  )
}