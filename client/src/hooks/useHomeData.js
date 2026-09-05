// PATH: src/hooks/useHomeData.js
import { useCallback, useEffect, useState } from 'react'
import { getRunway, getWeeklyMargin, getReceivables } from '../lib/api/finance.js'

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
      const [runwayData, marginData, receivablesData] = await Promise.all([
        getRunway(),
        getWeeklyMargin(),
        getReceivables(),
      ])
      setRunway(runwayData)
      setWeeklyMargin(marginData)
      setReceivables(receivablesData)
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return { runway, weeklyMargin, receivables, loading, error, refetch: load }
}