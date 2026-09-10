// PATH: src/lib/api/alerts.js
import { apiFetch } from '../apiClient.js'

export async function getAlerts() {
  const res = await apiFetch('/api/alerts')
  return res.data
}

export async function getUnreadCount() {
  const res = await apiFetch('/api/alerts/unread-count')
  return res.unreadCount
}

export async function markAlertRead(alertId) {
  const res = await apiFetch(`/api/alerts/${alertId}/read`, { method: 'PATCH' })
  return res.data
}