// PATH: src/features/orders/components/RetailerPicker.jsx
import { useMemo, useState } from 'react'
import { Search, Plus, Store, Loader2 } from 'lucide-react'
import { useProgressiveReveal } from '../../../lib/hooks/useProgressiveReveal.js'

export default function RetailerPicker({ retailers, loading, error, onSelect, onAddRetailer }) {
  const [query, setQuery] = useState('')

  const searchResults = useMemo(() => {
    if (!query.trim()) return null
    const q = query.trim().toLowerCase()
    return retailers.filter((r) => r.name.toLowerCase().includes(q))
  }, [retailers, query])

  const { visible, hasMore, remaining, showMore, reset } = useProgressiveReveal(retailers, {
    initial: 8,
    increment: 10,
  })

  const visibleRetailers = searchResults ?? visible

  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      <div className="relative">
        <Search size={16} strokeWidth={2} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)] lg:left-4 lg:h-[18px] lg:w-[18px]" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            reset()
          }}
          placeholder="Search retailers…"
          className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] py-2.5 pl-9 pr-3 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:border-[var(--color-stamp)] focus:outline-none lg:py-3.5 lg:pl-11 lg:pr-4 lg:text-base"
        />
      </div>

      {!query.trim() && <p className="text-xs text-[var(--color-ink-muted)] lg:text-sm">Your retailers</p>}

      {loading ? (
        <div className="flex items-center gap-2 py-6 text-sm text-[var(--color-ink-muted)] lg:text-base">
          <Loader2 size={18} strokeWidth={2} className="animate-spin" />
          Loading retailers…
        </div>
      ) : error ? (
        <p className="text-sm text-[var(--color-error)] lg:text-base">Couldn't load retailers. {error}</p>
      ) : visibleRetailers.length === 0 ? (
        <p className="py-6 text-center text-sm text-[var(--color-ink-muted)] lg:py-8 lg:text-base">
          {query.trim() ? `No retailers match "${query}"` : 'No retailers yet — add one below.'}
        </p>
      ) : (
        <div className="flex flex-col gap-2 lg:gap-3">
          {visibleRetailers.map((retailer) => (
            <button
              key={retailer.id}
              type="button"
              onClick={() => onSelect(retailer)}
              className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] px-4 py-3 text-left active:bg-[var(--color-paper)] lg:gap-4 lg:px-6 lg:py-4"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-paper)] text-[var(--color-ink-muted)] lg:h-12 lg:w-12">
                <Store size={18} strokeWidth={1.75} className="lg:h-5 lg:w-5" />
              </span>
              <span className="text-sm font-medium text-[var(--color-ink)] lg:text-base">{retailer.name}</span>
            </button>
          ))}
        </div>
      )}

      {!query.trim() && hasMore && (
        <button type="button" onClick={showMore} className="text-center text-sm font-medium text-[var(--color-stamp)] lg:text-base">
          View more ({Math.min(remaining, 10)} more)
        </button>
      )}

      <button
        type="button"
        onClick={onAddRetailer}
        className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--color-border)] py-3 text-sm font-medium text-[var(--color-ink-muted)] hover:border-[var(--color-stamp)] hover:text-[var(--color-stamp)] lg:gap-3 lg:py-4 lg:text-base"
      >
        <Plus size={18} strokeWidth={2} className="lg:h-5 lg:w-5" />
        Add retailer
      </button>
    </div>
  )
}