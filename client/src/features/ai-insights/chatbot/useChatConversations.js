// PATH: src/features/ai-insights/chatbot/useChatConversations.js
//
// Manages multiple chat threads for the floating widget. Calls the real
// Tier 2 chatbot endpoint — replaces the old shared rule-engine stub.

import { useCallback, useMemo, useState } from 'react'
import { askAssistant } from '../../../lib/api/intelligence.js'

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

export function useChatConversations() {
  const [conversations, setConversations] = useState(() => [makeConversation()])
  const [activeId, setActiveId] = useState(() => conversations[0].id)
  const [isThinking, setIsThinking] = useState(false)

  const activeConversation = conversations.find((c) => c.id === activeId) ?? conversations[0]

  const ask = useCallback(
    async (question) => {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeId
            ? { ...c, messages: [...c.messages, { id: `u-${Date.now()}`, role: 'user', content: question }] }
            : c
        )
      )
      setIsThinking(true)

      let answerText
      try {
        const result = await askAssistant(question)
        answerText = result.response
      } catch (err) {
        answerText = "I couldn't reach the assistant just now — try again in a moment."
      }

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
    },
    [activeId]
  )

  const startNewConversation = useCallback(() => {
    if (activeConversation && activeConversation.messages.length === 0) return
    const fresh = makeConversation()
    setConversations((prev) => [fresh, ...prev])
    setActiveId(fresh.id)
  }, [activeConversation])

  const selectConversation = useCallback((id) => {
    setActiveId(id)
  }, [])

  const conversationList = useMemo(
    () => [...conversations].map((c) => ({ ...c, title: deriveTitle(c) })).reverse(),
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