const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
const TOKEN_KEY = 'dann_auth_token'
const HAS_AUTHENTICATED_KEY = 'dann_has_authenticated'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

export function hasAuthenticatedBefore() {
  return localStorage.getItem(HAS_AUTHENTICATED_KEY) === 'true'
}

// Used only by account deletion — the business no longer exists after a
// successful delete, so this browser should be treated as brand new on
// its next visit (landing page) instead of bounced to a login form for
// an account that's gone.
export function clearHasAuthenticated() {
  localStorage.removeItem(HAS_AUTHENTICATED_KEY)
}

function redirectToLoggedOutHome() {
  window.location.href = hasAuthenticatedBefore() ? '/login' : '/'
}

export async function apiFetch(path, options = {}) {
  const token = getToken()
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers })

  if (response.status === 401) {
    clearToken()
    redirectToLoggedOutHome()
    throw new Error('Session expired. Please log in again.')
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    const err = new Error(body.error || `Request failed: ${response.status}`)
    err.status = response.status
    throw err
  }

  return response.json()
}