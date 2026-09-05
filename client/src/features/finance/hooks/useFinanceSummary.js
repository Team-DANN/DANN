// PATH: src/features/finance/hooks/useFinanceSummary.js
import { useCallback, useEffect, useState } from 'react'
import { getProfitSummary, getProfitByProduct } from '../../../lib/api/finance.js'

export const PERIOD_TYPES = {
  WEEK: 'week',
  MONTH: 'month',
  YEAR: 'year',
  ALL: 'all',
  PICK_MONTH: 'pickMonth',
  RANGE: 'range',
}

export function defaultPeriod() {
  const now = new Date()
  return { type: PERIOD_TYPES.MONTH, year: now.getFullYear(), month: now.getMonth() }
}

function toISODate(d) {
  return d.toISOString().split('T')[0]
}

function getDateRange(period) {
  const now = new Date()

  if (period.type === PERIOD_TYPES.WEEK) {
    const start = new Date(now)
    start.setDate(start.getDate() - 6)
    return { startDate: toISODate(start), endDate: toISODate(now) }
  }
  if (period.type === PERIOD_TYPES.MONTH) {
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    return { startDate: toISODate(start), endDate: toISODate(end) }
  }
  if (period.type === PERIOD_TYPES.YEAR) {
    const start = new Date(now.getFullYear(), 0, 1)
    const end = new Date(now.getFullYear(), 11, 31)
    return { startDate: toISODate(start), endDate: toISODate(end) }
  }
  if (period.type === PERIOD_TYPES.PICK_MONTH) {
    const start = new Date(period.year, period.month, 1)
    const end = new Date(period.year, period.month + 1, 0)
    return { startDate: toISODate(start), endDate: toISODate(end) }
  }
  if (period.type === PERIOD_TYPES.RANGE) {
    return { startDate: period.startDate, endDate: period.endDate }
  }
  return { startDate: undefined, endDate: undefined } // ALL
}

export function useFinanceSummary(period) {
  const [summary, setSummary] = useState(null)
  const [byProduct, setByProduct] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const { startDate, endDate } = getDateRange(period)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [summaryData, productData] = await Promise.all([
        getProfitSummary(startDate, endDate),
        getProfitByProduct(startDate, endDate),
      ])
      setSummary(summaryData)
      setByProduct(productData ?? [])
    } catch (err) {
      setError(err.message || 'Failed to load finance data')
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate])

  useEffect(() => {
    load()
  }, [load])

  return {
    revenue: summary?.revenue ?? 0,
    costs: summary?.costs ?? 0,
    profit: summary?.profit ?? 0,
    outstanding: summary?.outstanding ?? 0,
    profitTrendPercent: summary?.profitTrendPercent ?? null,
    trend: summary?.trend ?? [],
    byProduct,
    loading,
    error,
    refetch: load,
  }
}