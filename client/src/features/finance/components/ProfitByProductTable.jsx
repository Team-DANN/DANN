// PATH: src/features/finance/components/ProfitByProductTable.jsx

import { useMemo, useState } from 'react'
import { Search, SlidersHorizontal, Package } from 'lucide-react'
import { useAuth } from '../../../context/AuthContext.jsx'
import { formatCurrency } from '../../../lib/formatCurrency.js'

const DEFAULT_VISIBLE_COUNT = 8

const SORT_OPTIONS = [
  { id: 'revenue', label: 'Top revenue' },
  { id: 'profit', label: 'Top profit' },
  { id: 'units', label: 'Most sold' },
  { id: 'name', label: 'A–Z' },
]

function sortProducts(list, sortBy) {
  const copy = [...list]
  if (sortBy === 'units') return copy.sort((a, b) => (b.qty ?? 0) - (a.qty ?? 0))
  if (sortBy === 'profit') return copy.sort((a, b) => (b.profit ?? 0) - (a.profit ?? 0))
  if (sortBy === 'name') return copy.sort((a, b) => a.name.localeCompare(b.name))
  return copy.sort((a, b) => (b.revenue ?? 0) - (a.revenue ?? 0))
}

// Real revenue AND real profit per product for the selected period.
// Backend now joins actual dispatch_order sales (within the period)
// against each product's live cost_per_unit — previously it returned a
// static catalog snapshot (selling_price/margin_percent/stock_on_hand)
// with no revenue or qty field at all, which is why every row here
// rendered "₹NaN" and "×undefined units". Fixed at the source
// (ReportService.getProfitByProduct); this component's own field
// references were always correct.
//
// Profit is revenue minus MATERIAL cost only (cost_per_unit × units
// sold) — labor cost is tracked per batch, not allocated per unit, so
// this reads as gross material margin, not a final net number.
export default function ProfitByProductTable({ byProduct }) {
  const { user } = useAuth()
  const currency = user?.currency || '₹'

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
    <div className="flex flex-col gap-3 lg:gap-4">
      <div className="flex items-center gap-2 lg:gap-3">
        <div className="relative flex-1">
          <Search
            size={14}
            strokeWidth={2}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)] lg:left-4 lg:h-4 lg:w-4"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setShowAll(false)
            }}
            placeholder="Search products…"
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] py-2 pl-8 pr-3 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:border-[var(--color-stamp)] focus:outline-none lg:py-3 lg:pl-10 lg:pr-4 lg:text-base"
          />
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setSortOpen((v) => !v)}
            aria-label="Sort products"
            className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border lg:h-11 lg:w-11 ${
              sortOpen
                ? 'border-[var(--color-stamp)] text-[var(--color-stamp)]'
                : 'border-[var(--color-border)] text-[var(--color-ink-muted)]'
            }`}
          >
            <SlidersHorizontal size={16} strokeWidth={2} className="lg:h-[18px] lg:w-[18px]" />
          </button>

          {sortOpen && (
            <div className="absolute right-0 top-full z-10 mt-1 w-36 rounded-lg border border-[var(--color-border)] bg-[var(--color-paper-light)] p-1 shadow-lg lg:w-44">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setSortBy(opt.id)
                    setSortOpen(false)
                  }}
                  className={`block w-full rounded px-2 py-1.5 text-left text-sm lg:px-3 lg:py-2 lg:text-base ${
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

      <p className="text-xs text-[var(--color-ink-muted)] lg:text-sm">
        Revenue and profit by product this period · profit is material cost only labor isn't split per item yet
      </p>

      {filtered.length === 0 ? (
        <p className="py-6 text-center text-sm text-[var(--color-ink-muted)] lg:py-8 lg:text-base">
          {query.trim() ? `No products match "${query}"` : 'No dispatches in this period.'}
        </p>
      ) : (
        <div className="flex flex-col gap-2 lg:gap-3">
          {visible.map((p) => {
            const revenue = p.revenue ?? 0
            const profit = p.profit ?? 0
            const qty = p.qty ?? 0
            return (
              <div
                key={p.productId}
                className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] px-4 py-3 lg:gap-4 lg:px-6 lg:py-4"
              >
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-paper)] text-[var(--color-ink-muted)] lg:h-11 lg:w-11">
                  <Package size={16} strokeWidth={1.75} className="lg:h-5 lg:w-5" />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium text-[var(--color-ink)] lg:text-base">{p.name}</span>
                    <span className="flex-shrink-0 font-mono text-sm font-semibold text-[var(--color-ink)] lg:text-base">
                      {formatCurrency(revenue, currency)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-[var(--color-ink-muted)] lg:text-sm">×{qty} units</span>
                    <span
                      className={`text-xs font-medium lg:text-sm ${
                        profit >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'
                      }`}
                    >
                      {formatCurrency(profit, currency)} profit
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-paper)] lg:h-2">
                    <div
                      className="h-full rounded-full bg-[var(--color-stamp)]"
                      style={{ width: `${Math.max(6, (revenue / topRevenue) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {isCapped && hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="text-center text-sm font-medium text-[var(--color-stamp)] lg:text-base"
        >
          Show all ({hiddenCount} more)
        </button>
      )}
    </div>
  )
}