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
        // GET /api/auth/me responds { success: true, data: {...user fields} }.
        // There is no `.user` key — it's `.data`. `me.user || me` was falling
        // through to the whole envelope, so `user` state held
        // { success, data } instead of the actual user object.
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

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAuthenticated: !!user }}>
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