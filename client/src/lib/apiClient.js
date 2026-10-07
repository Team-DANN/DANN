const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
const HAS_AUTHENTICATED_KEY = 'dann_has_authenticated'

// Staff and managers sign in with a business code, username and PIN on this
// page. Owners use the email login on the marketing site instead.
const STAFF_LOGIN_PATH = '/dashboard/staff-login'

// Remembers HOW this browser last signed in: 'owner' or 'pin'. Set from the
// role every time /api/auth/me is read (see updateSessionInfo). It is what
// lets a lapsed or removed staff session land back on the staff login
// instead of the owner's email login.
const LAST_KIND_KEY = 'dann_last_login_kind'

// ---- Multi-account session storage ----
// Each stored session is { token, user_id, business_id, name, email,
// business_name, currency, plan_tier, role, modules }. Multiple sessions
// can be held at once (one per logged-in account, Gmail-switcher style).
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

// The active session, or the first available one if the active pointer is
// stale/missing (e.g. that account was removed).
function getActiveSession() {
  const sessions = loadSessions()
  if (sessions.length === 0) return null
  const activeId = getActiveUserId()
  return sessions.find((s) => s.user_id === activeId) || sessions[0]
}

// Returns the active session's token, or null.
export function getToken() {
  return getActiveSession()?.token || null
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
// plan_tier, role, modules) into the stored session for this user_id, so
// the account switcher can render instantly from cache without an API
// call. Called by AuthContext right after any successful /api/auth/me
// fetch. Whenever a role comes through, it also records how this browser
// signed in (see LAST_KIND_KEY).
export function updateSessionInfo(userId, info) {
  const sessions = loadSessions()
  const idx = sessions.findIndex((s) => s.user_id === userId)
  if (idx === -1) return
  sessions[idx] = { ...sessions[idx], ...info }
  saveSessions(sessions)

  if (info?.role) {
    localStorage.setItem(LAST_KIND_KEY, info.role === 'owner' ? 'owner' : 'pin')
  }
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
  localStorage.removeItem(LAST_KIND_KEY)
}

// Where to send someone who is signed out. Staff and managers go back to
// the staff login, owners to the email login (or the landing page if this
// browser has never signed in). IMPORTANT: call this BEFORE clearToken(),
// because clearing the token removes the session whose role it reads.
export function loggedOutPath() {
  const session = getActiveSession()
  const kind = session?.role
    ? (session.role === 'owner' ? 'owner' : 'pin')
    : localStorage.getItem(LAST_KIND_KEY)

  if (kind === 'pin') return STAFF_LOGIN_PATH
  return hasAuthenticatedBefore() ? '/login' : '/'
}

// For calls that need NO session: the staff login itself. Sends no token,
// and — unlike apiFetch — never treats a 401 as "session expired", because
// here a 401 just means "wrong business code, username or PIN".
export async function publicFetch(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    const err = new Error(body.error || `Request failed: ${response.status}`)
    err.status = response.status
    throw err
  }
  return body
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
    // 401 means the session itself is no longer valid: expired, or a staff
    // member's access was removed. Only the account whose token just
    // failed gets signed out — if other accounts are still stored, fall
    // through to them instead of bouncing to the login screen.
    const destination = loggedOutPath() // read BEFORE the session is cleared
    clearToken()
    if (loadSessions().length === 0) {
      // Already on the staff login? Stay put instead of reloading it.
      if (!window.location.pathname.startsWith(STAFF_LOGIN_PATH)) {
        window.location.href = destination
      }
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