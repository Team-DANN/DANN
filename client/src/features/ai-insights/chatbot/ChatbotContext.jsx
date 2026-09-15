import { createContext, useContext, useState, useCallback } from 'react'
import { useChatConversations } from './useChatConversations.js'

const ChatbotContext = createContext(null)

export function ChatbotProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('home')
  // Help only ever appears when entered through Settings' "Get help" —
  // the floating FAB always opens in default (Home + Messages) mode.
  const [showHelpTab, setShowHelpTab] = useState(false)

  // Owned here (provider sits above RouterProvider in App.jsx, so it
  // never unmounts) rather than inside ChatbotWidget. That's what lets
  // ChatbotWidget now mount in more than one place — AppShell's route
  // tree AND the standalone /settings route — without losing
  // conversation state when one instance unmounts and the other mounts.
  const {
    conversations,
    activeId,
    activeMessages,
    isThinking,
    ask,
    startNewConversation,
    selectConversation,
  } = useChatConversations()

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
      value={{
        isOpen,
        activeTab,
        setActiveTab,
        showHelpTab,
        openWidget,
        openHelp,
        close,
        conversations,
        activeId,
        activeMessages,
        isThinking,
        ask,
        startNewConversation,
        selectConversation,
      }}
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