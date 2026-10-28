export const MIGRATION_DATASETS = {
  products: {
    label: 'Products',
    sheetAliases: ['products', 'product', 'catalog', 'finished goods', 'finished products'],
    fields: [
      { key: 'name', label: 'Product name', required: true, aliases: ['name', 'product', 'product name', 'item', 'item name', 'item description', 'particulars', 'product description', 'finished product'] },
      { key: 'category', label: 'Category', aliases: ['category', 'product category', 'type'] },
      { key: 'unit', label: 'Unit', aliases: ['unit', 'uom', 'unit of measure', 'measure'] },
      { key: 'selling_price', label: 'Selling price', aliases: ['selling price', 'sale price', 'price', 'unit price', 'retail price', 'mrp', 'selling rate', 'rate'] },
      { key: 'current_stock', label: 'Starting quantity', aliases: ['stock', 'current stock', 'opening stock', 'starting stock', 'qty on hand', 'quantity on hand', 'on hand'] },
    ],
  },
  customers: {
    label: 'Customers',
    sheetAliases: ['customers', 'customer', 'clients', 'client', 'retailers', 'retailer', 'parties', 'party', 'buyers'],
    fields: [
      { key: 'name', label: 'Customer name', required: true, aliases: ['name', 'customer', 'customer name', 'cust', 'client', 'client name', 'retailer', 'retailer name', 'party', 'party name', 'buyer', 'shop', 'shop name'] },
      { key: 'contact_phone', label: 'Phone', aliases: ['phone', 'telephone', 'contact phone', 'mobile', 'mobile no', 'contact number'] },
      { key: 'address', label: 'Address', aliases: ['address', 'location', 'delivery address'] },
      { key: 'credit_terms', label: 'Credit terms', aliases: ['credit terms', 'payment terms', 'terms'] },
    ],
  },
  materials: {
    label: 'Materials',
    sheetAliases: ['materials', 'material', 'raw materials', 'raw material', 'ingredients', 'ingredient'],
    fields: [
      { key: 'name', label: 'Material name', required: true, aliases: ['name', 'material', 'material name', 'raw material', 'raw material name', 'ingredient', 'item', 'item name', 'particulars'] },
      { key: 'unit', label: 'Unit', required: true, aliases: ['unit', 'uom', 'unit of measure', 'measure'] },
      { key: 'current_stock', label: 'Starting quantity', aliases: ['stock', 'current stock', 'opening stock', 'starting stock', 'qty on hand', 'quantity on hand', 'on hand'] },
      { key: 'unit_cost', label: 'Unit cost', aliases: ['unit cost', 'cost', 'cost per unit', 'cost price', 'purchase price', 'purchase rate', 'rate'] },
      { key: 'reorder_threshold', label: 'Reorder threshold', aliases: ['reorder threshold', 'low stock threshold', 'minimum stock', 'minimum quantity', 'reorder level'] },
      { key: 'supplier_name', label: 'Supplier', aliases: ['supplier', 'supplier name', 'vendor', 'vendor name'] },
    ],
  },
  inventory: {
    label: 'Inventory',
    sheetAliases: ['inventory', 'stock', 'stocktake', 'stock take', 'opening inventory'],
    fields: [
      { key: 'item_name', label: 'Item name', required: true, aliases: ['item', 'item name', 'name', 'product', 'product name', 'material', 'material name', 'sku', 'particulars'] },
      { key: 'quantity', label: 'Quantity', required: true, aliases: ['quantity', 'qty', 'stock', 'current stock', 'on hand', 'qty on hand', 'opening stock'] },
      { key: 'entity_type', label: 'Item type', aliases: ['type', 'item type', 'entity type', 'category'] },
    ],
  },
  production: {
    label: 'Production history',
    sheetAliases: ['production', 'production log', 'batches', 'batch log', 'output', 'production history', 'manufacturing log'],
    fields: [
      { key: 'product_name', label: 'Product', required: true, aliases: ['product', 'product name', 'item', 'item name', 'finished product'] },
      { key: 'quantity_produced', label: 'Quantity produced', required: true, aliases: ['quantity', 'qty', 'quantity produced', 'units produced', 'produced', 'output', 'produced qty', 'batch size', 'pcs', 'made'] },
      { key: 'produced_at', label: 'Production date', required: true, type: 'date', aliases: ['date', 'production date', 'produced at', 'batch date', 'made on', 'dated', 'made'] },
      { key: 'material_cost', label: 'Material cost', aliases: ['material cost', 'cost of materials', 'materials cost', 'ingredient cost'] },
      { key: 'labor_cost', label: 'Labor cost', aliases: ['labor cost', 'labour cost', 'labor', 'labour'] },
    ],
  },
  orders: {
    label: 'Orders',
    sheetAliases: ['orders', 'order', 'sales', 'sales ledger', 'dispatches', 'dispatch'],
    fields: [
      { key: 'customer_name', label: 'Customer', required: true, aliases: ['customer', 'customer name', 'cust', 'client', 'client name', 'retailer', 'retailer name', 'party', 'party name', 'buyer'] },
      { key: 'product_name', label: 'Product', required: true, aliases: ['product', 'product name', 'item', 'item name', 'sku', 'particulars'] },
      { key: 'quantity', label: 'Quantity', required: true, aliases: ['quantity', 'qty', 'units', 'order quantity', 'pcs'] },
      { key: 'unit_price', label: 'Unit price', aliases: ['unit price', 'price', 'sale price', 'rate'] },
      { key: 'total_amount', label: 'Order total', aliases: ['total', 'order total', 'total amount', 'amount', 'invoice total', 'bill amount'] },
      { key: 'amount_paid', label: 'Amount paid', aliases: ['amount paid', 'paid', 'payment received', 'received'] },
      { key: 'dispatched_at', label: 'Order date', required: true, type: 'date', aliases: ['date', 'order date', 'dispatch date', 'delivery date', 'dispatched at', 'invoice date', 'bill date', 'sold at'] },
      { key: 'order_number', label: 'Order number', aliases: ['order number', 'order no', 'order id', 'invoice number', 'invoice no', 'bill number', 'bill no'] },
    ],
  },
  suppliers: {
    label: 'Suppliers',
    sheetAliases: ['suppliers', 'supplier', 'vendors', 'vendor'],
    fields: [
      { key: 'name', label: 'Supplier name', required: true, aliases: ['name', 'supplier', 'supplier name', 'vendor', 'vendor name', 'party', 'party name'] },
      { key: 'contact_phone', label: 'Phone', aliases: ['phone', 'telephone', 'contact phone', 'mobile', 'mobile no', 'contact number'] },
      { key: 'email', label: 'Email', type: 'email', aliases: ['email', 'e mail', 'email address'] },
      { key: 'address', label: 'Address', aliases: ['address', 'location'] },
    ],
  },
  boms: {
    label: 'BOMs',
    sheetAliases: ['bom', 'boms', 'bill of materials', 'recipe', 'recipes', 'formulas', 'formula'],
    fields: [
      { key: 'product_name', label: 'Product', required: true, aliases: ['product', 'product name', 'finished product', 'item', 'item name'] },
      { key: 'material_name', label: 'Material', required: true, aliases: ['material', 'material name', 'raw material', 'ingredient', 'component'] },
      { key: 'quantity_per_unit', label: 'Quantity per unit', required: true, aliases: ['quantity per unit', 'qty per unit', 'quantity', 'qty', 'usage quantity', 'component quantity'] },
    ],
  },
}

export const DATASET_KEYS = Object.keys(MIGRATION_DATASETS)

export function normalizeHeader(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function tokenize(value) {
  return normalizeHeader(value).split(' ').filter(Boolean)
}

// Common abbreviations and spelling variants, applied AFTER plural
// stripping, to both headers and aliases so they meet in the middle.
const TOKEN_SYNONYMS = {
  qty: 'quantity',
  qnty: 'quantity',
  cust: 'customer',
  client: 'customer',
  retailer: 'customer',
  vendor: 'supplier',
  uom: 'unit',
  amt: 'amount',
  prod: 'product',
  no: 'number',
  num: 'number',
  ph: 'phone',
  tel: 'telephone',
  mob: 'mobile',
  dt: 'date',
  labour: 'labor',
}

function stemToken(token) {
  if (token.length > 4 && token.endsWith('ies')) return `${token.slice(0, -3)}y`
  if (token.length > 3 && token.endsWith('s') && !token.endsWith('ss')) return token.slice(0, -1)
  return token
}

function canonicalTokens(value) {
  return tokenize(value).map((token) => {
    const stemmed = stemToken(token)
    return TOKEN_SYNONYMS[stemmed] || stemmed
  })
}

function canonicalKey(value) {
  return canonicalTokens(value).sort().join(' ')
}

// True when two strings differ by at most one inserted, deleted or
// changed character.
function isWithinOneEdit(a, b) {
  if (Math.abs(a.length - b.length) > 1) return false
  let i = 0
  let j = 0
  let edits = 0
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i += 1
      j += 1
      continue
    }
    edits += 1
    if (edits > 1) return false
    if (a.length > b.length) i += 1
    else if (b.length > a.length) j += 1
    else {
      i += 1
      j += 1
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1
}

// Typo tolerance only for long words ("quanity" ~ "quantity"). Short
// words must match exactly so "price" is never confused with "prize".
function tokensEqual(a, b) {
  if (a === b) return true
  if (a.length < 6 || b.length < 6) return false
  return isWithinOneEdit(a, b)
}

function headerMatchesExact(header, aliases) {
  const key = canonicalKey(header)
  if (!key) return false
  return aliases.some((alias) => canonicalKey(alias) === key)
}

// Every WORD of the alias must appear in the header, in any order and
// with extra words allowed ("Qty Made" matches alias "qty"). A single
// canonical word under 3 characters is skipped so a bare "g" can't match
// "kg" or "weighing".
function headerMatchesLoose(header, aliases) {
  const headerTokens = canonicalTokens(header)
  if (headerTokens.length === 0) return false
  return aliases.some((alias) => {
    const aliasTokens = canonicalTokens(alias)
    if (aliasTokens.length === 0) return false
    if (aliasTokens.length === 1 && aliasTokens[0].length < 3) return false
    return aliasTokens.every((token) => headerTokens.some((candidate) => tokensEqual(candidate, token)))
  })
}

const MONTHS = 'jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec'
const DATE_PATTERNS = [
  /^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}$/,
  /^\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}$/,
  new RegExp(`^\\d{1,2}[ -](${MONTHS})[a-z]*[ ,-]*\\d{2,4}$`, 'i'),
]

function isDateValue(value) {
  if (value instanceof Date) return true
  const text = String(value).trim()
  return DATE_PATTERNS.some((pattern) => pattern.test(text))
}

function isEmailValue(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim())
}

const VALUE_CHECKS = { date: isDateValue, email: isEmailValue }

// Looks at the real values in a column. Used only for types that are
// unambiguous (dates, emails). Numbers are deliberately excluded:
// quantity, price and total look identical, so guessing would be wrong
// as often as right.
function columnLooksLike(header, rows, type) {
  const check = VALUE_CHECKS[type]
  if (!check) return false
  const samples = rows
    .slice(0, 50)
    .map((row) => row?.values?.[header])
    .filter((value) => !isBlankCell(value))
  if (samples.length === 0) return false
  return samples.filter(check).length / samples.length >= 0.8
}

export function autoMapFields(headers, datasetKey, rows = []) {
  const config = MIGRATION_DATASETS[datasetKey]
  if (!config) return {}

  // Required fields claim columns first so an optional field can't take
  // a column a required field needed.
  const orderedFields = [...config.fields].sort(
    (a, b) => Number(Boolean(b.required)) - Number(Boolean(a.required)),
  )
  const usedHeaders = new Set()
  const mapping = {}

  // Pass 1: same words after normalising abbreviations and plurals.
  for (const field of orderedFields) {
    const aliases = [field.key, ...field.aliases]
    const header = headers.find((candidate) => !usedHeaders.has(candidate) && headerMatchesExact(candidate, aliases))
    if (header) {
      usedHeaders.add(header)
      mapping[field.key] = header
    }
  }

  // Pass 2: all alias words appear in the header, typos tolerated.
  for (const field of orderedFields) {
    if (mapping[field.key]) continue
    const aliases = [field.key, ...field.aliases]
    const header = headers.find((candidate) => !usedHeaders.has(candidate) && headerMatchesLoose(candidate, aliases))
    if (header) {
      usedHeaders.add(header)
      mapping[field.key] = header
    }
  }

  // Pass 3: judge by the data itself, for dates and emails only.
  for (const field of orderedFields) {
    if (mapping[field.key] || !field.type) continue
    const header = headers.find((candidate) => !usedHeaders.has(candidate) && columnLooksLike(candidate, rows, field.type))
    if (header) {
      usedHeaders.add(header)
      mapping[field.key] = header
    }
  }

  return mapping
}

function sheetNameMatches(sheetName, aliases) {
  const normalizedName = normalizeHeader(sheetName)
  if (!normalizedName) return false
  const nameTokens = canonicalTokens(sheetName)

  return aliases.some((alias) => {
    const aliasTokens = canonicalTokens(alias)
    if (aliasTokens.length > 0 && aliasTokens.every((token) => nameTokens.some((name) => tokensEqual(name, token)))) {
      return true
    }
    const normalizedAlias = normalizeHeader(alias)
    return normalizedName.length >= 4
      && normalizedAlias.length >= 4
      && (normalizedName.includes(normalizedAlias) || normalizedAlias.includes(normalizedName))
  })
}

export function detectSheet(sheetName, headers, rows = []) {
  const candidates = DATASET_KEYS.map((datasetKey) => {
    const config = MIGRATION_DATASETS[datasetKey]
    const mapping = autoMapFields(headers, datasetKey, rows)
    const requiredFields = config.fields.filter((field) => field.required)
    const optionalFields = config.fields.filter((field) => !field.required)
    const requiredMatches = requiredFields.filter((field) => mapping[field.key]).length
    const optionalMatches = optionalFields.filter((field) => mapping[field.key]).length
    const nameMatch = sheetNameMatches(sheetName, config.sheetAliases)
    const score = requiredMatches * 4 + optionalMatches + (nameMatch ? 2 : 0)
    const confidence = (
      (requiredFields.length ? requiredMatches / requiredFields.length : 1) * 0.6
      + (optionalFields.length ? optionalMatches / optionalFields.length : 0) * 0.25
      + (nameMatch ? 0.15 : 0)
    )

    return {
      datasetKey,
      mapping,
      score,
      confidence: Math.min(1, confidence),
      requiredMatches,
      requiredTotal: requiredFields.length,
    }
  })

  const ranked = candidates.sort((left, right) => right.score - left.score || right.confidence - left.confidence)
  const best = ranked[0]
  const runnerUp = ranked[1]

  if (!best || best.requiredMatches === 0) {
    return { datasetKey: '', mapping: {}, confidence: 0, confirmed: false }
  }

  // Confirmed only when every required column is mapped AND this type
  // clearly beats the next best guess. Ties (e.g. a sheet with only a
  // "Name" column) stay unconfirmed so the user is asked.
  const allRequiredMapped = best.requiredMatches === best.requiredTotal
  const margin = best.score - (runnerUp ? runnerUp.score : 0)
  const confirmed = allRequiredMapped && (margin >= 2 || best.confidence >= 0.75)

  return {
    datasetKey: best.datasetKey,
    mapping: best.mapping,
    confidence: best.confidence,
    confirmed,
  }
}

export function requiredFieldsMapped(datasetKey, mapping) {
  const config = MIGRATION_DATASETS[datasetKey]
  return Boolean(config) && config.fields
    .filter((field) => field.required)
    .every((field) => Boolean(mapping[field.key]))
}

export function isBlankCell(value) {
  return value == null || (typeof value === 'string' && value.trim() === '')
}

export function formatCellValue(value) {
  if (value instanceof Date) {
    const year = value.getFullYear()
    const month = String(value.getMonth() + 1).padStart(2, '0')
    const day = String(value.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  return typeof value === 'string' ? value.trim() : value
}