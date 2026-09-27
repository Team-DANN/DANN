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

function headerMatches(header, aliases) {
  const normalized = normalizeHeader(header)
  return aliases.some((alias) => normalizeHeader(alias) === normalized)
}

export function autoMapFields(headers, datasetKey) {
  const config = MIGRATION_DATASETS[datasetKey]
  if (!config) return {}

  const usedHeaders = new Set()
  return config.fields.reduce((mapping, field) => {
    const aliases = [field.key, ...field.aliases]
    const header = headers.find((candidate) => !usedHeaders.has(candidate) && headerMatches(candidate, aliases))
    if (header) {
      usedHeaders.add(header)
      mapping[field.key] = header
    }
    return mapping
  }, {})
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
