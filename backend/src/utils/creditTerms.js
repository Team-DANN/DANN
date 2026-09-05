// PATH: backend/utils/creditTerms.js

// Parses free-text credit_terms like "14 Days Net", "Net 30", "7 days" into
// a day count. Falls back to DEFAULT_CREDIT_DAYS when the field is empty or
// has no recognizable number. This mirrors the frontend's
// DEFAULT_CREDIT_DAYS constant in useReceivablesSummary.js — keep both in
// sync if you change this number. If credit_terms ever becomes a proper
// structured field (e.g. a numeric column) instead of free text, this
// regex parse should be replaced.
const DEFAULT_CREDIT_DAYS = 7;

function parseCreditDays(creditTerms) {
  if (!creditTerms) return DEFAULT_CREDIT_DAYS;
  const match = String(creditTerms).match(/(\d+)/);
  if (!match) return DEFAULT_CREDIT_DAYS;
  const days = parseInt(match[1], 10);
  return Number.isFinite(days) && days > 0 ? days : DEFAULT_CREDIT_DAYS;
}

module.exports = { parseCreditDays, DEFAULT_CREDIT_DAYS };