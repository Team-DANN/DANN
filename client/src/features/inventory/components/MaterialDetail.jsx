// PATH: src/features/inventory/components/MaterialDetail.jsx
// Reconstructed — the file previously at this path actually contained
// MaterialList's code, not a detail view. Rebuilt from how InventoryPage,
// RestockEntry, and MaterialRow already expect this component to behave.

import { ArrowLeft, AlertTriangle, Clock, CheckCircle2, HelpCircle, PlusCircle } from 'lucide-react'
import { useRunwayEstimate, RUNWAY_STATUS } from '../hooks/useRunwayEstimate.js'

// Same status → icon/word/color mapping as MaterialRow — status is never
// color alone anywhere in this app, and this shouldn't be the exception.
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

export default function MaterialDetail({ material, onBack, onRestock }) {
  const { label, status } = useRunwayEstimate(material)
  const { icon: Icon, text, className } = STATUS_CONFIG[status]

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

      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-sans text-xl font-bold text-[var(--color-ink)]">{material.name}</h2>
          <p className="font-mono text-sm text-[var(--color-ink-muted)]">
            {material.qtyOnHand} {material.unit} on hand
          </p>
        </div>
        <span
          className={`flex flex-shrink-0 items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium ${className}`}
        >
          <Icon size={12} strokeWidth={2} />
          {text}
        </span>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] p-4">
        <div className="flex justify-between text-sm">
          <span className="text-[var(--color-ink-muted)]">Runway</span>
          <span className="font-mono text-[var(--color-ink)]">{label}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-[var(--color-ink-muted)]">Avg. daily use</span>
          <span className="font-mono text-[var(--color-ink)]">
            {material.avgDailyConsumption > 0
              ? `${material.avgDailyConsumption.toFixed(1)} ${material.unit}/day`
              : 'No data yet'}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={onRestock}
        className="flex items-center justify-center gap-2 rounded-xl bg-[var(--color-stamp)] py-4 font-sans text-base font-semibold text-[var(--color-paper-light)] hover:bg-[var(--color-stamp-dark)]"
      >
        <PlusCircle size={20} strokeWidth={2} />
        Log restock
      </button>
    </div>
  )
}
