// PATH: src/features/ai-insights/components/InsightCard.jsx

import { CheckCircle2, Eye, Target } from 'lucide-react'
import { INSIGHT_CATEGORY } from '../hooks/useInsightsDigest.js'

// Same icon+word convention as MaterialRow/DispatchRow — category is
// never color alone.
const CATEGORY_CONFIG = {
  [INSIGHT_CATEGORY.STRENGTH]: {
    icon: CheckCircle2,
    label: 'Going well',
    className: 'border-[var(--color-success)] text-[var(--color-success)]',
  },
  [INSIGHT_CATEGORY.WATCH]: {
    icon: Eye,
    label: 'Worth watching',
    className: 'border-[var(--color-warning,#b45309)] text-[var(--color-warning,#b45309)]',
  },
  [INSIGHT_CATEGORY.ACTION]: {
    icon: Target,
    label: 'Do this',
    className: 'border-[var(--color-error)] text-[var(--color-error)]',
  },
}

export default function InsightCard({ insight }) {
  const { icon: Icon, label, className } = CATEGORY_CONFIG[insight.category]

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] p-4 lg:gap-3 lg:p-6">
      <span
        className={`flex w-fit items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium lg:gap-1.5 lg:text-sm ${className}`}
      >
        <Icon size={12} strokeWidth={2} className="lg:h-[14px] lg:w-[14px]" />
        {label}
      </span>
      <p className="font-sans text-sm font-semibold text-[var(--color-ink)] lg:text-base">
        {insight.title}
      </p>
      <p className="text-sm text-[var(--color-ink-muted)] lg:text-base">{insight.detail}</p>
    </div>
  )
}
