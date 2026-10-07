import { apiFetch } from '../apiClient.js'

export async function updateProfile(payload) {
  const res = await apiFetch('/api/auth/me', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
  return res.data
}

export async function changePassword(payload) {
  return apiFetch('/api/auth/password', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function deleteAccount(confirmBusinessName) {
  return apiFetch('/api/auth/account', {
    method: 'DELETE',
    body: JSON.stringify({ confirm_business_name: confirmBusinessName }),
  })
}

// Staff and managers only (the backend refuses owners: they use their
// password). A wrong current PIN comes back as 403, not 401, so it never
// signs the person out.
export async function changePin({ current_pin, new_pin }) {
  return apiFetch('/api/auth/pin', {
    method: 'PATCH',
    body: JSON.stringify({ current_pin, new_pin }),
  })
}