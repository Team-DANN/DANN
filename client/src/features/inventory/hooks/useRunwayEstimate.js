// Pure arithmetic — same shape the real Tier-1 runway agent will use later,
// just running client-side on mock data for now.

import { useMemo } from 'react'

export const RUNWAY_STATUS = {
  CRITICAL: 'critical',
  LOW: 'low',
  OK: 'ok',
  UNKNOWN: 'unknown', // no usage history yet — can't estimate
}

const THRESHOLDS = {
  CRITICAL_DAYS: 2,
  LOW_DAYS: 5,
}

// Plain function — holds no React state of its own, so it's safe to call
// inside loops (.filter/.map over a material list), unlike a real hook.
export function getRunwayEstimate(material) {
  const { qtyOnHand, avgDailyConsumption } = material

  if (!avgDailyConsumption || avgDailyConsumption <= 0) {
    return { runwayDays: null, status: RUNWAY_STATUS.UNKNOWN, label: 'No usage yet' }
  }

  const runwayDays = qtyOnHand / avgDailyConsumption

  if (runwayDays < THRESHOLDS.CRITICAL_DAYS) {
    return { runwayDays, status: RUNWAY_STATUS.CRITICAL, label: `${runwayDays.toFixed(1)}d left` }
  }
  if (runwayDays < THRESHOLDS.LOW_DAYS) {
    return { runwayDays, status: RUNWAY_STATUS.LOW, label: `${runwayDays.toFixed(1)}d left` }
  }
  return { runwayDays, status: RUNWAY_STATUS.OK, label: `${Math.round(runwayDays)}d left` }
}

// Thin hook wrapper — use this inside a single component's render (e.g. a
// row or detail view), not inside a loop over multiple materials.
export function useRunwayEstimate(material) {
  return useMemo(
    () => getRunwayEstimate(material),
    [material.qtyOnHand, material.avgDailyConsumption]
  )
}