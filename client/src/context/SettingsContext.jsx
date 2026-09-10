import { createContext, useContext, useState, useCallback } from 'react'

const SettingsContext = createContext(null)

export function SettingsProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false)
  const [section, setSection] = useState('account')

  const open = useCallback((initialSection = 'account') => {
    setSection(initialSection)
    setIsOpen(true)
  }, [])

  const close = useCallback(() => setIsOpen(false), [])

  return (
    <SettingsContext.Provider value={{ isOpen, section, setSection, open, close }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}