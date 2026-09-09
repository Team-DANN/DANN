// PATH: src/lib/api/finance.js
import { apiFetch } from '../apiClient.js'

export async function getRunway() {
  const res = await apiFetch('/api/reports/runway')
  return res.data
}

export async function getWeeklyMargin() {
  const res = await apiFetch('/api/reports/weekly-margin')
  return res.data
}

export async function getReceivables() {
  const res = await apiFetch('/api/reports/receivables')
  return res.data
}

// Backend now returns { total_revenue, total_material_cost,
// total_labor_cost, total_cost, net_profit, profit_margin_percent,
// total_orders, total_batches, revenue_trend_percent, cost_trend_percent,
// profit_trend_percent }. The three trend fields are null when the period
// has no meaningful "previous period" to compare against (All time) — kept
// as null all the way through rather than coerced to 0, so the UI can tell
// "no data" apart from "0% change".
export async function getProfitSummary(startDate, endDate) {
  const params = new URLSearchParams()
  if (startDate) params.set('start_date', startDate)
  if (endDate) params.set('end_date', endDate)
  const qs = params.toString() ? `?${params}` : ''

  const [summaryRes, receivablesRes, trendRes] = await Promise.all([
    apiFetch(`/api/reports/profit-summary${qs}`),
    apiFetch('/api/reports/receivables'),
    apiFetch(`/api/reports/profit-trend${qs}`),
  ])

  const s = summaryRes.data
  const r = receivablesRes.data
  const rawTrend = trendRes.data ?? []

  return {
    revenue: s.total_revenue ?? 0,
    costs: s.total_cost ?? 0,
    profit: s.net_profit ?? 0,
    outstanding: r.amount ?? 0,
    revenueTrendPercent: s.revenue_trend_percent ?? null,
    costTrendPercent: s.cost_trend_percent ?? null,
    profitTrendPercent: s.profit_trend_percent ?? null,
    trend: rawTrend.map((point) => ({
      label: new Date(point.day).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      revenue: point.revenue ?? 0,
      costs: point.costs ?? 0,
    })),
  }
}

// Now period-scoped — previously always fetched the whole-catalog
// snapshot with no date filter at all, ignoring whatever period was
// selected in Finance's PeriodFilter.
export async function getProfitByProduct(startDate, endDate) {
  const params = new URLSearchParams()
  if (startDate) params.set('start_date', startDate)
  if (endDate) params.set('end_date', endDate)
  const qs = params.toString() ? `?${params}` : ''
  const res = await apiFetch(`/api/reports/profit-by-product${qs}`)
  return res.data
}