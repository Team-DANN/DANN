// PATH: src/features/ai-insights/components/InsightCard.jsx

import { AlertTriangle, Eye, Info } from 'lucide-react'
import { INSIGHT_SEVERITY } from '../hooks/useInsightsDigest.js'

const SEVERITY_CONFIG = {
  [INSIGHT_SEVERITY.CRITICAL]: {
    icon: AlertTriangle,
    label: 'Urgent',
    className: 'border-[var(--color-error)] text-[var(--color-error)]',
  },
  [INSIGHT_SEVERITY.WARNING]: {
    icon: Eye,
    label: 'Needs attention',
    className: 'border-[var(--color-warning,#b45309)] text-[var(--color-warning,#b45309)]',
  },
  [INSIGHT_SEVERITY.INFO]: {
    icon: Info,
    label: 'Worth noting',
    className: 'border-[var(--color-ink-muted)] text-[var(--color-ink-muted)]',
  },
}

export default function InsightCard({ insight }) {
  const config = SEVERITY_CONFIG[insight.severity] ?? SEVERITY_CONFIG[INSIGHT_SEVERITY.INFO]
  const { icon: Icon, label, className } = config

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] p-4 lg:gap-3 lg:p-6">
      <span
        className={`flex w-fit items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium lg:gap-1.5 lg:text-sm ${className}`}
      >
        <Icon size={12} strokeWidth={2} className="lg:h-[14px] lg:w-[14px]" />
        {label}
      </span>
      <p className="text-sm text-[var(--color-ink)] lg:text-base">{insight.message}</p>
    </div>
  )
}