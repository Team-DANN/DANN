// PATH: src/features/orders/components/DispatchList.jsx

import { useMemo, useState } from 'react'
import { Search, SlidersHorizontal, Plus } from 'lucide-react'
import DispatchRow from './DispatchRow.jsx'
import OverdueBanner from './OverdueBanner.jsx'
import { getDispatchSummary, PAYMENT_STATUS } from '../hooks/useReceivablesSummary.js'
import { mockRetailers } from '../data/ordersMock.js'

const DEFAULT_VISIBLE_COUNT = 6

const SORT_OPTIONS = [
  { id: 'recent', label: 'Most recent' },
  { id: 'amount', label: 'Highest amount' },
  { id: 'name', label: 'Retailer A–Z' },
]

function retailerName(retailerId) {
  return mockRetailers.find((r) => r.id === retailerId)?.name ?? ''
}

function sortDispatches(list, sortBy) {
  const copy = [...list]
  if (sortBy === 'amount') return copy.sort((a, b) => b.amount - a.amount)
  if (sortBy === 'name') {
    return copy.sort((a, b) => retailerName(a.retailerId).localeCompare(retailerName(b.retailerId)))
  }
  // 'recent' (default)
  return copy.sort((a, b) => new Date(b.date) - new Date(a.date))
}

// No "All" chip — the unfiltered list already IS "all". Status filters are
// standalone toggles you can combine (e.g. Paid + Unpaid, skipping
// Partial), same pattern as Inventory's "Needs attention."
export default function DispatchList({ dispatches, onSelectDispatch, onLogDispatch }) {
  const [query, setQuery] = useState('')
  const [statusFilters, setStatusFilters] = useState({ owes: false, paid: false, unpaid: false })
  const [sortBy, setSortBy] = useState('recent')
  const [sortOpen, setSortOpen] = useState(false)
  const [showAll, setShowAll] = useState(false)

  function toggleStatus(id) {
    setStatusFilters((prev) => ({ ...prev, [id]: !prev[id] }))
    setShowAll(false)
  }

  const owingDispatches = useMemo(
    () => dispatches.filter((d) => getDispatchSummary(d).status !== PAYMENT_STATUS.PAID),
    [dispatches]
  )
  const paidDispatches = useMemo(
    () => dispatches.filter((d) => getDispatchSummary(d).status === PAYMENT_STATUS.PAID),
    [dispatches]
  )
  const unpaidDispatches = useMemo(
    () => dispatches.filter((d) => getDispatchSummary(d).status === PAYMENT_STATUS.UNPAID),
    [dispatches]
  )

  const overdueDispatches = useMemo(
    () => dispatches.filter((d) => getDispatchSummary(d).overdue),
    [dispatches]
  )
  const overdueAmount = overdueDispatches.reduce(
    (sum, d) => sum + getDispatchSummary(d).remaining,
    0
  )

  const anyStatusFilter = statusFilters.owes || statusFilters.paid || statusFilters.unpaid

  const filtered = useMemo(() => {
    let list = dispatches
    if (anyStatusFilter) {
      list = list.filter((d) => {
        const { status } = getDispatchSummary(d)
        if (statusFilters.owes && status !== PAYMENT_STATUS.PAID) return true
        if (statusFilters.paid && status === PAYMENT_STATUS.PAID) return true
        if (statusFilters.unpaid && status === PAYMENT_STATUS.UNPAID) return true
        return false
      })
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      list = list.filter((d) => retailerName(d.retailerId).toLowerCase().includes(q))
    }
    return sortDispatches(list, sortBy)
  }, [dispatches, statusFilters, anyStatusFilter, query, sortBy])

  // Cap only applies to the default browsing view — search or any active
  // status filter both mean the person is already narrowing down, so
  // nobody chasing payments has entries silently hidden behind a cap.
  const isCapped = !anyStatusFilter && !query.trim() && !showAll
  const visible = isCapped ? filtered.slice(0, DEFAULT_VISIBLE_COUNT) : filtered
  const hiddenCount = filtered.length - visible.length

  const STATUS_CHIPS = [
    { id: 'owes', label: 'Owes money', count: owingDispatches.length },
    { id: 'paid', label: 'Paid', count: paidDispatches.length },
    { id: 'unpaid', label: 'Unpaid', count: unpaidDispatches.length },
  ]

  return (
    <div className="flex flex-col gap-4">
      {overdueDispatches.length > 0 && !statusFilters.owes && (
        <OverdueBanner
          count={overdueDispatches.length}
          amount={overdueAmount}
          onViewAll={() => toggleStatus('owes')}
        />
      )}

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search
            size={16}
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
            placeholder="Search by retailer…"
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] py-2.5 pl-9 pr-3 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:border-[var(--color-stamp)] focus:outline-none"
          />
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setSortOpen((v) => !v)}
            aria-label="Sort dispatches"
            className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border ${
              sortOpen
                ? 'border-[var(--color-stamp)] text-[var(--color-stamp)]'
                : 'border-[var(--color-border)] text-[var(--color-ink-muted)]'
            }`}
          >
            <SlidersHorizontal size={16} strokeWidth={2} />
          </button>

          {sortOpen && (
            <div className="absolute right-0 top-full z-10 mt-1 w-40 rounded-lg border border-[var(--color-border)] bg-[var(--color-paper-light)] p-1 shadow-lg">
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

      <div className="flex flex-wrap gap-2">
        {STATUS_CHIPS.map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={() => toggleStatus(chip.id)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
              statusFilters[chip.id]
                ? 'border-[var(--color-stamp)] bg-[var(--color-stamp)] text-[var(--color-paper-light)]'
                : 'border-[var(--color-border)] text-[var(--color-ink-muted)]'
            }`}
          >
            {chip.label}{chip.count ? ` (${chip.count})` : ''}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="py-6 text-center text-sm text-[var(--color-ink-muted)]">
          {query.trim() ? `No dispatches match "${query}"` : 'Nothing here yet.'}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {visible.map((d) => (
            <DispatchRow key={d.id} dispatch={d} onClick={() => onSelectDispatch(d)} />
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

      <button
        type="button"
        onClick={onLogDispatch}
        className="flex items-center justify-center gap-2 rounded-xl bg-[var(--color-stamp)] py-4 font-sans text-base font-semibold text-[var(--color-paper-light)] hover:bg-[var(--color-stamp-dark)]"
      >
        <Plus size={20} strokeWidth={2} />
        Log dispatch
      </button>
    </div>
  )
}
