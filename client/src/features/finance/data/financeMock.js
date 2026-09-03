// PATH: src/features/finance/data/financeMock.js
//
// Finance combines two data sources Orders/Inventory already own:
//  - Orders' dispatch log -> revenue (money invoiced + money actually collected)
//  - Inventory's restock log -> cost of goods (money spent on materials)
// Finance does not duplicate entries; it reads what Orders and Inventory
// already log. See RestockEntry.jsx's own comment: "this write also feeds
// Finance's cost-of-goods reporting."
//
// GAP (flagging, not guessing): there is no bill-of-materials linking a
// finished product to the materials/quantities it consumes, so true
// per-product profit margin can't be computed yet — "cost" below is total
// material spend across the whole business, not per-unit. Product-level
// views in this feature show REVENUE, not profit, until a BOM exists.

import { mockDispatchLog, mockRetailers, productName } from '../../orders/data/ordersMock.js'
import {
  mockRestockLog as liveRestockLog,
  inventoryMaterials,
} from '../../inventory/data/inventoryMock.js'

function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

// SEED DATA ONLY: real mockRestockLog starts empty (nothing's been logged
// via Inventory's "Log restock" flow yet). These entries exist purely so
// Finance has something to chart before that happens — the moment a real
// restock is logged, liveRestockLog.length > 0 and this seed is ignored.
const seedRestockLog = [
  { materialId: 'flour', qtyAdded: 100, cost: 3200, supplier: 'Sharma Wholesale', date: daysAgo(28) },
  { materialId: 'sugar', qtyAdded: 50, cost: 2100, supplier: 'Anita Traders', date: daysAgo(25) },
  { materialId: 'butter', qtyAdded: 20, cost: 9000, supplier: 'Deepak Dairy', date: daysAgo(20) },
  { materialId: 'eggs', qtyAdded: 300, cost: 2400, supplier: 'Local Farm', date: daysAgo(18) },
  { materialId: 'milk', qtyAdded: 40, cost: 2000, supplier: 'Deepak Dairy', date: daysAgo(15) },
  { materialId: 'flour', qtyAdded: 100, cost: 3300, supplier: 'Sharma Wholesale', date: daysAgo(12) },
  { materialId: 'yeast', qtyAdded: 2, cost: 900, supplier: 'Sharma Wholesale', date: daysAgo(10) },
  { materialId: 'sugar', qtyAdded: 50, cost: 2150, supplier: 'Anita Traders', date: daysAgo(6) },
  { materialId: 'butter', qtyAdded: 15, cost: 6900, supplier: 'Deepak Dairy', date: daysAgo(3) },
]

export const restockLog = liveRestockLog.length > 0 ? liveRestockLog : seedRestockLog

export { mockDispatchLog as dispatchLog, mockRetailers, productName, inventoryMaterials }