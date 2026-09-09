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

export async function deleteAccount(password) {
  return apiFetch('/api/auth/account', {
    method: 'DELETE',
    body: JSON.stringify({ password }),
  })
}