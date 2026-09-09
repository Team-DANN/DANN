// PATH: src/features/finance/components/ReceivablesSnapshot.jsx
import { Link } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { useOrders } from '../../orders/hooks/useOrders.js'
import { useRetailers } from '../../orders/hooks/useRetailers.js'
import { getDispatchSummary, PAYMENT_STATUS } from '../../orders/hooks/useReceivablesSummary.js'
import { useAuth } from '../../../context/AuthContext.jsx'
import { formatCurrency } from '../../../lib/formatCurrency.js'

// Finance doesn't own orders or receivables — it reads Orders' live hooks
// directly so this never goes stale against a local copy. Not period-
// scoped: this is "what's owed right now", independent of the Profit
// period filter above it.
export default function ReceivablesSnapshot() {
  const { user } = useAuth()
  const currency = user?.currency || '₹'
  const { orders, loading: ordersLoading } = useOrders()
  const { retailers, loading: retailersLoading } = useRetailers()

  if (ordersLoading || retailersLoading) {
    return <p className="text-sm text-[var(--color-ink-muted)]">Loading…</p>
  }

  const owing = orders
    .map((order) => ({ order, summary: getDispatchSummary(order) }))
    .filter(({ summary }) => summary.status !== PAYMENT_STATUS.PAID)
    .sort((a, b) => b.summary.remaining - a.summary.remaining)

  if (owing.length === 0) {
    return (
      <p className="rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] px-4 py-3 text-sm text-[var(--color-ink-muted)] lg:px-6 lg:py-4 lg:text-base">
        Nothing owed to you right now.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-2 lg:gap-3">
      {owing.slice(0, 5).map(({ order, summary }) => {
        const retailer = retailers.find((r) => r.id === order.retailer_id)
        return (
          <Link
            key={order.id}
            to="/orders"
            className="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] px-4 py-2.5 active:bg-[var(--color-paper)] lg:px-6 lg:py-3.5"
          >
            <span className="truncate text-sm font-medium text-[var(--color-ink)] lg:text-base">
              {retailer?.name ?? 'Unknown retailer'}
            </span>
            <span
              className={`flex flex-shrink-0 items-center gap-1 font-mono text-sm font-medium lg:text-base ${
                summary.overdue ? 'text-[var(--color-error)]' : 'text-[var(--color-ink-muted)]'
              }`}
            >
              {summary.overdue && <AlertTriangle size={12} strokeWidth={2} className="lg:h-[14px] lg:w-[14px]" />}
              {formatCurrency(summary.remaining, currency)}
            </span>
          </Link>
        )
      })}
      {owing.length > 5 && (
        <Link to="/orders" className="text-center text-sm font-medium text-[var(--color-stamp)] lg:text-base">
          View all {owing.length} in Orders
        </Link>
      )}
    </div>
  )
}