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

// Single source of truth for "has this browser ever completed a login or
// signup" — read by AppShell's route guard and the 401 interceptor below.
// Written to true by LoginPage.jsx and OnboardingComplete.jsx on the
// marketing site (frontend/) at the moment of a successful auth. Both
// apps share this because the reverse proxy puts them on one origin, so
// localStorage is genuinely shared — not duplicated state that can drift.
export function hasAuthenticatedBefore() {
  return localStorage.getItem(HAS_AUTHENTICATED_KEY) === 'true'
}

// Where to send someone who isn't authenticated right now. New browser,
// never logged in here -> strictly the landing page. Returning browser
// with a missing/expired/invalid token -> login, not the landing page,
// since re-showing marketing copy to someone who already has an account
// is the wrong experience.
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
    // Token missing/expired/invalid — this is not a normal request
    // failure, it's a "you're no longer logged in" signal from the
    // backend. Clear the stale token and hard-navigate out immediately,
    // from wherever in the app this fired (a stale HomePage fetch, a
    // background AlertsContext poll, anything using apiFetch). Without
    // this, a 401 just surfaces as a generic "Request failed: 401" on
    // whatever page the user happens to be looking at.
    clearToken()
    redirectToLoggedOutHome()
    throw new Error('Session expired. Please log in again.')
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.error || `Request failed: ${response.status}`)
  }

  return response.json()
}