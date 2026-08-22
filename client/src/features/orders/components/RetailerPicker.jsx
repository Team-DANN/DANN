import { useMemo, useState } from 'react'
import { Search, Plus, Store } from 'lucide-react'
import { mockRetailers, topRetailerIds } from '../data/ordersMock.js'

// Mirrors ProductPicker: top few + search, inline "Add retailer" tile —
// no forced detour to Settings before the first dispatch.
export default function RetailerPicker({ retailers, onSelect, onAddRetailer }) {
  const [query, setQuery] = useState('')

  const list = retailers ?? mockRetailers

  const topRetailers = useMemo(
    () => topRetailerIds.map((id) => list.find((r) => r.id === id)).filter(Boolean),
    [list]
  )

  const searchResults = useMemo(() => {
    if (!query.trim()) return null
    const q = query.trim().toLowerCase()
    return list.filter((r) => r.name.toLowerCase().includes(q))
  }, [list, query])

  const visibleRetailers = searchResults ?? topRetailers

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <Search
          size={16}
          strokeWidth={2}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)]"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search retailers…"
          className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] py-2.5 pl-9 pr-3 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:border-[var(--color-stamp)] focus:outline-none"
        />
      </div>

      {!query.trim() && (
        <p className="text-xs text-[var(--color-ink-muted)]">Your regular retailers</p>
      )}

      {visibleRetailers.length === 0 ? (
        <p className="py-6 text-center text-sm text-[var(--color-ink-muted)]">
          No retailers match "{query}"
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {visibleRetailers.map((retailer) => (
            <button
              key={retailer.id}
              type="button"
              onClick={() => onSelect(retailer)}
              className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] px-4 py-3 text-left active:bg-[var(--color-paper)]"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-paper)] text-[var(--color-ink-muted)]">
                <Store size={18} strokeWidth={1.75} />
              </span>
              <span className="text-sm font-medium text-[var(--color-ink)]">{retailer.name}</span>
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={onAddRetailer}
        className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--color-border)] py-3 text-sm font-medium text-[var(--color-ink-muted)] hover:border-[var(--color-stamp)] hover:text-[var(--color-stamp)]"
      >
        <Plus size={18} strokeWidth={2} />
        Add retailer
      </button>
    </div>
  )
}