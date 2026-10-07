// Mirrors parseProductionPhoto.js's conventions, adapted for inventory
// delivery notes / stock counts. Every value here always lands in an
// editable field in InventoryPhotoBatchReview, never auto-submitted.

function normalize(str) {
  return str.toLowerCase().trim()
}

function findMatchedMaterial(text, materials) {
  const normalized = text.toLowerCase()
  return materials.find((m) => normalized.includes(m.name.toLowerCase())) || null
}

function guessQuantity(text) {
  const contextual = text.match(/(?:qty|quantity|delivered|received|restock(?:ed)?|added|count)\D{0,10}(\d+(?:\.\d+)?)/i)
  if (contextual) return parseFloat(contextual[1])

  const fallback = text.match(/\b\d+(\.\d+)?\b/)
  return fallback ? parseFloat(fallback[0]) : null
}

function guessCost(text) {
  const labeled = text.match(/(?:cost|price|total|amount|rate)\D{0,10}(\d+(?:\.\d+)?)/i)
  if (labeled) return parseFloat(labeled[1])

  const currency = text.match(/(?:₹|rs\.?|inr|\$)\s*(\d+(?:\.\d+)?)/i)
  if (currency) return parseFloat(currency[1])

  return null
}

// Only meaningful for a brand-new material — an existing one already has
// its own threshold set from when it was created.
function guessReorderThreshold(text) {
  const match = text.match(/(?:reorder|threshold|low[\s-]?stock|alert)\D{0,10}(\d+(?:\.\d+)?)/i)
  return match ? parseFloat(match[1]) : null
}

function guessMaterialName(text) {
  const match = text.match(/(?:material|item|ingredient)(?:\s*name)?\s*[:\-]\s*(.+)/i)
  if (!match) return null
  return match[1].split('\n')[0].trim() || null
}

const UNIT_WORDS = ['kg', 'gram', 'grams', 'g', 'litre', 'liter', 'litres', 'liters', 'l', 'ml', 'piece', 'pieces', 'unit', 'units', 'box', 'boxes', 'pack', 'packs', 'bag', 'bags']

function guessUnit(text) {
  const lower = text.toLowerCase()
  for (const word of UNIT_WORDS) {
    if (new RegExp(`\\b${word}\\b`).test(lower)) {
      if (word.startsWith('gram')) return 'g'
      if (word.startsWith('lit')) return 'l'
      if (word.startsWith('piece') || word.startsWith('unit')) return 'units'
      return word
    }
  }
  return null
}

function guessSupplier(text) {
  const match = text.match(/(?:supplier|vendor|from)\s*[:\-]\s*(.+)/i)
  if (!match) return null
  return match[1].split('\n')[0].trim() || null
}

export function parseInventoryPhoto(text, materials) {
  const matchedMaterial = findMatchedMaterial(text, materials)
  const quantity = guessQuantity(text)
  const cost = guessCost(text)

  if (matchedMaterial) {
    return {
      matchedMaterial,
      quantity,
      cost,
      candidateName: null,
      candidateUnit: null,
      candidateSupplier: null,
      candidateReorderThreshold: null,
    }
  }

  return {
    matchedMaterial: null,
    quantity,
    cost,
    candidateName: guessMaterialName(text),
    candidateUnit: guessUnit(text),
    candidateSupplier: guessSupplier(text),
    candidateReorderThreshold: guessReorderThreshold(text),
  }
}

const MATERIAL_LABEL_LINE = /^\s*(?:material|item|ingredient)(?:\s*name)?\s*[:\-]/i

function segmentIntoBlocks(text) {
  const lines = text.split(/\r?\n/)
  const blocks = []
  let current = []

  function flush() {
    const joined = current.join('\n').trim()
    if (joined) blocks.push(joined)
    current = []
  }

  for (const line of lines) {
    const isBlank = line.trim() === ''
    const startsNewMaterial = MATERIAL_LABEL_LINE.test(line)

    if (isBlank) {
      flush()
      continue
    }
    if (startsNewMaterial && current.length > 0) {
      flush()
    }
    current.push(line)
  }
  flush()

  return blocks
}

export function parseInventoryPhotoBatch(text, materials) {
  const blocks = segmentIntoBlocks(text)
  if (blocks.length === 0) return []
  return blocks.map((block) => parseInventoryPhoto(block, materials))
}