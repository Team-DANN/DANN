import { createContext, useContext, useEffect, useState } from 'react'
import {
  apiFetch,
  getToken,
  setToken,
  clearToken,
  addSession,
  updateSessionInfo,
  listSessions,
  switchActiveSession,
  removeSession,
  getActiveUserId,
  hasAuthenticatedBefore,
  rememberAccount,
  listKnownAccounts,
  forgetAccount,
} from '../lib/apiClient.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const hydrate = async () => {
      const token = getToken()
      if (!token) {
        setLoading(false)
        return
      }
      try {
        const me = await apiFetch('/api/auth/me')
        setUser(me.data)
        // Cache display fields on the session so the account switcher
        // can render this account without hitting the API again.
        updateSessionInfo(me.data.user_id, me.data)
        // Also record it as a known account — survives even if this
        // session later gets logged out, so it still shows in the
        // switcher (Google-chooser style) instead of vanishing.
        rememberAccount(me.data)
      } catch {
        clearToken()
        setUser(null)
      } finally {
        setLoading(false)
      }
    }
    hydrate()
  }, [])

  const login = async (token) => {
    setToken(token)
    const me = await apiFetch('/api/auth/me')
    setUser(me.data)
    updateSessionInfo(me.data.user_id, me.data)
    rememberAccount(me.data)
  }

  // Signs out of the CURRENT account only. If other accounts are still
  // stored, hands off to whichever becomes active rather than forcing a
  // trip through the login screen. If this was the last one, falls back
  // to the same logged-out landing used elsewhere (AppShell, apiClient).
  const logout = () => {
    clearToken()
    if (listSessions().length > 0) {
      window.location.reload()
      return
    }
    setUser(null)
    window.location.href = hasAuthenticatedBefore() ? '/login' : '/'
  }

  // Patches the in-memory user after a profile edit (name/email/etc.)
  // without a full re-fetch of /api/auth/me — the PATCH endpoints already
  // return the updated fields, so this just merges them in.
  const updateUser = (patch) => {
    setUser((prev) => (prev ? { ...prev, ...patch } : prev))
    if (user?.user_id) updateSessionInfo(user.user_id, patch)
  }

  // ---- Multi-account switcher ----

  // Reads from the PERSISTENT known-accounts list, not live sessions —
  // this is what makes an account still show up after you've logged out
  // of it, the way Google's account chooser does. No API call either
  // way; both lists live in localStorage.
  const listAccounts = () => listKnownAccounts()

  const activeAccountId = () => getActiveUserId()

  // Whether a known account currently has a valid, ready-to-use session
  // (clicking it just switches) versus needing to sign in again
  // (clicking it should route to login with the email pre-filled).
  const hasLiveSession = (userId) => listSessions().some((s) => s.user_id === userId)

  // No backend round-trip — each stored session already carries its own
  // valid JWT. Switching is just "make this one active" + reload so
  // every dashboard hook (which fetches on mount) picks up the new token.
  const switchAccount = (userId) => {
    if (!switchActiveSession(userId)) return
    window.location.reload()
  }

  // Fully forgets an account — removes it from the switcher entirely,
  // not just signs it out. Distinct from the main Log out button, which
  // only clears the active session and leaves the account remembered.
  const removeAccount = (userId) => {
    forgetAccount(userId)
    window.location.reload()
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        updateUser,
        isAuthenticated: !!user,
        listAccounts,
        activeAccountId,
        hasLiveSession,
        switchAccount,
        removeAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}

// Exported for the cross-app "Add account" handoff — the signup flow
// lives in frontend/ (separate Vite app, shared localStorage via the dev
// proxy / production rewrites). That app can't import this context
// directly, but it CAN call this if it imports apiClient.js's addSession
// the same way. See addSession in apiClient.js for the actual contract.
