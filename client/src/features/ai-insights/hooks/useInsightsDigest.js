// PATH: src/features/ai-insights/hooks/useInsightsDigest.js
//
// Fetches real insights from the Python agents service. Replaces the old
// rule-based-over-mock-data stub entirely — all the rule logic now lives
// server-side in agents/insights/rules.py.
//
// Note: the backend does not currently accept a period filter — insights
// are computed over each business's live current state, not a selectable
// date range. If period-scoped insights become a real need later, that's
// a backend change (new query param + rule adjustments), not something
// to fake client-side.

import { useCallback, useEffect, useState } from 'react'
import { getInsights } from '../../../lib/api/intelligence.js'

export const INSIGHT_SEVERITY = {
  CRITICAL: 'critical',
  WARNING: 'warning',
  INFO: 'info',
}

export function useInsightsDigest() {
  const [insights, setInsights] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await getInsights()
      setInsights(data ?? [])
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return { insights, isLoading, error, refresh: load }
}