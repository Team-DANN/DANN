import { createContext, useState } from 'react'
import { mockAlerts as initialAlerts } from '../lib/mockData.js'

export const AlertsContext = createContext(null)

export function AlertsProvider({ children }) {
  const [alerts, setAlerts] = useState(initialAlerts.map((a) => ({ ...a, read: false })))

  const unreadCount = alerts.filter((a) => !a.read).length

  function markAllRead() {
    setAlerts((prev) => prev.map((a) => ({ ...a, read: true })))
  }

  function markOneRead(id) {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, read: true } : a)))
  }

  return (
    <AlertsContext.Provider value={{ alerts, unreadCount, markAllRead, markOneRead }}>
      {children}
    </AlertsContext.Provider>
  )
}