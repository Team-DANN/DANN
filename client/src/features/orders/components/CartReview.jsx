import { Plus, Pencil, Trash2 } from 'lucide-react'

export default function CartReview({ cart, currency, onEditLine, onRemoveLine, onAddAnother, onContinue }) {
  const cartTotal = cart.reduce((sum, line) => sum + (line.product.selling_price ?? 0) * line.quantity, 0)

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      {cart.length === 0 ? (
        <p className="py-6 text-center text-sm text-[var(--color-ink-muted)] lg:py-8 lg:text-base">
          No products added yet.
        </p>
      ) : (
        <div className="flex flex-col gap-2 lg:gap-3">
          {cart.map((line, index) => (
            <div
              key={line.product.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] px-4 py-3 lg:px-6 lg:py-4"
            >
              <div className="flex min-w-0 flex-col">
                <span className="truncate font-sans text-sm font-semibold text-[var(--color-ink)] lg:text-base">
                  {line.product.name}
                </span>
                <span className="text-xs text-[var(--color-ink-muted)] lg:text-sm">
                  ×{line.quantity} · {currency}{((line.product.selling_price ?? 0) * line.quantity).toFixed(2)}
                </span>
              </div>
              <div className="flex flex-shrink-0 items-center gap-1 lg:gap-2">
                <button
                  type="button"
                  onClick={() => onEditLine(index)}
                  aria-label={`Edit ${line.product.name}`}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-ink-muted)] hover:text-[var(--color-stamp)] lg:h-10 lg:w-10"
                >
                  <Pencil size={16} strokeWidth={2} className="lg:h-[18px] lg:w-[18px]" />
                </button>
                <button
                  type="button"
                  onClick={() => onRemoveLine(index)}
                  aria-label={`Remove ${line.product.name}`}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-ink-muted)] hover:text-[var(--color-error)] lg:h-10 lg:w-10"
                >
                  <Trash2 size={16} strokeWidth={2} className="lg:h-[18px] lg:w-[18px]" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {cart.length > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] px-4 py-3 lg:px-6 lg:py-4">
          <span className="text-sm font-medium text-[var(--color-ink-muted)] lg:text-base">
            Total ({cart.length} product{cart.length === 1 ? '' : 's'})
          </span>
          <span className="font-mono text-lg font-bold text-[var(--color-ink)] lg:text-xl">
            {currency}{cartTotal.toFixed(2)}
          </span>
        </div>
      )}

      <button
        type="button"
        onClick={onAddAnother}
        className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--color-border)] py-3 text-sm font-medium text-[var(--color-ink-muted)] hover:border-[var(--color-stamp)] hover:text-[var(--color-stamp)] lg:gap-3 lg:py-4 lg:text-base"
      >
        <Plus size={18} strokeWidth={2} className="lg:h-5 lg:w-5" />
        Add another product
      </button>

      {cart.length > 0 && (
        <button
          type="button"
          onClick={onContinue}
          className="rounded-xl bg-[var(--color-stamp)] py-4 font-sans text-base font-semibold text-[var(--color-paper-light)] hover:bg-[var(--color-stamp-dark)] lg:py-5 lg:text-lg"
        >
          Continue to payment
        </button>
      )}
    </div>
  )
}