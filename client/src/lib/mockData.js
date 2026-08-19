export const mockUser = {
  name: 'Leo Noel Zuze',
  email: 'leonoelzuze@gmail.com',
  initials: 'LZ',
  plan: 'Free',
  language: 'English',
}

// One Indian language (Hindi) + the most widely used international
// languages. More can be added later as translations are built out.
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

export const mockWeeklyMargin = {
  amount: 8450,
  trend: '+12%',
}

export const mockReceivables = {
  amount: 15200,
  overdueCount: 2,
}

export const mockAlerts = [
  { id: 1, type: 'LOW', message: 'Wheat flour 2 days left' },
  { id: 2, type: 'DUE', message: 'Sharma Retailers ₹4,200 overdue' },
]