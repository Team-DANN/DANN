// PATH: src/lib/alertDisplay.js

// Maps backend `type` values to short badge text.
const TYPE_LABELS = {
  low_stock: 'STOCK',
  payment_overdue: 'PAYMENT',
  runway_low: 'RUNWAY',
}

// Maps backend `severity` values to badge color. Falls back to the
// muted/neutral style for anything unrecognized rather than defaulting
// to error red — an unknown severity shouldn't silently look urgent.
const SEVERITY_STYLES = {
  high: 'bg-[var(--color-error)] text-[var(--color-paper-light)]',
  medium: 'bg-[var(--color-warning)] text-[var(--color-paper-light)]',
  low: 'bg-[var(--color-border)] text-[var(--color-ink-muted)]',
}

export function getAlertBadgeLabel(alert) {
  return TYPE_LABELS[alert.type] || alert.type.toUpperCase()
}

export function getAlertBadgeClass(alert) {
  return SEVERITY_STYLES[alert.severity] || SEVERITY_STYLES.low
}