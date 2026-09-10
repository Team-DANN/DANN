import { apiFetch } from '../apiClient.js'

export async function getBusinessProfile() {
  const res = await apiFetch('/api/business')
  return res.data
}

export async function updateBusinessProfile(payload) {
  const res = await apiFetch('/api/business', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
  return res.data
}

export async function getAlertSettings() {
  const res = await apiFetch('/api/business/alert-settings')
  return res.data
}

export async function updateAlertSettings(payload) {
  const res = await apiFetch('/api/business/alert-settings', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
  return res.data
}