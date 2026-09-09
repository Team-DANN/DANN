// PATH: src/features/ai-insights/utils/formatRupees.js
//
// Thin wrapper around the shared formatCurrency for backward compatibility
// with existing callers (useInsightsDigest, useChatAssistant per the
// original comment here) that haven't been updated to pass a currency yet.
// Still hardcodes '₹' until those two files are updated to call
// formatCurrency(n, user.currency) directly — see chat for the ask.
import { formatCurrency } from '../../../lib/formatCurrency.js'

export function formatRupees(n) {
  return formatCurrency(n, '₹')
}