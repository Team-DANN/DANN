import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { updateBatch } from '../../../lib/api/production.js'

const DECIMAL = /^\d*\.?\d*$/
const EPSILON = 0.00005
const round4 = (n) => Math.round(n * 10000) / 10000

const inputClass =
  'w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] px-3 py-2 text-sm text-[var(--color-ink)] focus:border-[var(--color-stamp)] focus:outline-none'

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-[var(--color-ink-muted)]">{label}</span>
      {children}
    </label>
  )
}

export default function BatchEditForm({ batch, currency, onCancel, onSaved }) {
  const lines = batch.material_usage_details || []
  const oldQty = Number(batch.quantity_produced)
  const oldLabor = Number(batch.labor_cost) || 0
  const oldMaterialCost = Number(batch.total_material_cost) || 0

  const [quantity, setQuantity] = useState(String(oldQty))
  const [labor, setLabor] = useState(String(oldLabor))
  const [manualCost, setManualCost] = useState(String(oldMaterialCost))
  const [typed, setTyped] = useState({}) // material_id -> text the person typed
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const qtyNum = parseFloat(quantity)
  const laborNum = parseFloat(labor)
  const manualNum = parseFloat(manualCost)
  const scale = qtyNum > 0 && oldQty > 0 ? qtyNum / oldQty : 1

  // An untouched line follows the quantity; a typed one stays as typed.
  const amountFor = (line) =>
    line.material_id in typed ? typed[line.material_id] : String(round4(Number(line.quantity_used) * scale))

  const patch = {}
  if (qtyNum > 0 && Math.abs(qtyNum - oldQty) >= EPSILON) patch.quantity_produced = qtyNum
  if (laborNum >= 0 && Math.abs(laborNum - oldLabor) >= EPSILON) patch.labor_cost = laborNum
  if (lines.length > 0 && Object.keys(typed).length > 0) {
    patch.materials = lines.map((l) => ({
      material_id: l.material_id,
      quantity_used: parseFloat(amountFor(l)) || 0,
    }))
  }
  if (lines.length === 0 && manualNum >= 0 && Math.abs(manualNum - oldMaterialCost) >= EPSILON) {
    patch.manual_material_cost = manualNum
  }

  const invalid =
    !(qtyNum > 0) ||
    !(laborNum >= 0) ||
    (lines.length === 0 ? !(manualNum >= 0) : lines.some((l) => !(parseFloat(amountFor(l)) >= 0)))
  const canSave = !busy && !invalid && Object.keys(patch).length > 0

  const estimatedMaterialCost = lines.reduce(
    (sum, l) => sum + (parseFloat(amountFor(l)) || 0) * Number(l.cost_per_unit_snapshot),
    0
  )

  function setDecimal(setter) {
    return (event) => {
      const next = event.target.value
      if (next === '' || DECIMAL.test(next)) setter(next)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!canSave) return
    setBusy(true)
    setError('')
    try {
      onSaved(await updateBatch(batch.id, patch))
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] p-4 lg:p-6">
      <p className="font-sans text-base font-semibold text-[var(--color-ink)]">Edit {batch.product_name}</p>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Quantity produced">
          <input type="text" inputMode="decimal" value={quantity} onChange={setDecimal(setQuantity)} className={inputClass} />
        </Field>
        <Field label={`Labor cost (${currency})`}>
          <input type="text" inputMode="decimal" value={labor} onChange={setDecimal(setLabor)} className={inputClass} />
        </Field>
      </div>

      {lines.length > 0 ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-[var(--color-ink)]">Actual amount of each ingredient</p>
          {lines.map((line) => (
            <div key={line.material_id} className="flex items-center gap-3">
              <span className="min-w-0 flex-1 truncate text-sm text-[var(--color-ink)]">{line.material_name}</span>
              <input
                type="text"
                inputMode="decimal"
                value={amountFor(line)}
                onChange={(e) => {
                  const next = e.target.value
                  if (next === '' || DECIMAL.test(next)) setTyped((prev) => ({ ...prev, [line.material_id]: next }))
                }}
                aria-label={`${line.material_name} amount`}
                className={`${inputClass} w-28`}
              />
              <span className="w-10 text-xs text-[var(--color-ink-muted)]">{line.material_unit}</span>
            </div>
          ))}
          <p className="text-xs text-[var(--color-ink-muted)]">
            Enter 0 to take an ingredient out. Stock moves by the difference only. If a change needs more than you
            have in stock, it is refused.
          </p>
          <p className="text-xs text-[var(--color-ink-muted)]">
            Material cost after this edit: {currency}
            {round4(estimatedMaterialCost)} (earlier prices are kept for unchanged lines).
          </p>
        </div>
      ) : (
        <Field label={`Material cost (${currency})`}>
          <input type="text" inputMode="decimal" value={manualCost} onChange={setDecimal(setManualCost)} className={inputClass} />
        </Field>
      )}

      {error && (
        <p role="alert" className="text-sm text-[var(--color-error)]">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="flex-1 rounded-xl border border-[var(--color-border)] py-3 font-sans text-sm font-semibold text-[var(--color-ink)] disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!canSave}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--color-stamp)] py-3 font-sans text-sm font-semibold text-[var(--color-paper-light)] disabled:opacity-40"
        >
          {busy && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
          Save changes
        </button>
      </div>
    </form>
  )
}