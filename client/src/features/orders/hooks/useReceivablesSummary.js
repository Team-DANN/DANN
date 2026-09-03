// PATH: src/features/orders/hooks/useReceivablesSummary.js
import { useMemo } from 'react'

// Client-side-only nudge for the "overdue" badge — not persisted, not
// billed. If retailer.credit_terms ever gets parsed into a day count,
// prefer that per-retailer instead of this flat default.
const DEFAULT_CREDIT_DAYS = 7

export const PAYMENT_STATUS = { PAID: 'paid', PARTIAL: 'partial', UNPAID: 'unpaid' }

export function getPaymentStatus(order) {
  const paid = order.amount_paid ?? 0
  const total = order.amount ?? 0
  if (total > 0 && paid >= total) return PAYMENT_STATUS.PAID
  if (paid > 0) return PAYMENT_STATUS.PARTIAL
  return PAYMENT_STATUS.UNPAID
}

export function getAmountRemaining(order) {
  return Math.max((order.amount ?? 0) - (order.amount_paid ?? 0), 0)
}

export function isOverdue(order, creditDays = DEFAULT_CREDIT_DAYS) {
  if (getPaymentStatus(order) === PAYMENT_STATUS.PAID) return false
  const dueDate = new Date(order.created_at)
  dueDate.setDate(dueDate.getDate() + creditDays)
  return new Date() > dueDate
}

export function getDispatchSummary(order) {
  return { status: getPaymentStatus(order), remaining: getAmountRemaining(order), overdue: isOverdue(order) }
}

export function useReceivablesSummary(orders) {
  return useMemo(() => {
    const totalOwed = orders.reduce((sum, o) => sum + getAmountRemaining(o), 0)
    const overdueCount = orders.filter((o) => isOverdue(o)).length
    const overdueAmount = orders.filter((o) => isOverdue(o)).reduce((sum, o) => sum + getAmountRemaining(o), 0)
    return { totalOwed, overdueCount, overdueAmount }
  }, [orders])
}