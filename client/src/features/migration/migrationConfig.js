export const MIGRATION_DATASETS = {
  products: {
    label: 'Products',
    sheetAliases: ['products', 'product', 'catalog', 'finished goods', 'finished products'],
    fields: [
      { key: 'name', label: 'Product name', required: true, aliases: ['name', 'product', 'product name', 'item', 'item name', 'product description', 'finished product'] },
      { key: 'category', label: 'Category', aliases: ['category', 'product category', 'type'] },
      { key: 'unit', label: 'Unit', aliases: ['unit', 'uom', 'unit of measure', 'measure'] },
      { key: 'selling_price', label: 'Selling price', aliases: ['selling price', 'sale price', 'price', 'unit price', 'retail price', 'rate'] },
      { key: 'current_stock', label: 'Starting quantity', aliases: ['stock', 'current stock', 'opening stock', 'starting stock', 'qty on hand', 'quantity on hand', 'on hand'] },
    ],
  },
  customers: {
    label: 'Customers',
    sheetAliases: ['customers', 'customer', 'clients', 'client', 'retailers', 'retailer'],
    fields: [
      { key: 'name', label: 'Customer name', required: true, aliases: ['name', 'customer', 'customer name', 'cust', 'client', 'client name', 'retailer', 'retailer name'] },
      { key: 'contact_phone', label: 'Phone', aliases: ['phone', 'telephone', 'contact phone', 'mobile', 'contact number'] },
      { key: 'address', label: 'Address', aliases: ['address', 'location', 'delivery address'] },
      { key: 'credit_terms', label: 'Credit terms', aliases: ['credit terms', 'payment terms', 'terms'] },
    ],
  },
  materials: {
    label: 'Materials',
    sheetAliases: ['materials', 'material', 'raw materials', 'raw material', 'ingredients', 'ingredient'],
    fields: [
      { key: 'name', label: 'Material name', required: true, aliases: ['name', 'material', 'material name', 'raw material', 'raw material name', 'ingredient', 'item', 'item name'] },
      { key: 'unit', label: 'Unit', required: true, aliases: ['unit', 'uom', 'unit of measure', 'measure'] },
      { key: 'current_stock', label: 'Starting quantity', aliases: ['stock', 'current stock', 'opening stock', 'starting stock', 'qty on hand', 'quantity on hand', 'on hand'] },
      { key: 'unit_cost', label: 'Unit cost', aliases: ['unit cost', 'cost', 'cost per unit', 'purchase price'] },
      { key: 'reorder_threshold', label: 'Reorder threshold', aliases: ['reorder threshold', 'low stock threshold', 'minimum stock', 'minimum quantity', 'reorder level'] },
      { key: 'supplier_name', label: 'Supplier', aliases: ['supplier', 'supplier name', 'vendor', 'vendor name'] },
    ],
  },
  inventory: {
    label: 'Inventory',
    sheetAliases: ['inventory', 'stock', 'stocktake', 'stock take', 'opening inventory'],
    fields: [
      { key: 'item_name', label: 'Item name', required: true, aliases: ['item', 'item name', 'name', 'product', 'product name', 'material', 'material name', 'sku'] },
      { key: 'quantity', label: 'Quantity', required: true, aliases: ['quantity', 'qty', 'stock', 'current stock', 'on hand', 'qty on hand', 'opening stock'] },
      { key: 'entity_type', label: 'Item type', aliases: ['type', 'item type', 'entity type', 'category'] },
    ],
  },
  production: {
    label: 'Production history',
    sheetAliases: ['production', 'production log', 'batches', 'batch log', 'output', 'production history', 'manufacturing log'],
    fields: [
      { key: 'product_name', label: 'Product', required: true, aliases: ['product', 'product name', 'item', 'item name', 'finished product'] },
      { key: 'quantity_produced', label: 'Quantity produced', required: true, aliases: ['quantity', 'qty', 'quantity produced', 'units produced', 'output', 'produced qty', 'batch size', 'made'] },
      { key: 'produced_at', label: 'Production date', required: true, aliases: ['date', 'production date', 'produced at', 'batch date', 'made on', 'made'] },
      { key: 'material_cost', label: 'Material cost', aliases: ['material cost', 'cost of materials', 'materials cost', 'ingredient cost'] },
      { key: 'labor_cost', label: 'Labor cost', aliases: ['labor cost', 'labour cost', 'labor', 'labour'] },
    ],
  },
  orders: {
    label: 'Orders',
    sheetAliases: ['orders', 'order', 'sales', 'sales ledger', 'dispatches', 'dispatch'],
    fields: [
      { key: 'customer_name', label: 'Customer', required: true, aliases: ['customer', 'customer name', 'cust', 'client', 'client name', 'retailer', 'retailer name'] },
      { key: 'product_name', label: 'Product', required: true, aliases: ['product', 'product name', 'item', 'item name', 'sku'] },
      { key: 'quantity', label: 'Quantity', required: true, aliases: ['quantity', 'qty', 'units', 'order quantity'] },
      { key: 'unit_price', label: 'Unit price', aliases: ['unit price', 'price', 'sale price', 'rate'] },
      { key: 'total_amount', label: 'Order total', aliases: ['total', 'order total', 'total amount', 'amount', 'invoice total'] },
      { key: 'amount_paid', label: 'Amount paid', aliases: ['amount paid', 'paid', 'payment received', 'received'] },
      { key: 'dispatched_at', label: 'Order date', required: true, aliases: ['date', 'order date', 'dispatch date', 'delivery date', 'dispatched at', 'sold at'] },
      { key: 'order_number', label: 'Order number', aliases: ['order number', 'order no', 'order id', 'invoice number', 'invoice no'] },
    ],
  },
  suppliers: {
    label: 'Suppliers',
    sheetAliases: ['suppliers', 'supplier', 'vendors', 'vendor'],
    fields: [
      { key: 'name', label: 'Supplier name', required: true, aliases: ['name', 'supplier', 'supplier name', 'vendor', 'vendor name'] },
      { key: 'contact_phone', label: 'Phone', aliases: ['phone', 'telephone', 'contact phone', 'mobile', 'contact number'] },
      { key: 'email', label: 'Email', aliases: ['email', 'e mail', 'email address'] },
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

function headerMatches(header, aliases) {
  const normalized = normalizeHeader(header)
  return aliases.some((alias) => normalizeHeader(alias) === normalized)
}

// Catches real-world header variants an exact match misses — "Qty Made"
// for an alias of "qty", "Date Made" for an alias of "date" — by
// requiring every WORD of the alias to appear as a whole word somewhere
// in the header, regardless of order or extra words around it. A
// single-word alias under 3 characters is skipped here (not in the exact
// pass) so something like a bare "g" can't match "kg", "mg", "weighing",
// etc. — short aliases still match, just only via the exact pass above.
function headerMatchesLoose(header, aliases) {
  const headerTokens = new Set(tokenize(header))
  return aliases.some((alias) => {
    const aliasTokens = tokenize(alias)
    if (aliasTokens.length === 0) return false
    if (aliasTokens.length === 1 && aliasTokens[0].length < 3) return false
    return aliasTokens.every((token) => headerTokens.has(token))
  })
}

export function autoMapFields(headers, datasetKey) {
  const config = MIGRATION_DATASETS[datasetKey]
  if (!config) return {}

  const usedHeaders = new Set()
  const mapping = {}

  // Pass 1 — exact match, tried first for every field since it's the
  // safest and least likely to produce a wrong guess.
  for (const field of config.fields) {
    const aliases = [field.key, ...field.aliases]
    const header = headers.find((candidate) => !usedHeaders.has(candidate) && headerMatches(candidate, aliases))
    if (header) {
      usedHeaders.add(header)
      mapping[field.key] = header
    }
  }

  // Pass 2 — token-based loose match, only for fields pass 1 missed.
  // This is what makes "accept whatever format the user has" actually
  // true rather than aspirational — a sheet with its own natural column
  // names shouldn't fall back to a manual table just because nobody
  // happened to name a column exactly "qty".
  for (const field of config.fields) {
    if (mapping[field.key]) continue
    const aliases = [field.key, ...field.aliases]
    const header = headers.find((candidate) => !usedHeaders.has(candidate) && headerMatchesLoose(candidate, aliases))
    if (header) {
      usedHeaders.add(header)
      mapping[field.key] = header
    }
  }

  return mapping
}

function sheetNameMatches(sheetName, aliases) {
  const normalizedSheetName = normalizeHeader(sheetName)
  return aliases.some((alias) => {
    const normalizedAlias = normalizeHeader(alias)
    return normalizedSheetName.includes(normalizedAlias) || normalizedAlias.includes(normalizedSheetName)
  })
}

export function detectSheet(sheetName, headers) {
  const candidates = DATASET_KEYS.map((datasetKey) => {
    const config = MIGRATION_DATASETS[datasetKey]
    const mapping = autoMapFields(headers, datasetKey)
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

    return { datasetKey, mapping, score, confidence: Math.min(1, confidence), requiredMatches, nameMatch }
  })

  const best = candidates.sort((left, right) => right.score - left.score || right.confidence - left.confidence)[0]
  if (!best || best.requiredMatches === 0) {
    return { datasetKey: '', mapping: {}, confidence: 0, confirmed: false }
  }

  return {
    datasetKey: best.datasetKey,
    mapping: best.mapping,
    confidence: best.confidence,
    confirmed: best.confidence >= 0.75,
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