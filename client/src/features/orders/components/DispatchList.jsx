// PATH: src/features/orders/components/DispatchList.jsx
import { useMemo, useState } from 'react'
import { Search, SlidersHorizontal, Plus } from 'lucide-react'
import DispatchRow from './DispatchRow.jsx'
import OverdueBanner from './OverdueBanner.jsx'
import { getDispatchSummary, PAYMENT_STATUS } from '../hooks/useReceivablesSummary.js'
import { useProgressiveReveal } from '../../../lib/hooks/useProgressiveReveal.js'

const SORT_OPTIONS = [
  { id: 'recent', label: 'Most recent' },
  { id: 'amount', label: 'Highest amount' },
  { id: 'name', label: 'Retailer A–Z' },
]

export default function DispatchList({ orders, retailers, products, loading, error, onSelectDispatch, onLogDispatch }) {
  const [query, setQuery] = useState('')
  const [statusFilters, setStatusFilters] = useState({ owes: false, paid: false, unpaid: false })
  const [sortBy, setSortBy] = useState('recent')
  const [sortOpen, setSortOpen] = useState(false)

  const retailerName = (id) => retailers.find((r) => r.id === id)?.name ?? 'Unknown retailer'
  const productName = (id) => products.find((p) => p.id === id)?.name ?? id

  function sortOrders(list) {
    const copy = [...list]
    if (sortBy === 'amount') return copy.sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0))
    if (sortBy === 'name') return copy.sort((a, b) => retailerName(a.retailer_id).localeCompare(retailerName(b.retailer_id)))
    return copy.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  }

  function toggleStatus(id) {
    setStatusFilters((prev) => ({ ...prev, [id]: !prev[id] }))
    reset()
  }

  const owingOrders = useMemo(() => orders.filter((o) => getDispatchSummary(o).status !== PAYMENT_STATUS.PAID), [orders])
  const paidOrders = useMemo(() => orders.filter((o) => getDispatchSummary(o).status === PAYMENT_STATUS.PAID), [orders])
  const unpaidOrders = useMemo(() => orders.filter((o) => getDispatchSummary(o).status === PAYMENT_STATUS.UNPAID), [orders])
  const overdueOrders = useMemo(() => orders.filter((o) => getDispatchSummary(o).overdue), [orders])
  const overdueAmount = overdueOrders.reduce((sum, o) => sum + getDispatchSummary(o).remaining, 0)

  const anyStatusFilter = statusFilters.owes || statusFilters.paid || statusFilters.unpaid

  const filtered = useMemo(() => {
    let list = orders
    if (anyStatusFilter) {
      list = list.filter((o) => {
        const { status } = getDispatchSummary(o)
        if (statusFilters.owes && status !== PAYMENT_STATUS.PAID) return true
        if (statusFilters.paid && status === PAYMENT_STATUS.PAID) return true
        if (statusFilters.unpaid && status === PAYMENT_STATUS.UNPAID) return true
        return false
      })
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      list = list.filter((o) => retailerName(o.retailer_id).toLowerCase().includes(q))
    }
    return sortOrders(list)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, statusFilters, anyStatusFilter, query, sortBy, retailers])

  const { visible, hasMore, remaining, showMore, reset } = useProgressiveReveal(filtered, { initial: 6, increment: 10 })
  const isCapped = !anyStatusFilter && !query.trim()
  const visibleOrders = isCapped ? visible : filtered

  const STATUS_CHIPS = [
    { id: 'owes', label: 'Owes money', count: owingOrders.length },
    { id: 'paid', label: 'Paid', count: paidOrders.length },
    { id: 'unpaid', label: 'Unpaid', count: unpaidOrders.length },
  ]

  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      {overdueOrders.length > 0 && !statusFilters.owes && (
        <OverdueBanner count={overdueOrders.length} amount={overdueAmount} onViewAll={() => toggleStatus('owes')} />
      )}

      <div className="flex items-center gap-2 lg:gap-3">
        <div className="relative flex-1">
          <Search size={16} strokeWidth={2} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)] lg:left-4 lg:h-[18px] lg:w-[18px]" />
          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); reset() }}
            placeholder="Search by retailer…"
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] py-2.5 pl-9 pr-3 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:border-[var(--color-stamp)] focus:outline-none lg:py-3.5 lg:pl-11 lg:pr-4 lg:text-base"
          />
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setSortOpen((v) => !v)}
            aria-label="Sort dispatches"
            className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border lg:h-12 lg:w-12 ${sortOpen ? 'border-[var(--color-stamp)] text-[var(--color-stamp)]' : 'border-[var(--color-border)] text-[var(--color-ink-muted)]'}`}
          >
            <SlidersHorizontal size={16} strokeWidth={2} className="lg:h-[18px] lg:w-[18px]" />
          </button>

          {sortOpen && (
            <div className="absolute right-0 top-full z-10 mt-1 w-40 rounded-lg border border-[var(--color-border)] bg-[var(--color-paper-light)] p-1 shadow-lg lg:w-48">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => { setSortBy(opt.id); setSortOpen(false) }}
                  className={`block w-full rounded px-2 py-1.5 text-left text-sm lg:px-3 lg:py-2 lg:text-base ${sortBy === opt.id ? 'bg-[var(--color-stamp)] text-[var(--color-paper-light)]' : 'text-[var(--color-ink)] hover:bg-[var(--color-paper)]'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 lg:gap-3">
        {STATUS_CHIPS.map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={() => toggleStatus(chip.id)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium lg:px-4 lg:py-2 lg:text-sm ${statusFilters[chip.id] ? 'border-[var(--color-stamp)] bg-[var(--color-stamp)] text-[var(--color-paper-light)]' : 'border-[var(--color-border)] text-[var(--color-ink-muted)]'}`}
          >
            {chip.label}{chip.count ? ` (${chip.count})` : ''}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="py-6 text-center text-sm text-[var(--color-ink-muted)] lg:py-8 lg:text-base">Loading dispatches…</p>
      ) : error ? (
        <p className="py-6 text-center text-sm text-[var(--color-error)] lg:py-8 lg:text-base">Couldn't load dispatches. {error}</p>
      ) : filtered.length === 0 ? (
        <p className="py-6 text-center text-sm text-[var(--color-ink-muted)] lg:py-8 lg:text-base">
          {query.trim() ? `No dispatches match "${query}"` : 'Nothing here yet.'}
        </p>
      ) : (
        <div className="flex flex-col gap-2 lg:gap-3">
          {visibleOrders.map((order) => (
            <DispatchRow
              key={order.id}
              order={order}
              retailerName={retailerName(order.retailer_id)}
              productName={productName(order.product_id)}
              onClick={() => onSelectDispatch(order)}
            />
          ))}
        </div>
      )}

      {isCapped && hasMore && (
        <button type="button" onClick={showMore} className="text-center text-sm font-medium text-[var(--color-stamp)] lg:text-base">
          View more ({Math.min(remaining, 10)} more)
        </button>
      )}

      <button
        type="button"
        onClick={onLogDispatch}
        className="flex items-center justify-center gap-2 rounded-xl bg-[var(--color-stamp)] py-4 font-sans text-base font-semibold text-[var(--color-paper-light)] hover:bg-[var(--color-stamp-dark)] lg:gap-3 lg:py-5 lg:text-lg"
      >
        <Plus size={20} strokeWidth={2} className="lg:h-6 lg:w-6" />
        Log dispatch
      </button>
    </div>
  )
}