// PATH: src/context/AlertsContext.jsx

import { createContext, useCallback, useEffect, useState } from 'react'
import { getAlerts, markAlertRead } from '../lib/api/alerts.js'

export const AlertsContext = createContext(null)

// Safety net for time-based conditions that can become true with zero
// user action (an order crossing its credit due date purely because the
// clock moved). Direct mutations (restock, produce, order actions) now
// call refetchAlerts() immediately from their own pages, so this interval
// is a backstop, not the primary mechanism.
const POLL_INTERVAL_MS = 2 * 60 * 1000

export function AlertsProvider({ children }) {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const rows = await getAlerts()
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

  useEffect(() => {
    const id = setInterval(load, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [load])

  const unreadCount = alerts.filter((a) => !a.read).length

  async function markAllRead() {
    const unread = alerts.filter((a) => !a.read)
    if (unread.length === 0) return
    setAlerts((prev) => prev.map((a) => ({ ...a, read: true })))
    try {
      await Promise.all(unread.map((a) => markAlertRead(a.id)))
    } catch (err) {
      setError(err.message || 'Failed to mark alerts read')
      load()
    }
  }

  async function markOneRead(id) {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, read: true } : a)))
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