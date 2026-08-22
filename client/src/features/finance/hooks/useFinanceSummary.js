// PATH: src/features/finance/hooks/useFinanceSummary.js

import { useMemo } from 'react'
import { dispatchLog, restockLog, productName } from '../data/financeMock.js'

export const PERIOD_TYPES = {
  WEEK: 'week',
  MONTH: 'month',
  YEAR: 'year',
  ALL: 'all',
  PICK_MONTH: 'pickMonth',
  RANGE: 'range',
}

// Default: current month — "how did this month go" is the question most
// small-business owners actually have.
export function defaultPeriod() {
  const now = new Date()
  return { type: PERIOD_TYPES.MONTH, year: now.getFullYear(), month: now.getMonth() }
}

function getDateRange(period) {
  const now = new Date()

  if (period.type === PERIOD_TYPES.WEEK) {
    const start = new Date(now)
    start.setDate(start.getDate() - 6)
    start.setHours(0, 0, 0, 0)
    const end = new Date(now)
    end.setHours(23, 59, 59, 999)
    return { start, end }
  }

  if (period.type === PERIOD_TYPES.MONTH) {
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
    return { start, end }
  }

  if (period.type === PERIOD_TYPES.YEAR) {
    const start = new Date(now.getFullYear(), 0, 1)
    const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999)
    return { start, end }
  }

  if (period.type === PERIOD_TYPES.PICK_MONTH) {
    const start = new Date(period.year, period.month, 1)
    const end = new Date(period.year, period.month + 1, 0, 23, 59, 59, 999)
    return { start, end }
  }

  if (period.type === PERIOD_TYPES.RANGE) {
    const start = new Date(period.startDate)
    start.setHours(0, 0, 0, 0)
    const end = new Date(period.endDate)
    end.setHours(23, 59, 59, 999)
    return { start, end }
  }

  // ALL — wide enough to cover every mock/seed date.
  return { start: new Date(2000, 0, 1), end: new Date(2100, 0, 1) }
}

function inRange(dateStr, start, end) {
  const d = new Date(dateStr)
  return d >= start && d <= end
}

function bucketKeyFor(dateStr, spanDays) {
  const d = new Date(dateStr)
  if (spanDays <= 31) return d.toISOString().split('T')[0] // daily
  if (spanDays <= 180) {
    // weekly bucket, keyed by that week's Monday
    const day = d.getDay() || 7
    const monday = new Date(d)
    monday.setDate(d.getDate() - day + 1)
    return monday.toISOString().split('T')[0]
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` // monthly
}

function bucketLabel(key, spanDays) {
  if (spanDays <= 180) {
    return new Date(key).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  }
  const [y, m] = key.split('-')
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-IN', {
    month: 'short',
    year: '2-digit',
  })
}

export function useFinanceSummary(period) {
  return useMemo(() => {
    const { start, end } = getDateRange(period)
    const spanDays = Math.max(1, Math.round((end - start) / 86400000))

    const dispatches = dispatchLog.filter((d) => inRange(d.date, start, end))
    const restocks = restockLog.filter((r) => inRange(r.date, start, end))

    const revenue = dispatches.reduce((sum, d) => sum + d.amount, 0)
    const collected = dispatches.reduce((sum, d) => sum + d.amountPaid, 0)
    const outstanding = revenue - collected
    const costs = restocks.reduce((sum, r) => sum + r.cost, 0)
    const profit = revenue - costs

    // Trend buckets — daily/weekly/monthly depending on how wide the period is.
    const buckets = new Map()
    for (const d of dispatches) {
      const key = bucketKeyFor(d.date, spanDays)
      const b = buckets.get(key) || { key, revenue: 0, costs: 0 }
      b.revenue += d.amount
      buckets.set(key, b)
    }
    for (const r of restocks) {
      const key = bucketKeyFor(r.date, spanDays)
      const b = buckets.get(key) || { key, revenue: 0, costs: 0 }
      b.costs += r.cost
      buckets.set(key, b)
    }
    const trend = [...buckets.values()]
      .sort((a, b) => (a.key < b.key ? -1 : 1))
      .map((b) => ({
        label: bucketLabel(b.key, spanDays),
        revenue: b.revenue,
        costs: b.costs,
        profit: b.revenue - b.costs,
      }))

    // Revenue by product — NOT profit (see financeMock.js gap note). A
    // dispatch's amount is split across its items proportional to qty,
    // since dispatches don't carry a per-line-item price.
    const productMap = new Map()
    for (const d of dispatches) {
      const totalQty = d.items.reduce((s, i) => s + i.qty, 0) || 1
      for (const item of d.items) {
        const share = (item.qty / totalQty) * d.amount
        const p = productMap.get(item.productId) || { productId: item.productId, qty: 0, revenue: 0 }
        p.qty += item.qty
        p.revenue += share
        productMap.set(item.productId, p)
      }
    }
    const byProduct = [...productMap.values()]
      .map((p) => ({ ...p, name: productName(p.productId) }))
      .sort((a, b) => b.revenue - a.revenue)

    return { revenue, collected, outstanding, costs, profit, trend, byProduct, dispatches, restocks }
  }, [period])
}