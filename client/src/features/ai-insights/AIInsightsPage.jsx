// PATH: src/features/ai-insights/AIInsightsPage.jsx

import { Loader2, AlertCircle } from 'lucide-react'
import { useInsightsDigest, INSIGHT_SEVERITY } from './hooks/useInsightsDigest.js'
import InsightCard from './components/InsightCard.jsx'
import ChatAssistant from './components/ChatAssistant.jsx'

export default function AIInsightsPage() {
  const { insights, isLoading, error, refresh } = useInsightsDigest()

  const critical = insights.filter((i) => i.severity === INSIGHT_SEVERITY.CRITICAL)
  const warning = insights.filter((i) => i.severity === INSIGHT_SEVERITY.WARNING)
  const info = insights.filter((i) => i.severity === INSIGHT_SEVERITY.INFO)

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <div>
        <h1 className="font-sans text-xl font-bold text-[var(--color-ink)] sm:text-2xl lg:text-3xl xl:text-4xl">
          Insights
        </h1>
        <p className="text-sm text-[var(--color-ink-muted)] lg:text-base">
          A quick read on how things are going, put together from your own numbers.
        </p>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-[var(--color-ink-muted)] lg:text-base">
          <Loader2 className="animate-spin" size={18} aria-hidden="true" />
          Loading insights…
        </div>
      )}

      {!isLoading && error && (
        <div className="flex flex-col items-center gap-2 py-12 text-center text-sm text-[var(--color-error)] lg:text-base">
          <AlertCircle size={20} aria-hidden="true" />
          <p>Couldn't load insights right now. {error}</p>
          <button
            type="button"
            onClick={refresh}
            className="mt-1 rounded-md border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium text-[var(--color-ink)] hover:bg-[var(--color-paper)]"
          >
            Try again
          </button>
        </div>
      )}

      {!isLoading && !error && (
        <>
          {critical.length > 0 && (
            <div className="flex flex-col gap-2 lg:gap-3">
              <h2 className="font-sans text-sm font-semibold text-[var(--color-ink)] lg:text-base">
                Urgent
              </h2>
              <div className="flex flex-col gap-2 lg:gap-3">
                {critical.map((i) => (
                  <InsightCard key={i.id} insight={i} />
                ))}
              </div>
            </div>
          )}

          {warning.length > 0 && (
            <div className="flex flex-col gap-2 lg:gap-3">
              <h2 className="font-sans text-sm font-semibold text-[var(--color-ink)] lg:text-base">
                Needs attention
              </h2>
              <div className="flex flex-col gap-2 lg:gap-3">
                {warning.map((i) => (
                  <InsightCard key={i.id} insight={i} />
                ))}
              </div>
            </div>
          )}

          {info.length > 0 && (
            <div className="flex flex-col gap-2 lg:gap-3">
              <h2 className="font-sans text-sm font-semibold text-[var(--color-ink)] lg:text-base">
                Worth noting
              </h2>
              <div className="flex flex-col gap-2 lg:gap-3">
                {info.map((i) => (
                  <InsightCard key={i.id} insight={i} />
                ))}
              </div>
            </div>
          )}

          {insights.length === 0 && (
            <p className="py-6 text-center text-sm text-[var(--color-ink-muted)] lg:py-12 lg:text-base">
              Nothing needs your attention right now — everything looks healthy.
            </p>
          )}
        </>
      )}

      <ChatAssistant />
    </div>
  )
}