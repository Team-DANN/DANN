import { useState } from 'react'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import { getDispatchSummary, PAYMENT_STATUS } from '../hooks/useReceivablesSummary.js'
import { mockRetailers, productName } from '../data/ordersMock.js'

export default function DispatchDetail({ dispatch, onBack, onMarkPaid }) {
  const { status, remaining, overdue } = getDispatchSummary(dispatch)
  const retailer = mockRetailers.find((r) => r.id === dispatch.retailerId)
  const [confirming, setConfirming] = useState(false)

  return (
    <div className="flex flex-col gap-6">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-2 text-sm font-medium text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
      >
        <ArrowLeft size={16} strokeWidth={2} />
        Back
      </button>

      <div>
        <h2 className="font-sans text-xl font-bold text-[var(--color-ink)]">{retailer?.name}</h2>
        <p className="text-sm text-[var(--color-ink-muted)]">
          {new Date(dispatch.date).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {dispatch.items.map((item, i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-paper-light)] px-4 py-2.5"
          >
            <span className="text-sm text-[var(--color-ink)]">{productName(item.productId)}</span>
            <span className="font-mono text-sm text-[var(--color-ink-muted)]">×{item.qty}</span>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] p-4">
        <div className="flex justify-between text-sm">
          <span className="text-[var(--color-ink-muted)]">Total</span>
          <span className="font-mono text-[var(--color-ink)]">₹{dispatch.amount}</span>
        </div>
        <div className="mt-1 flex justify-between text-sm">
          <span className="text-[var(--color-ink-muted)]">Paid</span>
          <span className="font-mono text-[var(--color-ink)]">₹{dispatch.amountPaid}</span>
        </div>
        {status !== PAYMENT_STATUS.PAID && (
          <div className="mt-1 flex justify-between border-t border-[var(--color-border)] pt-2 text-sm">
            <span className="font-medium text-[var(--color-error)]">
              {overdue ? 'Overdue' : 'Remaining'}
            </span>
            <span className="font-mono font-medium text-[var(--color-error)]">₹{remaining}</span>
          </div>
        )}
      </div>

      {status !== PAYMENT_STATUS.PAID && (
        <button
          type="button"
          onClick={() => {
            if (!confirming) {
              setConfirming(true)
              return
            }
            onMarkPaid(dispatch.id)
          }}
          className="flex items-center justify-center gap-2 rounded-xl bg-[var(--color-stamp)] py-4 font-sans text-base font-semibold text-[var(--color-paper-light)] hover:bg-[var(--color-stamp-dark)]"
        >
          <CheckCircle2 size={20} strokeWidth={2} />
          {confirming ? `Confirm ₹${remaining} received` : 'Mark as paid'}
        </button>
      )}
    </div>
  )
}