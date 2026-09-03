// PATH: src/hooks/useHomeData.js

import { useEffect, useState, useCallback } from 'react'
import { getRunway, getWeeklyMargin, getReceivables } from '../lib/api/finance.js'

// Single hook, single loading/error state — HomePage renders one skeleton,
// not three independently-flickering ones. Shapes returned match the old
// mock objects exactly ({material, daysLeft} / {amount, trend} /
// {amount, overdueCount}), so HomePage's JSX barely changes.
export function useHomeData() {
  const [runway, setRunway] = useState(null)
  const [weeklyMargin, setWeeklyMargin] = useState(null)
  const [receivables, setReceivables] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [runwayRes, marginRes, receivablesRes] = await Promise.all([
        getRunway(),
        getWeeklyMargin(),
        getReceivables(),
      ])
      setRunway(runwayRes)
      setWeeklyMargin(marginRes)
      setReceivables(receivablesRes)
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      await load()
      if (cancelled) return
    })()
    return () => {
      cancelled = true
    }
  }, [load])

  return { runway, weeklyMargin, receivables, loading, error, refetch: load }
}