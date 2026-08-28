// PATH: src/features/inventory/components/MaterialDetail.jsx

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
    <div className="flex flex-col gap-6 lg:gap-8">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-2 text-sm font-medium text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] lg:gap-2.5 lg:text-base"
      >
        <ArrowLeft size={16} strokeWidth={2} className="lg:h-5 lg:w-5" />
        Back
      </button>

      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-sans text-xl font-bold text-[var(--color-ink)] lg:text-3xl">{material.name}</h2>
          <p className="font-mono text-sm text-[var(--color-ink-muted)] lg:text-base">
            {material.qtyOnHand} {material.unit} on hand
          </p>
        </div>
        <span
          className={`flex flex-shrink-0 items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium lg:px-2.5 lg:py-1.5 lg:text-sm ${className}`}
        >
          <Icon size={12} strokeWidth={2} className="lg:h-[14px] lg:w-[14px]" />
          {text}
        </span>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] p-4 lg:gap-4 lg:p-6">
        <div className="flex justify-between text-sm lg:text-base">
          <span className="text-[var(--color-ink-muted)]">Runway</span>
          <span className="font-mono text-[var(--color-ink)]">{label}</span>
        </div>
        <div className="flex justify-between text-sm lg:text-base">
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
        className="flex items-center justify-center gap-2 rounded-xl bg-[var(--color-stamp)] py-4 font-sans text-base font-semibold text-[var(--color-paper-light)] hover:bg-[var(--color-stamp-dark)] lg:gap-3 lg:py-5 lg:text-lg"
      >
        <PlusCircle size={20} strokeWidth={2} className="lg:h-6 lg:w-6" />
        Log restock
      </button>
    </div>
  )
}