// PATH: src/context/AlertsContext.jsx

import { createContext, useCallback, useEffect, useState } from 'react'
import { getAlerts, markAlertRead } from '../lib/api/alerts.js'

export const AlertsContext = createContext(null)

export function AlertsProvider({ children }) {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const rows = await getAlerts()
      // backend `read` is 0/1, not boolean — coerce once here so nothing
      // downstream has to know that.
      setAlerts(rows.map((a) => ({ ...a, read: !!a.read })))
    } catch (err) {
      setError(err.message || 'Failed to load alerts')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const unreadCount = alerts.filter((a) => !a.read).length

  // No bulk "mark all read" route on the backend yet — only PATCH /:id/read.
  // Fires one request per unread alert. Ask backend for a bulk endpoint if
  // this list grows large; fine for now.
  async function markAllRead() {
    const unread = alerts.filter((a) => !a.read)
    if (unread.length === 0) return
    setAlerts((prev) => prev.map((a) => ({ ...a, read: true }))) // optimistic
    try {
      await Promise.all(unread.map((a) => markAlertRead(a.id)))
    } catch (err) {
      setError(err.message || 'Failed to mark alerts read')
      load() // reconcile with server on failure
    }
  }

  async function markOneRead(id) {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, read: true } : a))) // optimistic
    try {
      await markAlertRead(id)
    } catch (err) {
      setError(err.message || 'Failed to mark alert read')
      load()
    }
  }

  return (
    <AlertsContext.Provider
      value={{ alerts, unreadCount, loading, error, markAllRead, markOneRead, refetch: load }}
    >
      {children}
    </AlertsContext.Provider>
  )
}
