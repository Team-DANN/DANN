import { AlertTriangle, Clock, CheckCircle2, HelpCircle } from 'lucide-react'
import { useRunwayEstimate, RUNWAY_STATUS } from '../hooks/useRunwayEstimate.js'

// Status shown as icon + word, never color alone — same rule Production's
// low-stock warning follows.
const STATUS_CONFIG = {
  [RUNWAY_STATUS.CRITICAL]: {
    icon: AlertTriangle,
    text: 'Critical',
    className: 'border-[var(--color-error)] text-[var(--color-error)]',
  },
  [RUNWAY_STATUS.LOW]: {
    icon: Clock,
    text: 'Low',
    className: 'border-[var(--color-warning,#b45309)] text-[var(--color-warning,#b45309)]',
  },
  [RUNWAY_STATUS.OK]: {
    icon: CheckCircle2,
    text: 'OK',
    className: 'border-[var(--color-success)] text-[var(--color-success)]',
  },
  [RUNWAY_STATUS.UNKNOWN]: {
    icon: HelpCircle,
    text: 'No data',
    className: 'border-[var(--color-border)] text-[var(--color-ink-muted)]',
  },
}

export default function MaterialRow({ material, onClick }) {
  const { label, status } = useRunwayEstimate(material)
  const { icon: Icon, text, className } = STATUS_CONFIG[status]

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] px-4 py-3 text-left active:bg-[var(--color-paper)]"
    >
      <div className="flex min-w-0 flex-col">
        <span className="truncate font-sans text-sm font-semibold text-[var(--color-ink)]">
          {material.name}
        </span>
        <span className="font-mono text-xs text-[var(--color-ink-muted)]">
          {material.qtyOnHand} {material.unit} on hand
        </span>
      </div>

      <div className="flex flex-shrink-0 items-center gap-3">
        <span className="font-mono text-xs text-[var(--color-ink-muted)]">{label}</span>
        <span
          className={`flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium ${className}`}
        >
          <Icon size={12} strokeWidth={2} />
          {text}
        </span>
      </div>
    </button>
  )
}