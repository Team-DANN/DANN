import { apiFetch } from '../apiClient.js'

// All of these are owner/manager only; the backend enforces it.

export async function listStaff() {
  const res = await apiFetch('/api/staff')
  return { staff: res.data, businessCode: res.business_code }
}

// Returns { staff, pin, business_code }. The PIN is shown once and never again.
export async function createStaff(payload) {
  const res = await apiFetch('/api/staff', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return res.data
}

export async function updateStaff(id, patch) {
  const res = await apiFetch(`/api/staff/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
  return res.data
}

// Only works before the person's first sign-in. Returns { pin }.
export async function resetStaffPin(id) {
  const res = await apiFetch(`/api/staff/${id}/reset-pin`, { method: 'POST' })
  return res.data
}

// Owner only. Soft removal: login is blocked, what they logged stays.
export async function removeStaff(id) {
  const res = await apiFetch(`/api/staff/${id}`, { method: 'DELETE' })
  return res.data
}