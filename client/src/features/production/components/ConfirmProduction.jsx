import { Check } from 'lucide-react'

export default function ConfirmProduction({ product, quantity, consumption, onConfirm }) {
  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <div className="flex items-center rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] px-4 py-3 lg:px-6 lg:py-4">
        <div>
          <p className="font-sans text-base font-semibold text-[var(--color-ink)] lg:text-lg">
            {product.name}
          </p>
          <p className="font-mono text-sm text-[var(--color-ink-muted)] lg:text-base">{quantity} units</p>
        </div>
      </div>

      <div>
        <h2 className="mb-2 font-sans text-sm font-semibold text-[var(--color-ink-muted)] lg:mb-3 lg:text-base">
          Materials used
        </h2>
        <div className="flex flex-col gap-2 lg:gap-3">
          {consumption.map((m) => {
            const willRunLow = m.qtyOnHand - m.consumed < m.qtyOnHand * 0.15
            return (
              <div
                key={m.id}
                className={`flex flex-col gap-0.5 rounded-lg border px-4 py-2.5 lg:px-6 lg:py-4 ${
                  willRunLow
                    ? 'border-[var(--color-error)] bg-[var(--color-paper-light)]'
                    : 'border-[var(--color-border)] bg-[var(--color-paper-light)]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--color-ink)] lg:text-base">{m.name}</span>
                  <span
                    className={`font-mono text-sm font-medium lg:text-base ${
                      willRunLow ? 'text-[var(--color-error)]' : 'text-[var(--color-ink-muted)]'
                    }`}
                  >
                    -{m.consumed.toFixed(2)} {m.unit}
                  </span>
                </div>
                {/* Spelled out, not just color — a rushed glance shouldn't
                    be the only way this registers. */}
                {willRunLow && (
                  <span className="text-xs font-medium text-[var(--color-error)] lg:text-sm">
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
        className="flex items-center justify-center gap-2 rounded-xl bg-[var(--color-stamp)] py-4 font-sans text-base font-semibold text-[var(--color-paper-light)] hover:bg-[var(--color-stamp-dark)] lg:gap-3 lg:py-5 lg:text-lg"
      >
        <Check size={20} strokeWidth={2} className="lg:h-6 lg:w-6" />
        Confirm production
      </button>
    </div>
  )
}