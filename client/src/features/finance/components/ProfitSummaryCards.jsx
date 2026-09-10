// PATH: src/features/finance/components/ProfitSummaryCards.jsx

import { IndianRupee, TrendingUp, TrendingDown, Wallet, ArrowUp, ArrowDown } from 'lucide-react'
import { useAuth } from '../../../context/AuthContext.jsx'
import { formatCurrency } from '../../../lib/formatCurrency.js'

function Card({ label, value, tone, icon: Icon, trendPercent }) {
  const toneClass =
    tone === 'positive'
      ? 'text-[var(--color-success)]'
      : tone === 'negative'
        ? 'text-[var(--color-error)]'
        : 'text-[var(--color-ink)]'

  // trendPercent is null for "All time" (no meaningful previous period to
  // compare against) — no arrow renders at all in that case, rather than
  // showing a fake 0% or defaulting to some direction.
  const hasTrend = trendPercent !== null && trendPercent !== undefined
  const TrendArrow = hasTrend && trendPercent < 0 ? ArrowDown : ArrowUp
  const trendClass = hasTrend
    ? trendPercent >= 0
      ? 'text-[var(--color-success)]'
      : 'text-[var(--color-error)]'
    : ''

  return (
    <div className="flex flex-col gap-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] p-4 lg:gap-2 lg:p-6">
      <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-ink-muted)] lg:gap-2 lg:text-sm">
        <Icon size={14} strokeWidth={2} className="lg:h-4 lg:w-4" />
        {label}
      </span>
      <div className="flex items-baseline gap-2">
        <span className={`font-mono text-xl font-semibold lg:text-3xl xl:text-4xl ${toneClass}`}>{value}</span>
        {hasTrend && (
          <span className={`flex items-center gap-0.5 text-xs font-medium lg:text-sm ${trendClass}`}>
            <TrendArrow size={12} strokeWidth={2.5} className="lg:h-3.5 lg:w-3.5" />
            {Math.abs(trendPercent)}%
          </span>
        )}
      </div>
    </div>
  )
}

// Four numbers, nothing more — clarity over completeness. "Profit" here is
// revenue invoiced minus material + labor cost spent (see
// ReportService.getProfitSummary).
//
// profitTrendPercent compares this period's net profit against the
// immediately preceding period of the same length
// (ReportService.getProfitSummaryWithTrend) — arrow direction and color
// reflect a REAL comparison, not a guess: up+green means profit grew
// vs. the prior equivalent period, down+red means it shrank. Null for
// "All time" (no previous all-time to compare against), in which case no
// arrow shows at all.
export default function ProfitSummaryCards({ revenue, costs, profit, outstanding, profitTrendPercent }) {
  const { user } = useAuth()
  const currency = user?.currency || '₹'

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4">
      <Card label="Revenue" value={formatCurrency(revenue, currency)} icon={IndianRupee} />
      <Card label="Costs" value={formatCurrency(costs, currency)} icon={TrendingDown} />
      <Card
        label="Profit"
        value={formatCurrency(profit, currency)}
        tone={profit >= 0 ? 'positive' : 'negative'}
        icon={TrendingUp}
        trendPercent={profitTrendPercent}
      />
      <Card label="Owed to you" value={formatCurrency(outstanding, currency)} icon={Wallet} />
    </div>
  )
}