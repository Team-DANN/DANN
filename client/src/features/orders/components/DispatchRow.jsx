import { CheckCircle2, Clock, AlertTriangle } from 'lucide-react'
import { getDispatchSummary, PAYMENT_STATUS } from '../hooks/useReceivablesSummary.js'
import { mockRetailers, productName } from '../data/ordersMock.js'

const STATUS_CONFIG = {
  [PAYMENT_STATUS.PAID]: {
    icon: CheckCircle2,
    text: 'Paid',
    className: 'border-[var(--color-success)] text-[var(--color-success)]',
  },
  [PAYMENT_STATUS.PARTIAL]: {
    icon: Clock,
    text: 'Partial',
    className: 'border-[var(--color-warning,#b45309)] text-[var(--color-warning,#b45309)]',
  },
  [PAYMENT_STATUS.UNPAID]: {
    icon: AlertTriangle,
    text: 'Unpaid',
    className: 'border-[var(--color-error)] text-[var(--color-error)]',
  },
}

export default function DispatchRow({ dispatch, onClick }) {
  const { status, remaining, overdue } = getDispatchSummary(dispatch)
  const { icon: Icon, text, className } = STATUS_CONFIG[status]
  const retailer = mockRetailers.find((r) => r.id === dispatch.retailerId)
  const itemSummary = dispatch.items
    .map((i) => `${productName(i.productId)} ×${i.qty}`)
    .join(', ')

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] px-4 py-3 text-left active:bg-[var(--color-paper)] lg:px-6 lg:py-4"
    >
      <div className="flex min-w-0 flex-col">
        <span className="truncate font-sans text-sm font-semibold text-[var(--color-ink)] lg:text-base">
          {retailer?.name ?? 'Unknown retailer'}
        </span>
        <span className="truncate text-xs text-[var(--color-ink-muted)] lg:text-sm">{itemSummary}</span>
      </div>

      <div className="flex flex-shrink-0 flex-col items-end gap-1">
        <span className="font-mono text-xs text-[var(--color-ink-muted)] lg:text-sm">
          {status === PAYMENT_STATUS.PAID ? `₹${dispatch.amount}` : `₹${remaining} due`}
        </span>
        <span
          className={`flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium lg:px-2.5 lg:py-1.5 lg:text-sm ${className}`}
        >
          <Icon size={12} strokeWidth={2} className="lg:h-[14px] lg:w-[14px]" />
          {overdue ? 'Overdue' : text}
        </span>
      </div>
    </button>
  )
}