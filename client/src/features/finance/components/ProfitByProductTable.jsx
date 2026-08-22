// PATH: src/features/finance/components/ProfitByProductTable.jsx

import { useMemo, useState } from 'react'
import { Search, SlidersHorizontal, Package } from 'lucide-react'

const DEFAULT_VISIBLE_COUNT = 8

function formatRupees(n) {
  return `₹${Math.round(n).toLocaleString('en-IN')}`
}

const SORT_OPTIONS = [
  { id: 'revenue', label: 'Top revenue' },
  { id: 'units', label: 'Most sold' },
  { id: 'name', label: 'A–Z' },
]

function sortProducts(list, sortBy) {
  const copy = [...list]
  if (sortBy === 'units') return copy.sort((a, b) => b.qty - a.qty)
  if (sortBy === 'name') return copy.sort((a, b) => a.name.localeCompare(b.name))
  return copy.sort((a, b) => b.revenue - a.revenue)
}

// Named "profit by product" but shows REVENUE — true per-product profit
// needs a bill-of-materials (recipe cost per unit) that doesn't exist in
// production/ yet. The note in the UI is deliberate: unlabeled revenue
// would read as profit to a non-accountant owner.
//
// Scoped to products that actually sold this period — search finds any of
// them by name past the cap, the sort icon reorders (revenue / units /
// name) without needing a second list of everything that didn't sell.
export default function ProfitByProductTable({ byProduct }) {
  const [query, setQuery] = useState('')
  const [sortBy, setSortBy] = useState('revenue')
  const [sortOpen, setSortOpen] = useState(false)
  const [showAll, setShowAll] = useState(false)

  const filtered = useMemo(() => {
    let list = byProduct
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      list = list.filter((p) => p.name.toLowerCase().includes(q))
    }
    return sortProducts(list, sortBy)
  }, [byProduct, query, sortBy])

  const isCapped = !query.trim() && !showAll
  const visible = isCapped ? filtered.slice(0, DEFAULT_VISIBLE_COUNT) : filtered
  const hiddenCount = filtered.length - visible.length
  const topRevenue = byProduct[0]?.revenue || 1

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search
            size={14}
            strokeWidth={2}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)]"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setShowAll(false)
            }}
            placeholder="Search products…"
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] py-2 pl-8 pr-3 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:border-[var(--color-stamp)] focus:outline-none"
          />
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setSortOpen((v) => !v)}
            aria-label="Sort products"
            className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border ${
              sortOpen
                ? 'border-[var(--color-stamp)] text-[var(--color-stamp)]'
                : 'border-[var(--color-border)] text-[var(--color-ink-muted)]'
            }`}
          >
            <SlidersHorizontal size={16} strokeWidth={2} />
          </button>

          {sortOpen && (
            <div className="absolute right-0 top-full z-10 mt-1 w-36 rounded-lg border border-[var(--color-border)] bg-[var(--color-paper-light)] p-1 shadow-lg">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setSortBy(opt.id)
                    setSortOpen(false)
                  }}
                  className={`block w-full rounded px-2 py-1.5 text-left text-sm ${
                    sortBy === opt.id
                      ? 'bg-[var(--color-stamp)] text-[var(--color-paper-light)]'
                      : 'text-[var(--color-ink)] hover:bg-[var(--color-paper)]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-[var(--color-ink-muted)]">
        Revenue by product · per-product cost isn't tracked yet, so this isn't margin
      </p>

      {filtered.length === 0 ? (
        <p className="py-6 text-center text-sm text-[var(--color-ink-muted)]">
          {query.trim() ? `No products match "${query}"` : 'No dispatches in this period.'}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {visible.map((p) => (
            <div
              key={p.productId}
              className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] px-4 py-3"
            >
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-paper)] text-[var(--color-ink-muted)]">
                <Package size={16} strokeWidth={1.75} />
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium text-[var(--color-ink)]">{p.name}</span>
                  <span className="flex-shrink-0 font-mono text-sm font-semibold text-[var(--color-ink)]">
                    {formatRupees(p.revenue)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-[var(--color-ink-muted)]">×{p.qty} units</span>
                  <div className="h-1.5 w-24 overflow-hidden rounded-full bg-[var(--color-paper)]">
                    <div
                      className="h-full rounded-full bg-[var(--color-stamp)]"
                      style={{ width: `${Math.max(6, (p.revenue / topRevenue) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isCapped && hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="text-center text-sm font-medium text-[var(--color-stamp)]"
        >
          Show all ({hiddenCount} more)
        </button>
      )}
    </div>
  )
}
