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
        className="flex items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] px-4 py-3 text-sm font-medium text-[var(--color-ink)] hover:border-[var(--color-stamp)]"
      >
        <Mic size={18} strokeWidth={2} />
        Log by voice
      </button>
    )
  }

  if (status === STATUS.LISTENING || status === STATUS.PARSING) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border border-[var(--color-stamp)] bg-[var(--color-paper-light)] px-4 py-3 text-sm font-medium text-[var(--color-stamp)]">
        <Loader2 size={18} strokeWidth={2} className="animate-spin" />
        {status === STATUS.LISTENING ? 'Listening…' : 'Understanding…'}
      </div>
    )
  }

  if (status === STATUS.ERROR) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-error)] bg-[var(--color-paper-light)] px-4 py-3">
        <span className="text-sm text-[var(--color-error)]">Didn't catch that clearly.</span>
        <button
          type="button"
          onClick={startListening}
          className="flex items-center gap-1 text-sm font-medium text-[var(--color-ink)]"
        >
          <RotateCcw size={14} strokeWidth={2} />
          Try again
        </button>
      </div>
    )
  }

  // RESULT — show what was heard, require an explicit confirm.
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] p-3">
      <p className="text-xs text-[var(--color-ink-muted)]">Heard: "{result.transcript}"</p>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-[var(--color-ink)]">
          {matchedProduct?.name} — {result.quantity} units
        </span>
        <div className="flex items-center gap-2">
          <button type="button" onClick={reset} aria-label="Retry" className="text-[var(--color-ink-muted)]">
            <RotateCcw size={16} strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={() => onConfirm(matchedProduct, result.quantity)}
            className="flex items-center gap-1 rounded-lg bg-[var(--color-stamp)] px-3 py-1.5 text-sm font-semibold text-[var(--color-paper-light)]"
          >
            <Check size={14} strokeWidth={2} />
            Use this
          </button>
        </div>
      </div>
    </div>
  )
}
