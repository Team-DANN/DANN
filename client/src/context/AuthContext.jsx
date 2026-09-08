import { createContext, useContext, useEffect, useState } from 'react'
import { apiFetch, getToken, setToken, clearToken } from '../lib/apiClient.js'

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
  }

  const logout = () => {
    clearToken()
    setUser(null)
  }

  // Patches the in-memory user after a profile edit (name/email/etc.)
  // without a full re-fetch of /api/auth/me — the PATCH endpoints already
  // return the updated fields, so this just merges them in.
  const updateUser = (patch) => {
    setUser((prev) => (prev ? { ...prev, ...patch } : prev))
  }

  // ---- Workspace switcher additions ----

  // Fetched on demand (when the switcher dropdown opens), not on every
  // app mount — most sessions never touch it, no reason to pay for it
  // on every page load.
  const listBusinesses = async () => {
    const res = await apiFetch('/api/auth/businesses')
    return res.data
  }

  // Re-signs the token against a different business, then hard-reloads.
  // Dashboard hooks here fetch on mount, not on token change — a reload
  // is the honest way to guarantee every page re-fetches under the new
  // business_id rather than mixing stale and fresh data. Revisit if a
  // data-fetching layer with cache invalidation gets introduced later.
  //
  // NOTE: apiFetch (apiClient.js) does not JSON.stringify the body —
  // it passes options.body straight to fetch(). Must stringify here.
  const switchBusiness = async (businessId) => {
    const res = await apiFetch('/api/auth/switch-business', {
      method: 'POST',
      body: JSON.stringify({ business_id: businessId }),
    })
    setToken(res.data.token)
    window.location.reload()
  }

  // Creates a new business under this same login, switches into it, and
  // reloads. Used by the "+ Add another business" flow.
  const createBusiness = async (payload) => {
    const res = await apiFetch('/api/auth/businesses', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    setToken(res.data.token)
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
        listBusinesses,
        switchBusiness,
        createBusiness,
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
