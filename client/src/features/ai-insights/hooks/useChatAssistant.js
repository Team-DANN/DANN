// PATH: src/features/ai-insights/hooks/useChatAssistant.js
//
// PREVIEW / STUB: keyword-matched, rule-based answers over the same mock
// data useInsightsDigest reads — NOT the Tier-2 LLM conversational
// assistant. This exists so "ask anything" has an honest, working answer
// engine before backend/agents/ has a real endpoint. Swap the engine call
// for an API call to that endpoint once it exists; the message shape
// ({id, role, content}) won't need to change.
//
// Rule set lives in ../utils/chatAnswerEngine.js, shared with the
// multi-conversation widget hook so both stay in sync automatically.

import { useCallback, useState } from 'react'
import { useFinanceSummary } from '../../finance/hooks/useFinanceSummary.js'
import { getAssistantAnswer, THINKING_DELAY_MS } from '../utils/chatAnswerEngine.js'

export function useChatAssistant(period) {
  const finance = useFinanceSummary(period)
  const [messages, setMessages] = useState([])
  const [isThinking, setIsThinking] = useState(false)

  const ask = useCallback(
    (question) => {
      setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: 'user', content: question }])
      setIsThinking(true)

      const answerText = getAssistantAnswer(question, finance)

      // Small artificial delay so the reply doesn't just snap into place —
      // matches the "thinking" feel without pretending to be a real call.
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          { id: `a-${Date.now()}`, role: 'assistant', content: answerText },
        ])
        setIsThinking(false)
      }, THINKING_DELAY_MS)
    },
    [finance]
  )

  return { messages, ask, isThinking }
}