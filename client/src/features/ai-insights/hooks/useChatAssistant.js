// PATH: src/features/ai-insights/hooks/useChatAssistant.js
//
// Calls the real Tier 2 chatbot endpoint. Replaces the old rule-based
// keyword-matching stub — that logic now lives server-side in
// agents/chatbot/.

import { useCallback, useState } from 'react'
import { askAssistant } from '../../../lib/api/intelligence.js'

export function useChatAssistant() {
  const [messages, setMessages] = useState([])
  const [isThinking, setIsThinking] = useState(false)

  const ask = useCallback(async (question) => {
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: 'user', content: question }])
    setIsThinking(true)

    try {
      const { response } = await askAssistant(question)
      setMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: 'assistant', content: response },
      ])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: "I couldn't reach the assistant just now — try again in a moment.",
        },
      ])
    } finally {
      setIsThinking(false)
    }
  }, [])

  return { messages, ask, isThinking }
}