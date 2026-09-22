// Best-effort guess only — every value here always lands in an editable
// field (QuantityStepper, or AddProductFlow/PhotoBatchReview's inputs),
// never auto-submitted. materials is only needed for the new-product
// path (matching written ingredient lines against real inventory items).

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

// Prefer an explicitly labeled amount ("Price:", "MRP", "Rate", "Cost")
// over a bare currency-prefixed number, and either over nothing — the
// label is the strongest signal that a number is actually a price and
// not, say, a quantity or a batch number sitting nearby on the page.
function guessPrice(text) {
  const labeled = text.match(/(?:price|mrp|rate|cost)\D{0,10}(\d+(?:\.\d+)?)/i)
  if (labeled) return parseFloat(labeled[1])

  const currency = text.match(/(?:₹|rs\.?|inr)\s*(\d+(?:\.\d+)?)/i)
  if (currency) return parseFloat(currency[1])

  return null
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

// Looks for "Ingredient name - amount unit" style lines. A written line
// is the TOTAL used for the whole batch, but a recipe row is defined per
// single unit of product — so this divides by quantity produced rather
// than copying the raw batch total in as qtyPerUnit.
//
// Two outcomes per line, split into separate buckets instead of one:
//   - matches a real material  -> matchedRows (auto-wired, as before)
//   - no confident match       -> unmatchedRows (used to be silently
//     dropped here; now surfaced so the person can link it to an
//     existing material or add it to inventory as new, instead of the
//     ingredient just vanishing from the recipe with no trace)
function guessRecipeRows(text, materials, totalQuantity) {
  const lines = text.split(/\r?\n/)
  const matchedRows = []
  const unmatchedRows = []

  for (const line of lines) {
    const match = line.match(/^\s*([a-zA-Z][a-zA-Z\s]*?)\s*[-:]\s*(\d+(?:\.\d+)?)\s*([a-zA-Z]*)/)
    if (!match) continue

    const candidateName = match[1].trim()
    const rawName = normalize(candidateName)
    const amount = parseFloat(match[2])
    const detectedUnit = (match[3] || '').trim()
    if (!rawName || !amount) continue

    const material = materials.find((m) => {
      const mName = normalize(m.name)
      return mName === rawName || mName.includes(rawName) || rawName.includes(mName)
    })

    const qtyPerUnit = totalQuantity && totalQuantity > 0 ? amount / totalQuantity : amount

    if (material) {
      matchedRows.push({ materialId: material.id, qtyPerUnit: qtyPerUnit.toFixed(4) })
    } else {
      unmatchedRows.push({
        candidateName,
        totalAmount: amount,
        detectedUnit,
        qtyPerUnit: qtyPerUnit.toFixed(4),
      })
    }
  }

  return { matchedRows, unmatchedRows }
}

export function parseProductionPhoto(text, products, materials = []) {
  const matchedProduct = findMatchedProduct(text, products)
  const quantity = guessQuantity(text)

  if (matchedProduct) {
    // Matched product already has its own recipe in the DB — no need to
    // parse ingredient lines for it at all.
    return {
      matchedProduct,
      quantity,
      candidateName: null,
      candidatePrice: null,
      candidateRecipeRows: [],
      unmatchedIngredients: [],
    }
  }

  const { matchedRows, unmatchedRows } = guessRecipeRows(text, materials, quantity)

  return {
    matchedProduct: null,
    quantity,
    candidateName: guessProductName(text),
    candidatePrice: guessPrice(text),
    candidateRecipeRows: matchedRows,
    unmatchedIngredients: unmatchedRows,
  }
}