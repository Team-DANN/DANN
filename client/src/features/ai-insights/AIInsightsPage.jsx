// PATH: src/features/ai-insights/AIInsightsPage.jsx

import { useState } from 'react'
import PeriodFilter from '../finance/components/PeriodFilter.jsx'
import { defaultPeriod } from '../finance/hooks/useFinanceSummary.js'
import { useInsightsDigest, INSIGHT_CATEGORY } from './hooks/useInsightsDigest.js'
import InsightCard from './components/InsightCard.jsx'
import ChatAssistant from './components/ChatAssistant.jsx'

export default function AIInsightsPage() {
  const [period, setPeriod] = useState(defaultPeriod())
  const insights = useInsightsDigest(period)

  const actions = insights.filter((i) => i.category === INSIGHT_CATEGORY.ACTION)
  const watch = insights.filter((i) => i.category === INSIGHT_CATEGORY.WATCH)
  const strengths = insights.filter((i) => i.category === INSIGHT_CATEGORY.STRENGTH)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-sans text-xl font-bold text-[var(--color-ink)]">Insights</h1>
        <p className="text-sm text-[var(--color-ink-muted)]">
          A quick read on how things are going, put together from your own numbers.
        </p>
      </div>

      <PeriodFilter period={period} onChange={setPeriod} />

      {actions.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="font-sans text-sm font-semibold text-[var(--color-ink)]">Do this next</h2>
          <div className="flex flex-col gap-2">
            {actions.map((i) => (
              <InsightCard key={i.id} insight={i} />
            ))}
          </div>
        </div>
      )}

      {watch.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="font-sans text-sm font-semibold text-[var(--color-ink)]">Worth watching</h2>
          <div className="flex flex-col gap-2">
            {watch.map((i) => (
              <InsightCard key={i.id} insight={i} />
            ))}
          </div>
        </div>
      )}

      {strengths.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="font-sans text-sm font-semibold text-[var(--color-ink)]">Going well</h2>
          <div className="flex flex-col gap-2">
            {strengths.map((i) => (
              <InsightCard key={i.id} insight={i} />
            ))}
          </div>
        </div>
      )}

      {insights.length === 0 && (
        <p className="py-6 text-center text-sm text-[var(--color-ink-muted)]">
          Not enough activity in this period to generate a summary.
        </p>
      )}

      <ChatAssistant period={period} />
    </div>
  )
}