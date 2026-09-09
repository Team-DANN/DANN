const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
const HAS_AUTHENTICATED_KEY = 'dann_has_authenticated'

// ---- Multi-account session storage ----
// Each stored session is { token, user_id, business_id, name, email,
// business_name, currency, plan_tier, role }. Multiple sessions can be
// held at once (one per logged-in account, Gmail-switcher style).
// ACTIVE_KEY points at whichever one is currently in use — everything
// that used to read/write a single `dann_auth_token` now reads/writes
// whichever session matches ACTIVE_KEY, so existing call sites
// (getToken/setToken/clearToken) don't need to change anywhere else.
const SESSIONS_KEY = 'dann_auth_sessions'
const ACTIVE_KEY = 'dann_active_user_id'

function loadSessions() {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveSessions(sessions) {
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions))
}

function decodeJwtPayload(token) {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join('')
    )
    return JSON.parse(json)
  } catch {
    return {}
  }
}

export function getActiveUserId() {
  return localStorage.getItem(ACTIVE_KEY)
}

function setActiveUserId(userId) {
  if (userId) {
    localStorage.setItem(ACTIVE_KEY, userId)
  } else {
    localStorage.removeItem(ACTIVE_KEY)
  }
}

// Returns the active session's token, or the first available session if
// the active pointer is stale/missing (e.g. that account was removed).
export function getToken() {
  const sessions = loadSessions()
  if (sessions.length === 0) return null
  const activeId = getActiveUserId()
  const session = sessions.find((s) => s.user_id === activeId) || sessions[0]
  return session?.token || null
}

// Fresh login/register — replaces ALL sessions with just this one. This
// is the normal /login and /register path (nothing to preserve, there's
// no "other account" in play).
export function setToken(token) {
  const payload = decodeJwtPayload(token)
  if (!payload.user_id) return
  saveSessions([{ token, user_id: payload.user_id, business_id: payload.business_id }])
  setActiveUserId(payload.user_id)
  localStorage.setItem(HAS_AUTHENTICATED_KEY, 'true')
}

// Adds a session ALONGSIDE whatever is already stored, and makes it
// active. This is the "Add account" path — used after a fresh signup
// initiated from an already-authenticated session, never after a normal
// login/register.
export function addSession(token) {
  const payload = decodeJwtPayload(token)
  if (!payload.user_id) return
  const sessions = loadSessions().filter((s) => s.user_id !== payload.user_id)
  sessions.push({ token, user_id: payload.user_id, business_id: payload.business_id })
  saveSessions(sessions)
  setActiveUserId(payload.user_id)
  localStorage.setItem(HAS_AUTHENTICATED_KEY, 'true')
}

// Merges display fields (name, email, business_name, currency,
// plan_tier, role) into the stored session for this user_id, so the
// account switcher can render instantly from cache without an API call.
// Called by AuthContext right after any successful /api/auth/me fetch.
export function updateSessionInfo(userId, info) {
  const sessions = loadSessions()
  const idx = sessions.findIndex((s) => s.user_id === userId)
  if (idx === -1) return
  sessions[idx] = { ...sessions[idx], ...info }
  saveSessions(sessions)
}

export function listSessions() {
  return loadSessions()
}

// Switches which stored session is active. No backend call — each
// session already carries its own independently-valid token.
export function switchActiveSession(userId) {
  const sessions = loadSessions()
  if (!sessions.some((s) => s.user_id === userId)) return false
  setActiveUserId(userId)
  return true
}

// Removes one account's session entirely ("sign out of this account").
// Promotes another stored session to active if one exists.
export function removeSession(userId) {
  const sessions = loadSessions().filter((s) => s.user_id !== userId)
  saveSessions(sessions)
  if (getActiveUserId() === userId) {
    setActiveUserId(sessions[0]?.user_id || null)
  }
  return sessions.length
}

// Signs out of the ACTIVE account only — other stored sessions are
// unaffected and remain valid. If the active session's token 401s, only
// that one is invalid; the rest weren't touched, so wiping everything
// here would be wrong.
export function clearToken() {
  const activeId = getActiveUserId()
  if (activeId) removeSession(activeId)
}

// ---- Remembered accounts (survives logout) ----
// Sessions above only track LIVE tokens — logging out removes one
// entirely via removeSession(). That's correct for auth, but wrong for
// the switcher UI: Google's account chooser still shows an account
// you've signed out of, just asks for a password again instead of
// vanishing it. This list is what makes that possible — display info
// only (no token), written on every successful login, never touched by
// logout. Only forgetAccount() below removes an entry from here.
const KNOWN_ACCOUNTS_KEY = 'dann_known_accounts'

function loadKnownAccounts() {
  try {
    const raw = localStorage.getItem(KNOWN_ACCOUNTS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveKnownAccounts(accounts) {
  localStorage.setItem(KNOWN_ACCOUNTS_KEY, JSON.stringify(accounts))
}

export function rememberAccount(info) {
  if (!info?.user_id) return
  const accounts = loadKnownAccounts().filter((a) => a.user_id !== info.user_id)
  accounts.push({
    user_id: info.user_id,
    name: info.name,
    email: info.email,
    business_name: info.business_name,
  })
  saveKnownAccounts(accounts)
}

export function listKnownAccounts() {
  return loadKnownAccounts()
}

// Explicit "forget this account" — the only thing that actually removes
// an account from the switcher. Clears both the remembered entry and
// any live session for it.
export function forgetAccount(userId) {
  removeSession(userId)
  saveKnownAccounts(loadKnownAccounts().filter((a) => a.user_id !== userId))
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
    // Only the account whose token just failed gets signed out — if
    // other accounts are still stored, fall through to them instead of
    // bouncing to the login screen.
    clearToken()
    if (loadSessions().length === 0) {
      redirectToLoggedOutHome()
    } else {
      window.location.reload()
    }
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