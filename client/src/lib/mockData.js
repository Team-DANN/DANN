export const mockUser = {
  name: 'Leo Noel Zuze',
  email: 'leonoelzuze@gmail.com',
  initials: 'LZ',
  plan: 'Free',
  language: 'English',
}

export const languageOptions = [
  'English',
  'Hindi',
  'Spanish',
  'French',
  'German',
  'Portuguese',
  'Mandarin Chinese',
  'Arabic',
  'Russian',
  'Japanese',
  
]

export const mockRunway = {
  material: 'Wheat flour',
  daysLeft: 2,
}

// trend is a plain number — positive or negative, no +/-/% typed in.
// Display formatting (sign, %, color) is computed from this value.
export const mockWeeklyMargin = {
  amount: 8450,
  trend: 12,
}

export const mockReceivables = {
  amount: 15200,
  overdueCount: 2,
}

export const mockAlerts = [
  { id: 1, type: 'LOW', message: 'Wheat flour , 2 days left' },
  { id: 2, type: 'DUE', message: 'Sharma Retailers, ₹4,200 overdue' },
]

// Raw materials — bakery. qtyOnHand in the given unit.
export const mockMaterials = [
  { id: 'flour', name: 'Wheat flour', unit: 'kg', qtyOnHand: 18 },
  { id: 'sugar', name: 'Sugar', unit: 'kg', qtyOnHand: 12 },
  { id: 'butter', name: 'Butter', unit: 'kg', qtyOnHand: 6 },
  { id: 'eggs', name: 'Eggs', unit: 'pcs', qtyOnHand: 90 },
  { id: 'milk', name: 'Milk', unit: 'l', qtyOnHand: 10 },
  { id: 'yeast', name: 'Yeast', unit: 'g', qtyOnHand: 400 },
]

// Product catalog moved to features/production/data/productionMock.js —
// it's production-specific (search catalog, AI suggestions, recipes) and
// doesn't belong in the shared app-wide mock file.