import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { Bot, X, Home, MessageSquare, CircleHelp } from 'lucide-react'
import { useChatbot } from './ChatbotContext.jsx'
import { useChatConversations } from './useChatConversations.js'
import ChatHomeTab from './tabs/ChatHomeTab.jsx'
import ChatMessagesTab from './tabs/ChatMessagesTab.jsx'
import ChatHelpTab from './tabs/ChatHelpTab.jsx'

const TABS = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'messages', label: 'Messages', icon: MessageSquare },
  { id: 'help', label: 'Help', icon: CircleHelp, helpOnly: true },
]

const TITLES = { home: 'DANN Assistant', messages: 'Messages', help: 'Help' }

// Mounted once at the app root (see App.jsx) so it never unmounts on
// navigation — conversation threads (owned by useChatConversations,
// called here rather than inside a tab) survive both switching tabs and
// moving between pages.
export default function ChatbotWidget() {
  const { isOpen, activeTab, setActiveTab, showHelpTab, openWidget, close } = useChatbot()
  const {
    conversations,
    activeId,
    activeMessages,
    isThinking,
    ask,
    startNewConversation,
    selectConversation,
  } = useChatConversations()

  const location = useLocation()
  const lastPathRef = useRef(location.pathname)

  // Any route change — clicking a nav link, a card link on Home, browser
  // back/forward — closes the widget automatically. Skips the very first
  // render so mounting the app doesn't immediately "close" a widget that
  // was never open.
  useEffect(() => {
    if (location.pathname !== lastPathRef.current) {
      lastPathRef.current = location.pathname
      close()
    }
  }, [location.pathname, close])

  const visibleTabs = TABS.filter((t) => !t.helpOnly || showHelpTab)

  // Lock body scroll only on mobile, where the panel is a full-screen
  // sheet — the desktop floating card shouldn't block scrolling the page
  // behind it. Same pattern as MobileDrawer.
  useEffect(() => {
    if (!isOpen) return
    if (window.innerWidth >= 768) return
    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth
    document.body.style.overflow = 'hidden'
    document.body.style.paddingRight = `${scrollBarWidth}px`
    return () => {
      document.body.style.overflow = ''
      document.body.style.paddingRight = ''
    }
  }, [isOpen])

  function handleSelectConversation(id) {
    selectConversation(id)
    setActiveTab('home')
  }

  function handleNewConversation() {
    startNewConversation()
    setActiveTab('home')
  }

  return (
    <>
      {!isOpen && (
        <button
          type="button"
          onClick={() => openWidget('home')}
          aria-label="Open assistant"
          className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full border-[1.5px] border-[var(--color-stamp)] bg-[var(--color-paper-light)] text-[var(--color-stamp)] shadow-lg transition-transform hover:scale-105 hover:bg-[var(--color-stamp)]/10 active:scale-95 md:bottom-6 md:right-6"
        >
          <Bot size={24} strokeWidth={1.75} />
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-40 flex flex-col bg-[var(--color-paper-light)] md:inset-auto md:bottom-6 md:right-6 md:h-[600px] md:w-[400px] md:overflow-hidden md:rounded-2xl md:border md:border-[var(--color-border)] md:shadow-2xl lg:h-[620px] lg:w-[420px]">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3 lg:px-5 lg:py-4">
            <h2 className="font-[Roboto_Slab] text-base font-semibold text-[var(--color-ink)] lg:text-lg">
              {TITLES[activeTab] ?? 'DANN Assistant'}
            </h2>
            <button
              type="button"
              onClick={close}
              className="rounded-md p-1 text-[var(--color-ink-muted)] hover:bg-[var(--color-paper)] hover:text-[var(--color-ink)]"
              aria-label="Close"
            >
              <X size={20} strokeWidth={2} />
            </button>
          </div>

          <div className="flex min-h-0 flex-1 flex-col">
            {activeTab === 'home' && (
              <ChatHomeTab
                messages={activeMessages}
                ask={ask}
                isThinking={isThinking}
                onNewConversation={handleNewConversation}
              />
            )}
            {activeTab === 'messages' && (
              <div className="min-h-0 flex-1 overflow-y-auto p-4 lg:p-5">
                <ChatMessagesTab
                  conversations={conversations}
                  activeId={activeId}
                  onSelectConversation={handleSelectConversation}
                  onNewConversation={handleNewConversation}
                />
              </div>
            )}
            {activeTab === 'help' && showHelpTab && (
              <div className="min-h-0 flex-1 overflow-y-auto p-4 lg:p-5">
                <ChatHelpTab />
              </div>
            )}
          </div>

          <div className="flex border-t border-[var(--color-border)]">
            {visibleTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-medium lg:py-3 lg:text-sm ${
                  activeTab === tab.id ? 'text-[var(--color-stamp)]' : 'text-[var(--color-ink-muted)]'
                }`}
              >
                <tab.icon size={20} strokeWidth={2} className="lg:h-[22px] lg:w-[22px]" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  )
}