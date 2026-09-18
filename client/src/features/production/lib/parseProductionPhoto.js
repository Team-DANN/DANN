// Best-effort guess only — never auto-submitted. Both values land in the
// exact same QuantityStepper/ConfirmProduction screens manual entry uses,
// so the user always sees and can correct them before anything is logged.

function findMatchedProduct(text, products) {
  const normalized = text.toLowerCase()
  return products.find((p) => normalized.includes(p.name.toLowerCase())) || null
}

function guessQuantity(text) {
  // First standalone number in the text. Deliberately simple — real
  // production photos often have several numbers (dates, batch codes),
  // so this WILL grab the wrong one sometimes. That's fine as a default
  // since it's always editable, never trusted as final — but expect to
  // need refinement once tested against real photos, same as the
  // classifier's keyword matching did.
  const match = text.match(/\b\d+(\.\d+)?\b/)
  return match ? parseFloat(match[0]) : null
}

export function parseProductionPhoto(text, products) {
  return {
    matchedProduct: findMatchedProduct(text, products),
    quantity: guessQuantity(text),
  }
}