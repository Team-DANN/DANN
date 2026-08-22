// PATH: src/features/ai-insights/hooks/useChatAssistant.js
//
// PREVIEW / STUB: keyword-matched, rule-based answers over the same mock
// data useInsightsDigest reads — NOT the Tier-2 LLM conversational
// assistant. This exists so "ask anything" has an honest, working answer
// engine before backend/agents/ has a real endpoint. Swap `ask`'s body
// for an API call to that endpoint once it exists; the message shape
// ({id, role, content}) won't need to change.

import { useCallback, useState } from 'react'
import { useFinanceSummary } from '../../finance/hooks/useFinanceSummary.js'
import { inventoryMaterials } from '../../inventory/data/inventoryMock.js'
import { getRunwayEstimate, RUNWAY_STATUS } from '../../inventory/hooks/useRunwayEstimate.js'
import { mockDispatchLog, mockRetailers } from '../../orders/data/ordersMock.js'
import { getDispatchSummary, PAYMENT_STATUS } from '../../orders/hooks/useReceivablesSummary.js'
import { formatRupees } from '../utils/formatRupees.js'

const THINKING_DELAY_MS = 500

function buildContext(finance) {
  const lowMaterials = inventoryMaterials.filter((m) => {
    const { status } = getRunwayEstimate(m)
    return status === RUNWAY_STATUS.LOW || status === RUNWAY_STATUS.CRITICAL
  })
  const overdueDispatches = mockDispatchLog.filter((d) => getDispatchSummary(d).overdue)
  const owingDispatches = mockDispatchLog.filter(
    (d) => getDispatchSummary(d).status !== PAYMENT_STATUS.PAID
  )

  return { finance, lowMaterials, overdueDispatches, owingDispatches }
}

// Order matters — first match wins, so more specific phrases (e.g.
// "overdue") should sit above their broader cousins (e.g. "owe").
const RULES = [
  {
    match: /overdue|late payment|follow.?up/i,
    answer: ({ overdueDispatches }) => {
      if (overdueDispatches.length === 0) return 'Nothing is overdue right now.'
      const byRetailer = new Map()
      for (const d of overdueDispatches) {
        const { remaining } = getDispatchSummary(d)
        byRetailer.set(d.retailerId, (byRetailer.get(d.retailerId) || 0) + remaining)
      }
      const [worstId, worstAmount] = [...byRetailer.entries()].sort((a, b) => b[1] - a[1])[0]
      const worstName = mockRetailers.find((r) => r.id === worstId)?.name ?? 'A retailer'
      return `${overdueDispatches.length} ${overdueDispatches.length > 1 ? 'dispatches are' : 'dispatch is'} overdue. ${worstName} owes the most, at ${formatRupees(worstAmount)}.`
    },
  },
  {
    match: /owe|owing|receivable|outstanding|pending payment/i,
    answer: ({ finance, owingDispatches }) =>
      owingDispatches.length > 0
        ? `${formatRupees(finance.outstanding)} is still owed to you across ${owingDispatches.length} ${owingDispatches.length > 1 ? 'dispatches' : 'dispatch'}.`
        : 'Nothing is currently owed to you — all dispatches are paid up.',
  },
  {
    match: /profit|margin|making money/i,
    answer: ({ finance }) =>
      finance.revenue > 0
        ? `You made ${formatRupees(finance.profit)} in profit — ${formatRupees(finance.revenue)} revenue against ${formatRupees(finance.costs)} in material costs.`
        : "There's no revenue recorded for this period yet.",
  },
  {
    match: /best seller|top product|top seller|best.?selling/i,
    answer: ({ finance }) =>
      finance.byProduct.length > 0
        ? `${finance.byProduct[0].name} is your top seller — ${formatRupees(finance.byProduct[0].revenue)} from ${finance.byProduct[0].qty} units.`
        : "There's no product sales data for this period yet.",
  },
  {
    match: /worst|least|underperform|weak/i,
    answer: ({ finance }) =>
      finance.byProduct.length > 1
        ? `${finance.byProduct[finance.byProduct.length - 1].name} sold the least — only ${formatRupees(finance.byProduct[finance.byProduct.length - 1].revenue)} this period.`
        : "There isn't enough product variety in this period to compare.",
  },
  {
    match: /low|running out|stock|material|restock|ingredient/i,
    answer: ({ lowMaterials }) =>
      lowMaterials.length > 0
        ? `${lowMaterials.map((m) => m.name).join(', ')} ${lowMaterials.length > 1 ? 'are' : 'is'} running low — worth restocking soon.`
        : 'Material stock looks healthy right now.',
  },
]

const FALLBACK_ANSWER =
  "I can only answer questions about profit, stock levels, payments, and product performance for now — the full assistant is coming once the backend AI is live."

export function useChatAssistant(period) {
  const finance = useFinanceSummary(period)
  const [messages, setMessages] = useState([])
  const [isThinking, setIsThinking] = useState(false)

  const ask = useCallback(
    (question) => {
      setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: 'user', content: question }])
      setIsThinking(true)

      const context = buildContext(finance)
      const rule = RULES.find((r) => r.match.test(question))
      const answerText = rule ? rule.answer(context) : FALLBACK_ANSWER

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