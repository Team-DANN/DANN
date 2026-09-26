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

function findMaterialByName(materials, rawName) {
  return materials.find((m) => {
    const mName = normalize(m.name)
    return mName === rawName || mName.includes(rawName) || rawName.includes(mName)
  })
}

// "Units produced: 35" and "Price: 95" match the exact same "word(s) [-:]
// number [unit]" shape the ingredient regex below looks for — so without
// this exclusion, the batch's own quantity/price lines get misread as
// ingredients ("Units produced" and "Price" showing up as if they were
// something stocked). Word-boundaried so it doesn't also eat a real
// ingredient whose name merely contains one of these as a substring
// (e.g. "Costco Cheese" shouldn't be excluded just for containing "cost").
const META_LINE = /\b(?:produced|units?|qty|quantity|price|mrp|rate|cost)\b/i

// Looks for "Ingredient name - amount unit" style lines. A written line
// is the TOTAL used for the whole batch, but a recipe row is defined per
// single unit of product — so this divides by quantity produced rather
// than copying the raw batch total in as qtyPerUnit.
//
// Three outcomes per line now, not two:
//   - matches a real material, has an amount -> matchedRows (auto-wired)
//   - no confident material match, has an amount -> unmatchedRows,
//     amountMissing: false (the original "surfaced, not dropped" case)
//   - an ingredient-shaped line with NO parseable amount ("Sugar -",
//     "Flour:", or a bare "Sugar" with a separator and nothing after it)
//     -> unmatchedRows, amountMissing: true, totalAmount: null.
//     This used to be silently dropped because the primary regex
//     requires a number to match at all — the person's handwritten note
//     mentioned the ingredient but the OCR/parser had nothing to read
//     for the quantity, and the line just vanished with no trace. Now it
//     surfaces so the person can type in what was actually used instead
//     of the recipe silently missing an ingredient. Still requires an
//     explicit "-" or ":" separator so arbitrary prose lines don't start
//     getting treated as ingredients.
function guessRecipeRows(text, materials, totalQuantity) {
  const lines = text.split(/\r?\n/)
  const matchedRows = []
  const unmatchedRows = []

  for (const line of lines) {
    if (META_LINE.test(line)) continue

    const withAmount = line.match(/^\s*([a-zA-Z][a-zA-Z\s]*?)\s*[-:]\s*(\d+(?:\.\d+)?)\s*([a-zA-Z]*)/)
    if (withAmount) {
      const candidateName = withAmount[1].trim()
      const rawName = normalize(candidateName)
      const amount = parseFloat(withAmount[2])
      const detectedUnit = (withAmount[3] || '').trim()
      if (!rawName || !amount) continue

      const material = findMaterialByName(materials, rawName)
      const qtyPerUnit = totalQuantity && totalQuantity > 0 ? amount / totalQuantity : amount

      if (material) {
        matchedRows.push({ materialId: material.id, qtyPerUnit: qtyPerUnit.toFixed(4) })
      } else {
        unmatchedRows.push({
          candidateName,
          totalAmount: amount,
          detectedUnit,
          amountMissing: false,
          matchedMaterialId: null,
        })
      }
      continue
    }

    // No amount at all — still surface it, don't drop it.
    const noAmount = line.match(/^\s*([a-zA-Z][a-zA-Z\s]*?)\s*[-:]\s*([a-zA-Z]*)\s*$/)
    if (noAmount) {
      const candidateName = noAmount[1].trim()
      if (!candidateName) continue
      const rawName = normalize(candidateName)
      const material = findMaterialByName(materials, rawName)
      // Even when the name matches a real material, there's still
      // nothing to divide by totalQuantity — it always needs the
      // person's input regardless of whether the name matched.
      unmatchedRows.push({
        candidateName,
        totalAmount: null,
        detectedUnit: (noAmount[2] || '').trim(),
        amountMissing: true,
        matchedMaterialId: material ? material.id : null,
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

// ---- Multi-product-per-photo support ----
//
// A single photo can contain several separate production-log entries
// (e.g. three different products noted on one page). parseProductionPhoto
// above was built for exactly one entry — it returns the instant it finds
// ANY known product name anywhere in the text, silently absorbing
// everything else into that one entry. To handle several, the text has
// to be split into independent blocks FIRST, each one then run through
// the existing single-entry parser unchanged.
//
// Two signals mark where a new block starts, either is enough on its own:
//   - an explicit "Product:" / "Product Name:" label line — the
//     strongest signal, since that's exactly how a new/unmatched
//     product always gets named
//   - a blank line separating one paragraph from the next — catches a
//     matched-product block that's just a name/quantity with no label
// Whichever signal fires, whatever's been accumulated so far is flushed
// (if non-empty) and a fresh block starts; the blank line itself is
// never kept in either block.
//
// Known limit: if a matched-product entry has neither an explicit label
// NOR a blank line separating it from its neighbor, there's no signal
// left to split on and it will get absorbed into the adjacent block.
const PRODUCT_LABEL_LINE = /^\s*product(?:\s*name)?\s*[:\-]/i

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
    const startsNewProduct = PRODUCT_LABEL_LINE.test(line)

    if (isBlank) {
      flush()
      continue
    }
    if (startsNewProduct && current.length > 0) {
      flush()
    }
    current.push(line)
  }
  flush()

  return blocks
}

// Returns an ARRAY of parsed entries (one per detected block), instead of
// parseProductionPhoto's single object. Every caller should use this now
// — it degrades gracefully to a single-item array for a photo that only
// has one product on it, so nothing about the single-product case changes.
export function parseProductionPhotoBatch(text, products, materials = []) {
  const blocks = segmentIntoBlocks(text)
  if (blocks.length === 0) return []
  return blocks.map((block) => parseProductionPhoto(block, products, materials))
}