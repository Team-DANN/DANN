// PATH: src/features/ai-insights/utils/formatRupees.js
//
// Pulled out of useInsightsDigest since useChatAssistant needs the same
// formatting and duplicating it wasn't worth it.

export function formatRupees(n) {
  return `₹${Math.round(n).toLocaleString('en-IN')}`
}