// Best-effort guess only — every value here always lands in an editable
// field (QuantityStepper, or now AddProductFlow's inputs), never
// auto-submitted. materials is only needed for the new-product path
// (matching written ingredient lines against real inventory items).

function findMatchedProduct(text, products) {
  const normalized = text.toLowerCase()
  return products.find((p) => normalized.includes(p.name.toLowerCase())) || null
}

function guessQuantity(text) {
  // Prefer a number near "produced"/"units"/"qty" — grabbing the first
  // number anywhere in the text breaks the moment a batch number, date,
  // or anything else numeric appears earlier in the note (real case: a
  // "Batch 1" line ahead of "Units produced: 50" would otherwise grab 1).
  const contextual = text.match(/(?:produced|units?|qty|quantity)\D{0,10}(\d+(?:\.\d+)?)/i)
  if (contextual) return parseFloat(contextual[1])

  const fallback = text.match(/\b\d+(\.\d+)?\b/)
  return fallback ? parseFloat(fallback[0]) : null
}

// Only called when no real product matched — pulls whatever follows
// "Product:" / "Product Name:" as a candidate name for a brand new one.
function guessProductName(text) {
  const match = text.match(/product(?:\s*name)?\s*[:\-]\s*(.+)/i)
  if (!match) return null
  return match[1].split('\n')[0].trim() || null
}

function normalize(str) {
  return str.toLowerCase().trim()
}

// Looks for "Ingredient name - amount unit" style lines and matches each
// name against the business's real materials. A written line is the
// TOTAL used for the whole batch, but a recipe row is defined per single
// unit of product — so this divides by quantity produced rather than
// copying the raw batch total in as qtyPerUnit.
function guessRecipeRows(text, materials, totalQuantity) {
  const lines = text.split(/\r?\n/)
  const rows = []

  for (const line of lines) {
    const match = line.match(/^\s*([a-zA-Z][a-zA-Z\s]*?)\s*[-:]\s*(\d+(?:\.\d+)?)\s*([a-zA-Z]*)/)
    if (!match) continue

    const rawName = normalize(match[1])
    const amount = parseFloat(match[2])
    if (!rawName || !amount) continue

    const material = materials.find((m) => {
      const mName = normalize(m.name)
      return mName === rawName || mName.includes(rawName) || rawName.includes(mName)
    })
    if (!material) continue // no confident match — user adds it manually instead

    const qtyPerUnit = totalQuantity && totalQuantity > 0 ? amount / totalQuantity : amount
    rows.push({ materialId: material.id, qtyPerUnit: qtyPerUnit.toFixed(4) })
  }

  return rows
}

export function parseProductionPhoto(text, products, materials = []) {
  const matchedProduct = findMatchedProduct(text, products)
  const quantity = guessQuantity(text)

  if (matchedProduct) {
    return { matchedProduct, quantity, candidateName: null, candidateRecipeRows: [] }
  }

  return {
    matchedProduct: null,
    quantity,
    candidateName: guessProductName(text),
    candidateRecipeRows: guessRecipeRows(text, materials, quantity),
  }
}