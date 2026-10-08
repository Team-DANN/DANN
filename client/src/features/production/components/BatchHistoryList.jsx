import { ChevronRight, Loader2 } from 'lucide-react'
import { useBatches } from '../hooks/useBatches.js'

function formatWhen(value) {
  return new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
}

// Fetches its own list, so coming back from a batch (after an edit or an
// undo) always shows fresh data.
export default function BatchHistoryList({ onSelect }) {
  const { batches, loading, error, refetch } = useBatches()

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-sm text-[var(--color-ink-muted)] lg:text-base">
        <Loader2 size={18} strokeWidth={2} className="animate-spin" />
        Loading batches…
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-[var(--color-error)] bg-[var(--color-paper-light)] px-4 py-3 text-sm text-[var(--color-error)]">
        <span>Couldn't load batches. {error}</span>
        <button type="button" onClick={refetch} className="font-semibold underline">
          Retry
        </button>
      </div>
    )
  }

  if (batches.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-[var(--color-ink-muted)] lg:text-base">
        No batches logged yet.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-[var(--color-ink-muted)] lg:text-sm">
        Your latest {batches.length} batches. Open one to see what it used, edit it or undo it.
      </p>
      <ul className="flex flex-col gap-2 lg:gap-3">
        {batches.map((batch) => (
          <li key={batch.id}>
            <button
              type="button"
              onClick={() => onSelect(batch.id)}
              className="flex w-full items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] px-4 py-3 text-left hover:border-[var(--color-stamp)] lg:px-6 lg:py-4"
            >
              <span className="min-w-0">
                <span className="block truncate font-sans text-sm font-semibold text-[var(--color-ink)] lg:text-base">
                  {batch.product_name}{' '}
                  <span className="font-normal text-[var(--color-ink-muted)]">× {batch.quantity_produced}</span>
                </span>
                <span className="block text-xs text-[var(--color-ink-muted)] lg:text-sm">
                  {formatWhen(batch.produced_at)}
                  {batch.logged_by_name ? ` · ${batch.logged_by_name}` : ''}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                {batch.edit_count > 0 && (
                  <span className="rounded-full border border-[var(--color-border)] px-2 py-0.5 text-xs text-[var(--color-ink-muted)]">
                    Edited
                  </span>
                )}
                <ChevronRight size={16} strokeWidth={2} className="text-[var(--color-ink-muted)]" />
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}