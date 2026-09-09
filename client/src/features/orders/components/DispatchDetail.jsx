// PATH: src/features/orders/components/DispatchDetail.jsx
import { useState } from 'react'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import { getDispatchSummary, PAYMENT_STATUS } from '../hooks/useReceivablesSummary.js'
import { useAuth } from '../../../context/AuthContext.jsx'

export default function DispatchDetail({ order, retailerName, productName, onBack, onMarkPaid }) {
  const { user } = useAuth()
  const currency = user?.currency || '₹'
  const { status, remaining, overdue } = getDispatchSummary(order)
  const [confirming, setConfirming] = useState(false)

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <button type="button" onClick={onBack} className="flex items-center gap-2 text-sm font-medium text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] lg:gap-2.5 lg:text-base">
        <ArrowLeft size={16} strokeWidth={2} className="lg:h-5 lg:w-5" />
        Back
      </button>

      <div>
        <h2 className="font-sans text-xl font-bold text-[var(--color-ink)] lg:text-3xl">{retailerName}</h2>
        <p className="text-sm text-[var(--color-ink-muted)] lg:text-base">
          {new Date(order.dispatched_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>
      </div>

      <div className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-paper-light)] px-4 py-2.5 lg:px-6 lg:py-4">
        <span className="text-sm text-[var(--color-ink)] lg:text-base">{productName}</span>
        <span className="font-mono text-sm text-[var(--color-ink-muted)] lg:text-base">×{order.quantity}</span>
      </div>

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] p-4 lg:p-6">
        <div className="flex justify-between text-sm lg:text-base">
          <span className="text-[var(--color-ink-muted)]">Total</span>
          <span className="font-mono text-[var(--color-ink)]">{currency}{order.total_amount}</span>
        </div>
        <div className="mt-1 flex justify-between text-sm lg:text-base">
          <span className="text-[var(--color-ink-muted)]">Paid</span>
          <span className="font-mono text-[var(--color-ink)]">{currency}{order.amount_paid ?? 0}</span>
        </div>
        {status !== PAYMENT_STATUS.PAID && (
          <div className="mt-1 flex justify-between border-t border-[var(--color-border)] pt-2 text-sm lg:pt-3 lg:text-base">
            <span className="font-medium text-[var(--color-error)]">{overdue ? 'Overdue' : 'Remaining'}</span>
            <span className="font-mono font-medium text-[var(--color-error)]">{currency}{remaining}</span>
          </div>
        )}
      </div>

      {status !== PAYMENT_STATUS.PAID && (
        <button
          type="button"
          onClick={() => {
            if (!confirming) { setConfirming(true); return }
            onMarkPaid(order, remaining)
          }}
          className="flex items-center justify-center gap-2 rounded-xl bg-[var(--color-stamp)] py-4 font-sans text-base font-semibold text-[var(--color-paper-light)] hover:bg-[var(--color-stamp-dark)] lg:gap-3 lg:py-5 lg:text-lg"
        >
          <CheckCircle2 size={20} strokeWidth={2} className="lg:h-6 lg:w-6" />
          {confirming ? `Confirm ${currency}${remaining} received` : 'Mark as paid'}
        </button>
      )}
    </div>
  )
}