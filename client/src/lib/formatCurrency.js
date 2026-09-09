// PATH: src/lib/utils/formatCurrency.js
//
// Central money formatter. Takes the business's currency symbol
// (user.currency from useAuth(), sourced from business.currency —
// itself set from country at signup, see CountryStep.jsx / authService.js)
// so nothing renders a hardcoded '₹' for a business that isn't in India.
//
// Digit grouping still uses 'en-IN' (lakh/crore-style commas) regardless
// of currency — that's a separate decision from the symbol and hasn't
// been changed here. Flagged in chat; say the word if non-Indian users
// should get standard thousands-grouping instead.
export function formatCurrency(n, currency = '₹') {
  return `${currency}${Math.round(n || 0).toLocaleString('en-IN')}`
}