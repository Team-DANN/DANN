// Mock retailers + dispatch log. amountPaid is a NUMBER, not a boolean —
// lets Paid/Partial/Unpaid all derive from one field instead of needing a
// separate payments sub-log. Swap for real DB/API once backend exists.

import { extendedProductCatalog } from '../../production/data/productionMock.js'

function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

export const CREDIT_DAYS = 7 // default terms — flag if real bakeries vary this

export const mockRetailers = [
  { id: 'sharma-stores', name: 'Sharma Stores', phone: '9822011234' },
  { id: 'anita-general', name: 'Anita General Store', phone: '9876543210' },
  { id: 'deepak-bakery-mart', name: 'Deepak Bakery Mart', phone: '9765432109' },
  { id: 'fatima-supermart', name: 'Fatima Supermart', phone: '9654321098' },
]

// Which retailers show without searching — real version: ranked by dispatch
// frequency server-side, same pattern as Production's topProductIds.
export const topRetailerIds = ['sharma-stores', 'anita-general', 'deepak-bakery-mart']

function productName(productId) {
  return extendedProductCatalog.find((p) => p.id === productId)?.name ?? productId
}

export const mockDispatchLog = [
  {
    id: 'd1',
    retailerId: 'sharma-stores',
    items: [{ productId: 'bread-loaf', qty: 50 }],
    amount: 2500,
    amountPaid: 2500,
    date: daysAgo(1),
  },
  {
    id: 'd2',
    retailerId: 'anita-general',
    items: [{ productId: 'sponge-cake', qty: 10 }],
    amount: 3000,
    amountPaid: 1500,
    date: daysAgo(3),
  },
  {
    id: 'd3',
    retailerId: 'deepak-bakery-mart',
    items: [{ productId: 'butter-cookies', qty: 20 }],
    amount: 4000,
    amountPaid: 0,
    date: daysAgo(9), // past 7-day credit window — will read as overdue
  },
  {
    id: 'd4',
    retailerId: 'fatima-supermart',
    items: [{ productId: 'milk-bun', qty: 30 }],
    amount: 1800,
    amountPaid: 1800,
    date: daysAgo(5),
  },
  {
    id: 'd5',
    retailerId: 'sharma-stores',
    items: [{ productId: 'dinner-roll', qty: 15 }],
    amount: 2250,
    amountPaid: 0,
    date: daysAgo(2),
  },
]

export { productName }