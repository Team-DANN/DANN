// PATH: src/lib/api/finance.js
import { apiFetch } from '../apiClient.js'

export async function getRunway() {
  const res = await apiFetch('/api/reports/runway')
  return res.data // { material, daysLeft }
}

export async function getWeeklyMargin() {
  const res = await apiFetch('/api/reports/weekly-margin')
  return res.data // { amount, trend }
}

export async function getReceivables() {
  const res = await apiFetch('/api/reports/receivables')
  return res.data // { amount, overdueCount }
}

export async function getProfitSummary(startDate, endDate) {
  const params = new URLSearchParams()
  if (startDate) params.set('start_date', startDate)
  if (endDate) params.set('end_date', endDate)
  const qs = params.toString() ? `?${params}` : ''
  const res = await apiFetch(`/api/reports/profit-summary${qs}`)
  return res.data
}

export async function getProfitByProduct() {
  const res = await apiFetch('/api/reports/profit-by-product')
  return res.data
}