// Mock materials + a fabricated production log, so avgDailyConsumption (and
// therefore runway) is DERIVED, not hardcoded — same shape the real Tier-1
// runway agent will consume later (qtyOnHand / avgDailyConsumption).
// Swap for real DB queries once backend/agents/ exists.
//
// ASSUMPTION: mockMaterials (lib/mockData.js) exposes { id, name, unit,
// qtyOnHand } per material — same shape ProductionPlannerPage already reads.
// Flag it if that's off and I'll adjust the fields below.

import { mockMaterials } from '../../../lib/mockData.js'

function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}

// 7 days of consumption per material, with natural day-to-day variance —
// not a flat number, since that's not how real bakeries run.
export const productionLog = [
  // Flour — used across bread, cake, cookies, buns: highest daily draw
  { date: daysAgo(6), materialId: 'flour', qtyConsumed: 18 },
  { date: daysAgo(5), materialId: 'flour', qtyConsumed: 22 },
  { date: daysAgo(4), materialId: 'flour', qtyConsumed: 15 },
  { date: daysAgo(3), materialId: 'flour', qtyConsumed: 20 },
  { date: daysAgo(2), materialId: 'flour', qtyConsumed: 26 },
  { date: daysAgo(1), materialId: 'flour', qtyConsumed: 19 },
  { date: daysAgo(0), materialId: 'flour', qtyConsumed: 21 },

  // Sugar
  { date: daysAgo(6), materialId: 'sugar', qtyConsumed: 6 },
  { date: daysAgo(5), materialId: 'sugar', qtyConsumed: 8 },
  { date: daysAgo(4), materialId: 'sugar', qtyConsumed: 5 },
  { date: daysAgo(3), materialId: 'sugar', qtyConsumed: 7 },
  { date: daysAgo(2), materialId: 'sugar', qtyConsumed: 9 },
  { date: daysAgo(1), materialId: 'sugar', qtyConsumed: 6 },
  { date: daysAgo(0), materialId: 'sugar', qtyConsumed: 7 },

  // Butter
  { date: daysAgo(6), materialId: 'butter', qtyConsumed: 3.2 },
  { date: daysAgo(5), materialId: 'butter', qtyConsumed: 4.1 },
  { date: daysAgo(4), materialId: 'butter', qtyConsumed: 2.8 },
  { date: daysAgo(3), materialId: 'butter', qtyConsumed: 3.5 },
  { date: daysAgo(2), materialId: 'butter', qtyConsumed: 4.4 },
  { date: daysAgo(1), materialId: 'butter', qtyConsumed: 3.0 },
  { date: daysAgo(0), materialId: 'butter', qtyConsumed: 3.6 },

  // Eggs (counted in units, not weight)
  { date: daysAgo(6), materialId: 'eggs', qtyConsumed: 40 },
  { date: daysAgo(5), materialId: 'eggs', qtyConsumed: 55 },
  { date: daysAgo(4), materialId: 'eggs', qtyConsumed: 30 },
  { date: daysAgo(3), materialId: 'eggs', qtyConsumed: 48 },
  { date: daysAgo(2), materialId: 'eggs', qtyConsumed: 60 },
  { date: daysAgo(1), materialId: 'eggs', qtyConsumed: 35 },
  { date: daysAgo(0), materialId: 'eggs', qtyConsumed: 42 },

  // Milk
  { date: daysAgo(6), materialId: 'milk', qtyConsumed: 5 },
  { date: daysAgo(5), materialId: 'milk', qtyConsumed: 6.5 },
  { date: daysAgo(4), materialId: 'milk', qtyConsumed: 4 },
  { date: daysAgo(3), materialId: 'milk', qtyConsumed: 5.5 },
  { date: daysAgo(2), materialId: 'milk', qtyConsumed: 7 },
  { date: daysAgo(1), materialId: 'milk', qtyConsumed: 4.5 },
  { date: daysAgo(0), materialId: 'milk', qtyConsumed: 5.8 },

  // Yeast — small quantities (grams), low but steady use
  { date: daysAgo(6), materialId: 'yeast', qtyConsumed: 90 },
  { date: daysAgo(5), materialId: 'yeast', qtyConsumed: 110 },
  { date: daysAgo(4), materialId: 'yeast', qtyConsumed: 75 },
  { date: daysAgo(3), materialId: 'yeast', qtyConsumed: 95 },
  { date: daysAgo(2), materialId: 'yeast', qtyConsumed: 105 },
  { date: daysAgo(1), materialId: 'yeast', qtyConsumed: 85 },
  { date: daysAgo(0), materialId: 'yeast', qtyConsumed: 100 },
]

// Real version: same aggregation, just run server-side over actual
// production entries instead of this hardcoded log.
function computeAvgDailyConsumption(materialId) {
  const entries = productionLog.filter((e) => e.materialId === materialId)
  if (entries.length === 0) return 0
  const total = entries.reduce((sum, e) => sum + e.qtyConsumed, 0)
  return total / entries.length
}

export const inventoryMaterials = mockMaterials.map((m) => ({
  ...m,
  avgDailyConsumption: computeAvgDailyConsumption(m.id),
}))

// Restock purchases — starts empty, RestockEntry pushes into this shape.
// Real version: persisted, and read by Finance for cost-of-goods reporting.
export const mockRestockLog = []