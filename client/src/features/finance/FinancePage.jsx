// PATH: src/features/finance/FinancePage.jsx
// (replaces the existing stub of the same name)

import { useState } from 'react'
import { useFinanceSummary, defaultPeriod } from './hooks/useFinanceSummary.js'
import PeriodFilter from './components/PeriodFilter.jsx'
import ProfitSummaryCards from './components/ProfitSummaryCards.jsx'
import ProfitTrendChart from './components/ProfitTrendChart.jsx'
import ProfitByProductTable from './components/ProfitByProductTable.jsx'
import ReceivablesSnapshot from './components/ReceivablesSnapshot.jsx'

export default function FinancePage() {
  const [period, setPeriod] = useState(defaultPeriod())
  const { revenue, costs, profit, outstanding, trend, byProduct, dispatches } =
    useFinanceSummary(period)

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-sans text-xl font-bold text-[var(--color-ink)]">Profit</h1>

      <PeriodFilter period={period} onChange={setPeriod} />

      <ProfitSummaryCards revenue={revenue} costs={costs} profit={profit} outstanding={outstanding} />

      <ProfitTrendChart trend={trend} />

      <div className="flex flex-col gap-2">
        <h2 className="font-sans text-sm font-semibold text-[var(--color-ink)]">Owed to you</h2>
        <ReceivablesSnapshot dispatches={dispatches} />
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="font-sans text-sm font-semibold text-[var(--color-ink)]">By product</h2>
        <ProfitByProductTable byProduct={byProduct} />
      </div>
    </div>
  )
}
