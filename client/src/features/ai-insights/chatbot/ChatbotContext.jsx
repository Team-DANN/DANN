import { createContext, useContext, useState, useCallback } from 'react'

const ChatbotContext = createContext(null)

export function ChatbotProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('home')
  // Help only ever appears when entered through Settings' "Get help" —
  // the floating FAB always opens in default (Home + Messages) mode.
  const [showHelpTab, setShowHelpTab] = useState(false)

  const openWidget = useCallback((tab = 'home') => {
    setShowHelpTab(false)
    setActiveTab(tab)
    setIsOpen(true)
  }, [])

  const openHelp = useCallback(() => {
    setShowHelpTab(true)
    setActiveTab('help')
    setIsOpen(true)
  }, [])

  const close = useCallback(() => setIsOpen(false), [])

  return (
    <ChatbotContext.Provider
      value={{ isOpen, activeTab, setActiveTab, showHelpTab, openWidget, openHelp, close }}
    >
      {children}
    </ChatbotContext.Provider>
  )
}

export function useChatbot() {
  const ctx = useContext(ChatbotContext)
  if (!ctx) throw new Error('useChatbot must be used within ChatbotProvider')
  return ctx
}