// PATH: src/features/ai-insights/chatbot/messages/proposalFormat.js
//
// Turns a proposal's `lines` into rows for the confirm card. The service has
// three line shapes (6.14 step 3 of the handoff):
//   { label, before, after, unit }                         restock, adjust, order stock
//   { label, value, unit? }                                create material, create product, order money
//   { material, amount, unit, left_after }                 production batch
// A unit that starts with a currency symbol puts the symbol in front and keeps
// the rest after the number: "$" gives "$100", "$ per kg" gives "$40 per kg".
// Any other unit goes after ("22.5 kg"). Numbers are shown as the service
// sent them, only grouped and trimmed; text values are left alone.

// "$" or "₹ per kg": a currency symbol, then optionally the rest of the unit.
const CURRENCY_UNIT = /^(\p{Sc}+)\s*(.*)$/u

// Rows that tell the person something will be added besides the main thing.
const ACCENT_LABELS = new Set(['New retailer', 'New material'])

function isEmpty(value) {
  return value === null || value === undefined || value === ''
}

function num(value, maxFraction) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value.toLocaleString(undefined, { maximumFractionDigits: maxFraction })
  }
  return String(value)
}

function show(value, unit) {
  if (isEmpty(value)) return ''
  if (!unit) return num(value, 4)
  const money = String(unit).match(CURRENCY_UNIT)
  if (money) return `${money[1]}${num(value, 2)}${money[2] ? ` ${money[2]}` : ''}`
  return `${num(value, 4)} ${unit}`
}

// before and after share one unit. A word unit is written once ("12.5 → 22.5
// kg"); a money unit once at the end ("$40 → $44.44 per kg").
function showChange(before, after, unit) {
  const money = unit ? String(unit).match(CURRENCY_UNIT) : null
  if (money) {
    const rest = money[2] ? ` ${money[2]}` : ''
    return `${money[1]}${num(before, 2)} → ${money[1]}${num(after, 2)}${rest}`
  }
  if (unit) return `${num(before, 4)} → ${num(after, 4)} ${unit}`
  return `${show(before, unit)} → ${show(after, unit)}`
}

export function describeLine(line) {
  if (!line || typeof line !== 'object') {
    return { label: '', value: '', note: null, emphasis: false }
  }

  if ('material' in line) {
    return {
      label: String(line.material ?? ''),
      value: `uses ${show(line.amount, line.unit)}`,
      note: isEmpty(line.left_after) ? null : `${show(line.left_after, line.unit)} left after`,
      emphasis: false,
    }
  }

  const label = String(line.label ?? '')
  const emphasis = ACCENT_LABELS.has(label)

  if ('before' in line && 'after' in line) {
    return { label, value: showChange(line.before, line.after, line.unit), note: null, emphasis }
  }
  return { label, value: show(line.value, line.unit), note: null, emphasis }
}

const TITLES = {
  log_batch: 'Log production batch',
  restock: 'Restock material',
  adjust_stock: 'Adjust stock',
  create_material: 'New material',
  create_order: 'New order',
  create_product: 'New product',
}

// Every write proposal carries `tool` except the production batch, which is
// recognised by its material lines (step 4c adds `tool` to it).
export function proposalTool(proposal) {
  if (proposal?.tool) return proposal.tool
  const lines = Array.isArray(proposal?.lines) ? proposal.lines : []
  return lines.some((l) => l && typeof l === 'object' && 'material' in l) ? 'log_batch' : null
}

export function proposalTitle(proposal) {
  return TITLES[proposalTool(proposal)] ?? 'Please confirm'
}