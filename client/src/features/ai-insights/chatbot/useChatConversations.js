import { useCallback, useMemo, useState } from 'react'
import { useFinanceSummary } from '../../finance/hooks/useFinanceSummary.js'
import { defaultPeriod } from '../../finance/hooks/useFinanceSummary.js'
import { getAssistantAnswer, THINKING_DELAY_MS } from '../utils/chatAnswerEngine.js'

function makeConversation() {
  return { id: `c-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, title: null, messages: [] }
}

function deriveTitle(conversation) {
  if (conversation.title) return conversation.title
  const firstUserMessage = conversation.messages.find((m) => m.role === 'user')
  if (!firstUserMessage) return 'New conversation'
  return firstUserMessage.content.length > 40
    ? `${firstUserMessage.content.slice(0, 40)}…`
    : firstUserMessage.content
}

// Manages multiple chat threads for the floating widget — separate from
// useChatAssistant, which stays single-thread for the Insights page.
// Both share the same rule engine (chatAnswerEngine.js), so answers never
// drift between the two surfaces.
export function useChatConversations() {
  const finance = useFinanceSummary(defaultPeriod())
  const [conversations, setConversations] = useState(() => [makeConversation()])
  const [activeId, setActiveId] = useState(() => conversations[0].id)
  const [isThinking, setIsThinking] = useState(false)

  const activeConversation = conversations.find((c) => c.id === activeId) ?? conversations[0]

  const ask = useCallback(
    (question) => {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeId
            ? { ...c, messages: [...c.messages, { id: `u-${Date.now()}`, role: 'user', content: question }] }
            : c
        )
      )
      setIsThinking(true)

      const answerText = getAssistantAnswer(question, finance)

      setTimeout(() => {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeId
              ? {
                  ...c,
                  title: deriveTitle(c),
                  messages: [...c.messages, { id: `a-${Date.now()}`, role: 'assistant', content: answerText }],
                }
              : c
          )
        )
        setIsThinking(false)
      }, THINKING_DELAY_MS)
    },
    [activeId, finance]
  )

  // If the active thread is already empty, reuse it instead of stacking
  // up multiple blank "New conversation" entries.
  const startNewConversation = useCallback(() => {
    if (activeConversation && activeConversation.messages.length === 0) return
    const fresh = makeConversation()
    setConversations((prev) => [fresh, ...prev])
    setActiveId(fresh.id)
  }, [activeConversation])

  const selectConversation = useCallback((id) => {
    setActiveId(id)
  }, [])

  // Newest-first for the Messages list, with titles resolved.
  const conversationList = useMemo(
    () =>
      [...conversations]
        .map((c) => ({ ...c, title: deriveTitle(c) }))
        .reverse(),
    [conversations]
  )

  return {
    conversations: conversationList,
    activeId,
    activeMessages: activeConversation?.messages ?? [],
    isThinking,
    ask,
    startNewConversation,
    selectConversation,
  }
}