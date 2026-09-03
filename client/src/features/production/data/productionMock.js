// PATH: src/features/production/data/productionMock.js
// Only AI-suggestion scaffolding remains, and only because I can't see
// whether AddProductFlow's sibling screens still reference it — if nothing
// imports verticalOptions/suggestedProductsByVertical anymore, delete this
// file outright. mockVoiceResponses is gone for good (see VoiceLogButton).

export const verticalOptions = [
  { id: 'bakery', label: 'Bakery' },
  { id: 'snacks', label: 'Snacks / Namkeen' },
  { id: 'dairy', label: 'Dairy' },
  { id: 'beverages', label: 'Beverages / Bottling' },
]

// TODO: replace with a real call through agents/ once that endpoint exists.
export const suggestedProductsByVertical = {
  bakery: [/* ...unchanged... */],
  // ...
}