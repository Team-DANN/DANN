// PATH: src/features/ai-insights/hooks/useInsightsDigest.js
//
// PREVIEW / STUB: this is a rule-based template over real mock data, not
// the Tier-2 LLM conversational assistant. It exists so the Insights page
// has something honest and useful to show before backend/agents/ has a
// working LLM endpoint. Swap the body of this hook for a real API call
// once that exists — the shape it returns (an array of {id, category,
// title, detail}) is deliberately generic so InsightCard doesn't need to
// change when that swap happens.

import { useMemo } from 'react'
import { useFinanceSummary } from '../../finance/hooks/useFinanceSummary.js'

import { getRunwayEstimate, RUNWAY_STATUS } from '../../inventory/hooks/useRunwayEstimate.js'

import { getDispatchSummary, PAYMENT_STATUS } from '../../orders/hooks/useReceivablesSummary.js'
import { formatRupees } from '../utils/formatRupees.js'

export const INSIGHT_CATEGORY = {
  STRENGTH: 'strength',
  WATCH: 'watch',
  ACTION: 'action',
}

export function useInsightsDigest(period) {
  const finance = useFinanceSummary(period)

  return useMemo(() => {
    const insights = []

    // --- Profit & cash flow ---
    if (finance.revenue > 0 && finance.profit > 0) {
      insights.push({
        id: 'profit-positive',
        category: INSIGHT_CATEGORY.STRENGTH,
        title: `You made ${formatRupees(finance.profit)} profit this period`,
        detail: `Revenue of ${formatRupees(finance.revenue)} against ${formatRupees(finance.costs)} in material costs.`,
      })
    } else if (finance.revenue > 0 || finance.costs > 0) {
      insights.push({
        id: 'profit-negative',
        category: INSIGHT_CATEGORY.WATCH,
        title: 'Costs outpaced revenue this period',
        detail: `${formatRupees(finance.costs)} spent on materials against ${formatRupees(finance.revenue)} invoiced.`,
      })
    }

    if (finance.revenue > 0) {
      const collectedPct = Math.round((finance.collected / finance.revenue) * 100)
      if (collectedPct < 70) {
        insights.push({
          id: 'collection-low',
          category: INSIGHT_CATEGORY.ACTION,
          title: `Only ${collectedPct}% of what you billed has been collected`,
          detail: `${formatRupees(finance.outstanding)} is still owed to you — following up with retailers could close this gap.`,
        })
      }
    }

    // --- Inventory ---
    const attentionMaterials = inventoryMaterials.filter((m) => {
      const { status } = getRunwayEstimate(m)
      return status === RUNWAY_STATUS.LOW || status === RUNWAY_STATUS.CRITICAL
    })
    const criticalMaterials = attentionMaterials.filter(
      (m) => getRunwayEstimate(m).status === RUNWAY_STATUS.CRITICAL
    )

    if (criticalMaterials.length > 0) {
      insights.push({
        id: 'materials-critical',
        category: INSIGHT_CATEGORY.ACTION,
        title: `${criticalMaterials.length} material${criticalMaterials.length > 1 ? 's are' : ' is'} about to run out`,
        detail: `${criticalMaterials.map((m) => m.name).join(', ')} — restock soon to avoid a production stoppage.`,
      })
    } else if (attentionMaterials.length > 0) {
      insights.push({
        id: 'materials-low',
        category: INSIGHT_CATEGORY.WATCH,
        title: `${attentionMaterials.length} material${attentionMaterials.length > 1 ? 's are' : ' is'} running low`,
        detail: `${attentionMaterials.map((m) => m.name).join(', ')} — worth restocking in the next few days.`,
      })
    } else {
      insights.push({
        id: 'materials-ok',
        category: INSIGHT_CATEGORY.STRENGTH,
        title: 'Material stock looks healthy',
        detail: "Nothing is running critically low right now.",
      })
    }

    // --- Receivables ---
    const owingDispatches = mockDispatchLog.filter(
      (d) => getDispatchSummary(d).status !== PAYMENT_STATUS.PAID
    )
    const overdueDispatches = mockDispatchLog.filter((d) => getDispatchSummary(d).overdue)
    const overdueAmount = overdueDispatches.reduce(
      (sum, d) => sum + getDispatchSummary(d).remaining,
      0
    )

    if (overdueDispatches.length > 0) {
      const byRetailer = new Map()
      for (const d of overdueDispatches) {
        const { remaining } = getDispatchSummary(d)
        byRetailer.set(d.retailerId, (byRetailer.get(d.retailerId) || 0) + remaining)
      }
      const [worstId, worstAmount] = [...byRetailer.entries()].sort((a, b) => b[1] - a[1])[0]
      const worstName = mockRetailers.find((r) => r.id === worstId)?.name ?? 'A retailer'

      insights.push({
        id: 'overdue',
        category: INSIGHT_CATEGORY.ACTION,
        title: `${formatRupees(overdueAmount)} is overdue from ${overdueDispatches.length} ${overdueDispatches.length > 1 ? 'dispatches' : 'dispatch'}`,
        detail: `${worstName} owes the most (${formatRupees(worstAmount)}) — worth a follow-up call.`,
      })
    } else if (owingDispatches.length > 0) {
      insights.push({
        id: 'partial-only',
        category: INSIGHT_CATEGORY.WATCH,
        title: `${owingDispatches.length} ${owingDispatches.length > 1 ? 'dispatches have' : 'dispatch has'} payment still pending`,
        detail: "None are overdue yet, but worth keeping an eye on.",
      })
    } else {
      insights.push({
        id: 'all-paid',
        category: INSIGHT_CATEGORY.STRENGTH,
        title: 'All retailers are paid up',
        detail: 'No outstanding dispatches right now.',
      })
    }

    // --- Product performance ---
    if (finance.byProduct.length > 0) {
      const top = finance.byProduct[0]
      insights.push({
        id: 'top-product',
        category: INSIGHT_CATEGORY.STRENGTH,
        title: `${top.name} is your top seller this period`,
        detail: `${formatRupees(top.revenue)} from ${top.qty} units dispatched.`,
      })

      if (finance.byProduct.length > 1) {
        const weakest = finance.byProduct[finance.byProduct.length - 1]
        insights.push({
          id: 'weak-product',
          category: INSIGHT_CATEGORY.WATCH,
          title: `${weakest.name} sold the least this period`,
          detail: `Only ${formatRupees(weakest.revenue)} from ${weakest.qty} units — worth a look at pricing or promotion.`,
        })
      }
    }

    return insights
  }, [finance])
}