// PATH: src/features/finance/components/ReceivablesSnapshot.jsx

import { Link } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { getDispatchSummary, PAYMENT_STATUS } from '../../orders/hooks/useReceivablesSummary.js'
import { mockRetailers } from '../../orders/data/ordersMock.js'

function formatRupees(n) {
  return `₹${Math.round(n).toLocaleString('en-IN')}`
}

// Finance doesn't re-log receivables — it reads the same dispatch data
// Orders already owns, and links back to Orders for anything actionable
// (marking paid, opening a specific dispatch). Same boundary as the
// restock-log comment: one owner writes, others read.
export default function ReceivablesSnapshot({ dispatches }) {
  const owing = dispatches
    .map((d) => ({ dispatch: d, summary: getDispatchSummary(d) }))
    .filter(({ summary }) => summary.status !== PAYMENT_STATUS.PAID)
    .sort((a, b) => b.summary.remaining - a.summary.remaining)

  if (owing.length === 0) {
    return (
      <p className="rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] px-4 py-3 text-sm text-[var(--color-ink-muted)] lg:px-6 lg:py-4 lg:text-base">
        Nothing owed to you in this period.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-2 lg:gap-3">
      {owing.slice(0, 5).map(({ dispatch, summary }) => {
        const retailer = mockRetailers.find((r) => r.id === dispatch.retailerId)
        return (
          <Link
            key={dispatch.id}
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
              {formatRupees(summary.remaining)}
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