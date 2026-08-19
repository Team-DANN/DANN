// All mock — swap for real DB/API calls once agents/ and backend/ endpoints exist.
// Kept separate from lib/mockData.js so production-specific mocks (search catalog,
// AI suggestions, voice parses) don't bloat the shared file.

import { mockMaterials } from '../../../lib/mockData.js'

// ---------------------------------------------------------------------------
// Full product catalog — owned here now (previously spread in mockProducts
// from lib/mockData.js, which has been removed since it belonged with
// production, not the shared app-wide mocks).
// No `emoji` field — ProductTile shows a real photo via useProductImage,
// with a neutral icon placeholder if no photo is found, not an emoji.
// Real version: paginated/searched from the DB, not loaded in full client-side.
// ---------------------------------------------------------------------------
export const extendedProductCatalog = [
  {
    id: 'bread-loaf',
    name: 'Bread Loaf',
    recipe: [
      { materialId: 'flour', qtyPerUnit: 0.5 },
      { materialId: 'yeast', qtyPerUnit: 5 },
      { materialId: 'milk', qtyPerUnit: 0.1 },
    ],
  },
  {
    id: 'sponge-cake',
    name: 'Sponge Cake',
    recipe: [
      { materialId: 'flour', qtyPerUnit: 0.3 },
      { materialId: 'sugar', qtyPerUnit: 0.2 },
      { materialId: 'butter', qtyPerUnit: 0.15 },
      { materialId: 'eggs', qtyPerUnit: 3 },
    ],
  },
  {
    id: 'butter-cookies',
    name: 'Butter Cookies (dozen)',
    recipe: [
      { materialId: 'flour', qtyPerUnit: 0.25 },
      { materialId: 'sugar', qtyPerUnit: 0.15 },
      { materialId: 'butter', qtyPerUnit: 0.2 },
    ],
  },
  {
    id: 'milk-bun',
    name: 'Milk Bun (pack of 6)',
    recipe: [
      { materialId: 'flour', qtyPerUnit: 0.4 },
      { materialId: 'milk', qtyPerUnit: 0.2 },
      { materialId: 'eggs', qtyPerUnit: 1 },
    ],
  },
  {
    id: 'dinner-roll',
    name: 'Dinner Rolls (dozen)',
    recipe: [
      { materialId: 'flour', qtyPerUnit: 0.35 },
      { materialId: 'yeast', qtyPerUnit: 4 },
      { materialId: 'milk', qtyPerUnit: 0.08 },
    ],
  },
  {
    id: 'rusk',
    name: 'Rusk (pack)',
    recipe: [
      { materialId: 'flour', qtyPerUnit: 0.45 },
      { materialId: 'sugar', qtyPerUnit: 0.1 },
      { materialId: 'butter', qtyPerUnit: 0.05 },
    ],
  },
  {
    id: 'donut',
    name: 'Glazed Donut',
    recipe: [
      { materialId: 'flour', qtyPerUnit: 0.2 },
      { materialId: 'sugar', qtyPerUnit: 0.12 },
      { materialId: 'butter', qtyPerUnit: 0.08 },
      { materialId: 'eggs', qtyPerUnit: 0.5 },
    ],
  },
  {
    id: 'muffin',
    name: 'Muffin (box of 4)',
    recipe: [
      { materialId: 'flour', qtyPerUnit: 0.3 },
      { materialId: 'sugar', qtyPerUnit: 0.18 },
      { materialId: 'eggs', qtyPerUnit: 2 },
      { materialId: 'milk', qtyPerUnit: 0.15 },
    ],
  },
  {
    id: 'pretzel',
    name: 'Soft Pretzel',
    recipe: [
      { materialId: 'flour', qtyPerUnit: 0.25 },
      { materialId: 'yeast', qtyPerUnit: 3 },
      { materialId: 'butter', qtyPerUnit: 0.03 },
    ],
  },
  {
    id: 'croissant',
    name: 'Croissant',
    recipe: [
      { materialId: 'flour', qtyPerUnit: 0.18 },
      { materialId: 'butter', qtyPerUnit: 0.12 },
      { materialId: 'milk', qtyPerUnit: 0.05 },
    ],
  },
]

// Which ones are "used often enough to show without searching."
// Real version: ranked by actual production frequency, not a hardcoded slice.
export const topProductIds = ['bread-loaf', 'sponge-cake', 'butter-cookies', 'milk-bun']

// ---------------------------------------------------------------------------
// AI-suggested new products, by business vertical.
// Real version: LLM call through agents/ (intelligence_routes.py), scoped to
// the owner's known materials so suggested recipes only use ingredients
// they've already told the app they stock.
// ---------------------------------------------------------------------------
export const verticalOptions = [
  { id: 'bakery', label: 'Bakery' },
  { id: 'snacks', label: 'Snacks / Namkeen' },
  { id: 'dairy', label: 'Dairy' },
  { id: 'beverages', label: 'Beverages / Bottling' },
]

export const suggestedProductsByVertical = {
  bakery: [
    {
      name: 'Whole Wheat Rusk',
      recipe: [
        { materialId: 'flour', qtyPerUnit: 0.4 },
        { materialId: 'sugar', qtyPerUnit: 0.08 },
        { materialId: 'butter', qtyPerUnit: 0.04 },
      ],
    },
    {
      name: 'Egg Puff',
      recipe: [
        { materialId: 'flour', qtyPerUnit: 0.22 },
        { materialId: 'butter', qtyPerUnit: 0.1 },
        { materialId: 'eggs', qtyPerUnit: 1 },
      ],
    },
    {
      name: 'Milk Cake Slice',
      recipe: [
        { materialId: 'flour', qtyPerUnit: 0.28 },
        { materialId: 'milk', qtyPerUnit: 0.2 },
        { materialId: 'sugar', qtyPerUnit: 0.2 },
      ],
    },
  ],
  snacks: [
    {
      name: 'Chakli (pack)',
      recipe: [{ materialId: 'flour', qtyPerUnit: 0.3 }],
    },
    {
      name: 'Sev (pack)',
      recipe: [{ materialId: 'flour', qtyPerUnit: 0.25 }],
    },
  ],
  dairy: [
    {
      name: 'Paneer (kg)',
      recipe: [{ materialId: 'milk', qtyPerUnit: 5 }],
    },
  ],
  beverages: [
    {
      name: 'Bottled Lassi (500ml)',
      recipe: [{ materialId: 'milk', qtyPerUnit: 0.5 }, { materialId: 'sugar', qtyPerUnit: 0.05 }],
    },
  ],
}

// ---------------------------------------------------------------------------
// Voice logging — canned STT + intent-parse results, cycled through so the
// mic button demo feels alive. Real version: audio -> Whisper/WhisperFlow ->
// LLM parse -> { productId, quantity, confidence }.
// ---------------------------------------------------------------------------
export const mockVoiceResponses = [
  { transcript: 'Sponge cake, forty', productId: 'sponge-cake', quantity: 40, confidence: 'high' },
  { transcript: 'Bread loaf do sau', productId: 'bread-loaf', quantity: 200, confidence: 'high' },
  { transcript: 'Butter cookies, kuch pachaas', productId: 'butter-cookies', quantity: 50, confidence: 'medium' },
  { transcript: '...', productId: null, quantity: null, confidence: 'low' },
]

export { mockMaterials }