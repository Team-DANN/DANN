import { useCallback, useEffect, useState } from 'react'
import { Loader2, Pencil, Undo2 } from 'lucide-react'
import { useAuth } from '../../../context/AuthContext.jsx'
import { getBatch, getBatchHistory, undoBatch } from '../../../lib/api/production.js'
import BatchEditForm from './BatchEditForm.jsx'

const round4 = (n) => Math.round(Number(n) * 10000) / 10000
const formatNumber = (n) => String(round4(n))

function formatWhen(value) {
  return new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
}

// Turns one history entry (before/after snapshots) into short readable lines.
function describeChanges(entry, names, currency) {
  const before = entry.before_data || {}
  const after = entry.after_data || {}
  const lines = []

  if (round4(before.quantity_produced) !== round4(after.quantity_produced)) {
    lines.push(`Quantity: ${formatNumber(before.quantity_produced)} → ${formatNumber(after.quantity_produced)}`)
  }
  if (round4(before.labor_cost) !== round4(after.labor_cost)) {
    lines.push(`Labor cost: ${currency}${formatNumber(before.labor_cost)} → ${currency}${formatNumber(after.labor_cost)}`)
  }
  if (round4(before.total_material_cost) !== round4(after.total_material_cost)) {
    lines.push(
      `Material cost: ${currency}${formatNumber(before.total_material_cost)} → ${currency}${formatNumber(after.total_material_cost)}`
    )
  }

  const beforeUsed = new Map((before.materials || []).map((m) => [m.material_id, m.quantity_used]))
  const afterUsed = new Map((after.materials || []).map((m) => [m.material_id, m.quantity_used]))
  for (const id of new Set([...beforeUsed.keys(), ...afterUsed.keys()])) {
    const b = beforeUsed.get(id) ?? 0
    const a = afterUsed.get(id) ?? 0
    if (round4(b) !== round4(a)) {
      lines.push(`${names.get(id) || 'An ingredient'}: ${formatNumber(b)} → ${formatNumber(a)}`)
    }
  }
  return lines
}

// onChanged: stock, costs or alerts moved (refresh what the page shows).
// onUndone:  the batch no longer exists (go back to the list).
export default function BatchDetail({ batchId, onChanged, onUndone }) {
  const { user } = useAuth()
  const currency = user?.currency || '₹'

  const [batch, setBatch] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)
  const [confirmingUndo, setConfirmingUndo] = useState(false)
  const [undoing, setUndoing] = useState(false)
  const [actionError, setActionError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    try {
      setError('')
      const [b, h] = await Promise.all([getBatch(batchId), getBatchHistory(batchId)])
      setBatch(b)
      setHistory(h)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [batchId])

  useEffect(() => {
    load()
  }, [load])

  async function handleSaved(updated) {
    setBatch(updated)
    setEditing(false)
    setNotice('Saved. Stock and costs were adjusted.')
    onChanged()
    try {
      setHistory(await getBatchHistory(batchId))
    } catch {
      // The edit itself worked; the history list will refresh next time.
    }
  }

  async function handleUndo() {
    setUndoing(true)
    setActionError('')
    try {
      await undoBatch(batchId)
      onUndone()
    } catch (err) {
      setActionError(err.message)
      setConfirmingUndo(false)
      setUndoing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-sm text-[var(--color-ink-muted)] lg:text-base">
        <Loader2 size={18} strokeWidth={2} className="animate-spin" />
        Loading batch…
      </div>
    )
  }

  if (error || !batch) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-[var(--color-error)] bg-[var(--color-paper-light)] px-4 py-3 text-sm text-[var(--color-error)]">
        <span>Couldn't load this batch. {error}</span>
        <button type="button" onClick={load} className="font-semibold underline">
          Retry
        </button>
      </div>
    )
  }

  const lines = batch.material_usage_details || []
  const names = new Map(lines.map((l) => [l.material_id, l.material_name]))
  const labor = Number(batch.labor_cost) || 0
  const materialCost = Number(batch.total_material_cost) || 0

  return (
    <div className="flex flex-col gap-5 lg:gap-6">
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] p-4 lg:p-6">
        <p className="font-sans text-lg font-semibold text-[var(--color-ink)] lg:text-xl">
          {batch.product_name}{' '}
          <span className="font-normal text-[var(--color-ink-muted)]">× {formatNumber(batch.quantity_produced)}</span>
        </p>
        <p className="mt-1 text-xs text-[var(--color-ink-muted)] lg:text-sm">
          {formatWhen(batch.produced_at)}
          {batch.logged_by_name ? ` · logged by ${batch.logged_by_name}` : ''}
          {batch.edit_count > 0 ? ` · edited ${batch.edit_count} time${batch.edit_count === 1 ? '' : 's'}` : ''}
        </p>

        <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
          <div>
            <dt className="text-xs text-[var(--color-ink-muted)]">Materials</dt>
            <dd className="font-semibold text-[var(--color-ink)]">{currency}{formatNumber(materialCost)}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--color-ink-muted)]">Labor</dt>
            <dd className="font-semibold text-[var(--color-ink)]">{currency}{formatNumber(labor)}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--color-ink-muted)]">Total cost</dt>
            <dd className="font-semibold text-[var(--color-ink)]">{currency}{formatNumber(materialCost + labor)}</dd>
          </div>
        </dl>

        {lines.length > 0 && (
          <ul className="mt-4 flex flex-col gap-1 border-t border-[var(--color-border)] pt-3">
            {lines.map((line) => (
              <li key={line.usage_id} className="flex justify-between gap-3 text-sm">
                <span className="text-[var(--color-ink)]">{line.material_name}</span>
                <span className="text-[var(--color-ink-muted)]">
                  {formatNumber(line.quantity_used)} {line.material_unit}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {notice && (
        <p className="rounded-xl border border-[var(--color-success)] px-4 py-3 text-sm text-[var(--color-success)]">{notice}</p>
      )}
      {actionError && (
        <p role="alert" className="rounded-xl border border-[var(--color-error)] px-4 py-3 text-sm text-[var(--color-error)]">
          {actionError}
        </p>
      )}

      {editing ? (
        <BatchEditForm batch={batch} currency={currency} onCancel={() => setEditing(false)} onSaved={handleSaved} />
      ) : batch.can_edit ? (
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => { setNotice(''); setActionError(''); setEditing(true) }}
            className="flex items-center justify-center gap-2 rounded-xl bg-[var(--color-stamp)] py-3 font-sans text-sm font-semibold text-[var(--color-paper-light)] lg:py-4 lg:text-base"
          >
            <Pencil size={16} strokeWidth={2} />
            Edit batch
          </button>

          {confirmingUndo ? (
            <div className="flex flex-col gap-3 rounded-xl border border-[var(--color-error)] p-4">
              <p className="text-sm text-[var(--color-ink)]">
                Undo this batch? The ingredients go back into stock and the finished stock is taken out. This is
                refused if any of it was already dispatched.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmingUndo(false)}
                  disabled={undoing}
                  className="flex-1 rounded-xl border border-[var(--color-border)] py-2.5 text-sm font-semibold text-[var(--color-ink)] disabled:opacity-50"
                >
                  Keep it
                </button>
                <button
                  type="button"
                  onClick={handleUndo}
                  disabled={undoing}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--color-error)] py-2.5 text-sm font-semibold text-[var(--color-paper-light)] disabled:opacity-50"
                >
                  {undoing && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
                  Undo batch
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => { setNotice(''); setActionError(''); setConfirmingUndo(true) }}
              className="flex items-center justify-center gap-2 text-sm font-medium text-[var(--color-error)] underline lg:text-base"
            >
              <Undo2 size={16} strokeWidth={2} />
              Undo this batch
            </button>
          )}
        </div>
      ) : (
        <p className="text-sm text-[var(--color-ink-muted)]">
          Only the person who logged this batch, a manager or the owner can edit it.
        </p>
      )}

      {history.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="font-sans text-sm font-semibold text-[var(--color-ink)] lg:text-base">Edit history</p>
          <ul className="flex flex-col gap-2">
            {history.map((entry) => (
              <li key={entry.edit_id} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] px-4 py-3">
                <p className="text-xs text-[var(--color-ink-muted)]">
                  {formatWhen(entry.edited_at)}
                  {entry.edited_by_name ? ` · ${entry.edited_by_name}` : ''}
                </p>
                <ul className="mt-1 text-sm text-[var(--color-ink)]">
                  {describeChanges(entry, names, currency).map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}