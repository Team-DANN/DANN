// PATH: src/features/finance/components/ProfitSummaryCards.jsx

import { IndianRupee, TrendingUp, TrendingDown, Wallet } from 'lucide-react'

function formatRupees(n) {
  return `₹${Math.round(n).toLocaleString('en-IN')}`
}

function Card({ label, value, tone, icon: Icon }) {
  const toneClass =
    tone === 'positive'
      ? 'text-[var(--color-success)]'
      : tone === 'negative'
        ? 'text-[var(--color-error)]'
        : 'text-[var(--color-ink)]'

  return (
    <div className="flex flex-col gap-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] p-4 lg:gap-2 lg:p-6">
      <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-ink-muted)] lg:gap-2 lg:text-sm">
        <Icon size={14} strokeWidth={2} className="lg:h-4 lg:w-4" />
        {label}
      </span>
      <span className={`font-mono text-xl font-semibold lg:text-3xl xl:text-4xl ${toneClass}`}>{value}</span>
    </div>
  )
}

// Four numbers, nothing more — clarity over completeness. "Profit" here is
// revenue invoiced minus material cost spent (see useFinanceSummary).
export default function ProfitSummaryCards({ revenue, costs, profit, outstanding }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4">
      <Card label="Revenue" value={formatRupees(revenue)} icon={IndianRupee} />
      <Card label="Costs" value={formatRupees(costs)} icon={TrendingDown} />
      <Card
        label="Profit"
        value={formatRupees(profit)}
        tone={profit >= 0 ? 'positive' : 'negative'}
        icon={TrendingUp}
      />
      <Card label="Owed to you" value={formatRupees(outstanding)} icon={Wallet} />
    </div>
  )
}