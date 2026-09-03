// PATH: src/features/finance/FinancePage.jsx
import { useState } from 'react'
import { useFinanceSummary, defaultPeriod } from './hooks/useFinanceSummary.js'
import PeriodFilter from './components/PeriodFilter.jsx'
import ProfitSummaryCards from './components/ProfitSummaryCards.jsx'
import ProfitTrendChart from './components/ProfitTrendChart.jsx'
import ProfitByProductTable from './components/ProfitByProductTable.jsx'
import ReceivablesSnapshot from './components/ReceivablesSnapshot.jsx'

export default function FinancePage() {
  const [period, setPeriod] = useState(defaultPeriod())
  const { revenue, costs, profit, outstanding, trend, byProduct, loading, error } =
    useFinanceSummary(period)

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <h1 className="font-sans text-xl font-bold text-[var(--color-ink)] sm:text-2xl lg:text-3xl xl:text-4xl">
        Profit
      </h1>

      <PeriodFilter period={period} onChange={setPeriod} />

      {error && (
        <p className="rounded-xl border border-[var(--color-error)] bg-[var(--color-paper-light)] px-4 py-3 text-sm text-[var(--color-error)]">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-[var(--color-ink-muted)]">Loading…</p>
      ) : (
        <>
          <ProfitSummaryCards revenue={revenue} costs={costs} profit={profit} outstanding={outstanding} />
          <ProfitTrendChart trend={trend} />
        </>
      )}

      <div className="flex flex-col gap-2 lg:gap-3">
        <h2 className="font-sans text-sm font-semibold text-[var(--color-ink)] lg:text-base">Owed to you</h2>
        <ReceivablesSnapshot />
      </div>

      <div className="flex flex-col gap-2 lg:gap-3">
        <h2 className="font-sans text-sm font-semibold text-[var(--color-ink)] lg:text-base">By product</h2>
        <ProfitByProductTable byProduct={byProduct} />
      </div>
    </div>
  )
}