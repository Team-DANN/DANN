import { Mic, Loader2, Check, RotateCcw } from 'lucide-react'
import { useVoiceLogging } from '../hooks/useVoiceLogging.js'
import { extendedProductCatalog } from '../data/productionMock.js'

// Never auto-confirms a batch from voice alone — a misheard number here
// means wrong materials deducted. Parsed result always lands in a
// confirm-or-retry strip before it's handed off to the parent flow.
export default function VoiceLogButton({ onConfirm }) {
  const { status, result, startListening, reset, STATUS } = useVoiceLogging()

  const matchedProduct = result
    ? extendedProductCatalog.find((p) => p.id === result.productId)
    : null

  if (status === STATUS.IDLE) {
    return (
      <button
        type="button"
        onClick={startListening}
        className="flex items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] px-4 py-3 text-sm font-medium text-[var(--color-ink)] hover:border-[var(--color-stamp)] lg:gap-3 lg:px-6 lg:py-4 lg:text-base"
      >
        <Mic size={18} strokeWidth={2} className="lg:h-5 lg:w-5" />
        Log by voice
      </button>
    )
  }

  if (status === STATUS.LISTENING || status === STATUS.PARSING) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border border-[var(--color-stamp)] bg-[var(--color-paper-light)] px-4 py-3 text-sm font-medium text-[var(--color-stamp)] lg:gap-3 lg:px-6 lg:py-4 lg:text-base">
        <Loader2 size={18} strokeWidth={2} className="animate-spin lg:h-5 lg:w-5" />
        {status === STATUS.LISTENING ? 'Listening…' : 'Understanding…'}
      </div>
    )
  }

  if (status === STATUS.ERROR) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-error)] bg-[var(--color-paper-light)] px-4 py-3 lg:px-6 lg:py-4">
        <span className="text-sm text-[var(--color-error)] lg:text-base">Didn't catch that clearly.</span>
        <button
          type="button"
          onClick={startListening}
          className="flex items-center gap-1 text-sm font-medium text-[var(--color-ink)] lg:gap-1.5 lg:text-base"
        >
          <RotateCcw size={14} strokeWidth={2} className="lg:h-4 lg:w-4" />
          Try again
        </button>
      </div>
    )
  }

  // RESULT — show what was heard, require an explicit confirm.
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] p-3 lg:gap-3 lg:p-5">
      <p className="text-xs text-[var(--color-ink-muted)] lg:text-sm">Heard: "{result.transcript}"</p>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-[var(--color-ink)] lg:text-base">
          {matchedProduct?.name} — {result.quantity} units
        </span>
        <div className="flex items-center gap-2 lg:gap-3">
          <button type="button" onClick={reset} aria-label="Retry" className="text-[var(--color-ink-muted)]">
            <RotateCcw size={16} strokeWidth={2} className="lg:h-5 lg:w-5" />
          </button>
          <button
            type="button"
            onClick={() => onConfirm(matchedProduct, result.quantity)}
            className="flex items-center gap-1 rounded-lg bg-[var(--color-stamp)] px-3 py-1.5 text-sm font-semibold text-[var(--color-paper-light)] lg:gap-1.5 lg:px-4 lg:py-2 lg:text-base"
          >
            <Check size={14} strokeWidth={2} className="lg:h-4 lg:w-4" />
            Use this
          </button>
        </div>
      </div>
    </div>
  )
}