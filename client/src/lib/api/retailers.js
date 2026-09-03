// PATH: src/lib/api/retailers.js
import { apiFetch } from '../apiClient.js'

export async function getRetailers() {
  const res = await apiFetch('/api/retailers')
  return res.data
}

export async function createRetailer(payload) {
  const res = await apiFetch('/api/retailers', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return res.data
}

export async function updateRetailer(retailerId, payload) {
  const res = await apiFetch(`/api/retailers/${retailerId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
  return res.data
}

export async function deleteRetailer(retailerId) {
  return apiFetch(`/api/retailers/${retailerId}`, { method: 'DELETE' })
}