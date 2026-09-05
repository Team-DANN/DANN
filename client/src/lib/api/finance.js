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

// Backend returns { total_revenue, total_material_cost, total_labor_cost,
// total_cost, net_profit, profit_margin_percent, total_orders, total_batches }.
// Remapped here to { revenue, costs, profit } so useFinanceSummary and the
// summary cards don't need to know the raw report field names.
//
// `outstanding` isn't part of profit-summary at all — it's a receivables
// concept, not a profit one — so it's fetched separately and merged in.
// `trend` is NOT available from this endpoint: it returns one aggregate
// object for the whole date range, not a series of points. There is no
// backend endpoint yet that buckets profit by day/week within a range —
// see the flag below. Until that exists, this always returns trend: [].
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
  const rawTrend = trendRes.data

  return {
    revenue: s.total_revenue,
    costs: s.total_cost,
    profit: s.net_profit,
    outstanding: r.amount,
    // ProfitTrendChart expects { label, revenue, costs } per point —
    // format the raw ISO day into something short and readable.
    trend: rawTrend.map((point) => ({
      label: new Date(point.day).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      revenue: point.revenue,
      costs: point.costs,
    })),
  }
}

export async function getProfitByProduct() {
  const res = await apiFetch('/api/reports/profit-by-product')
  return res.data
}