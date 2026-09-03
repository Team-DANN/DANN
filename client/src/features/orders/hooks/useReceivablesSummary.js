// Pure arithmetic over the dispatch log — everything (status, overdue,
// totals) derives from amount/amountPaid/date, no separate AR structure
// that could drift from the dispatch list.

import { useMemo } from 'react'
import { CREDIT_DAYS } from '../data/ordersMock.js'

export const PAYMENT_STATUS = {
  PAID: 'paid',
  PARTIAL: 'partial',
  UNPAID: 'unpaid',
}

export function getPaymentStatus(dispatch) {
  if (dispatch.amountPaid >= dispatch.amount) return PAYMENT_STATUS.PAID
  if (dispatch.amountPaid > 0) return PAYMENT_STATUS.PARTIAL
  return PAYMENT_STATUS.UNPAID
}

export function getAmountRemaining(dispatch) {
  return Math.max(dispatch.amount - dispatch.amountPaid, 0)
}

export function isOverdue(dispatch) {
  if (getPaymentStatus(dispatch) === PAYMENT_STATUS.PAID) return false
  const dueDate = new Date(dispatch.date)
  dueDate.setDate(dueDate.getDate() + CREDIT_DAYS)
  return new Date() > dueDate
}

// Plain function version — safe inside .filter()/.map() loops, same
// pattern as getRunwayEstimate in Inventory.
export function getDispatchSummary(dispatch) {
  return {
    status: getPaymentStatus(dispatch),
    remaining: getAmountRemaining(dispatch),
    overdue: isOverdue(dispatch),
  }
}

// Hook wrapper — for single-dispatch use inside a component body.
export function useReceivablesSummary(dispatches) {
  return useMemo(() => {
    const totalOwed = dispatches.reduce((sum, d) => sum + getAmountRemaining(d), 0)
    const overdueCount = dispatches.filter((d) => isOverdue(d)).length
    const overdueAmount = dispatches
      .filter((d) => isOverdue(d))
      .reduce((sum, d) => sum + getAmountRemaining(d), 0)
    return { totalOwed, overdueCount, overdueAmount }
  }, [dispatches])
}