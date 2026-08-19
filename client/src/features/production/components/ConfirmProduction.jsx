import { Check } from 'lucide-react'

export default function ConfirmProduction({ product, quantity, consumption, onConfirm }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] px-4 py-3">
        <div>
          <p className="font-sans text-base font-semibold text-[var(--color-ink)]">
            {product.name}
          </p>
          <p className="font-mono text-sm text-[var(--color-ink-muted)]">{quantity} units</p>
        </div>
      </div>

      <div>
        <h2 className="mb-2 font-sans text-sm font-semibold text-[var(--color-ink-muted)]">
          Materials used
        </h2>
        <div className="flex flex-col gap-2">
          {consumption.map((m) => {
            const willRunLow = m.qtyOnHand - m.consumed < m.qtyOnHand * 0.15
            return (
              <div
                key={m.id}
                className={`flex flex-col gap-0.5 rounded-lg border px-4 py-2.5 ${
                  willRunLow
                    ? 'border-[var(--color-error)] bg-[var(--color-paper-light)]'
                    : 'border-[var(--color-border)] bg-[var(--color-paper-light)]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--color-ink)]">{m.name}</span>
                  <span
                    className={`font-mono text-sm font-medium ${
                      willRunLow ? 'text-[var(--color-error)]' : 'text-[var(--color-ink-muted)]'
                    }`}
                  >
                    -{m.consumed.toFixed(2)} {m.unit}
                  </span>
                </div>
                {/* Spelled out, not just color — a rushed glance shouldn't
                    be the only way this registers. */}
                {willRunLow && (
                  <span className="text-xs font-medium text-[var(--color-error)]">
                    Will trigger low-stock alert after this batch
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={onConfirm}
        className="flex items-center justify-center gap-2 rounded-xl bg-[var(--color-stamp)] py-4 font-sans text-base font-semibold text-[var(--color-paper-light)] hover:bg-[var(--color-stamp-dark)]"
      >
        <Check size={20} strokeWidth={2} />
        Confirm production
      </button>
    </div>
  )
}
