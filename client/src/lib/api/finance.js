import { apiFetch } from './client.js'

export const getProfitSummary = () => apiFetch('/api/finance/profit-summary')
