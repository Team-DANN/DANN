const { randomUUID } = require('crypto');
const { getClient, query } = require('../db/database');

const DATASETS = ['products', 'customers', 'materials', 'inventory', 'orders', 'suppliers', 'boms'];
const UNIT_ALIASES = new Map([
  ['kilogram', 'kg'], ['kilograms', 'kg'], ['kgs', 'kg'], ['kg', 'kg'],
  ['gram', 'g'], ['grams', 'g'], ['gms', 'g'], ['g', 'g'],
  ['litre', 'l'], ['litres', 'l'], ['liter', 'l'], ['liters', 'l'], ['l', 'l'],
  ['millilitre', 'ml'], ['millilitres', 'ml'], ['milliliter', 'ml'], ['milliliters', 'ml'], ['ml', 'ml'],
  ['piece', 'piece'], ['pieces', 'piece'], ['pc', 'piece'], ['pcs', 'piece'], ['unit', 'piece'], ['units', 'piece'],
  ['box', 'box'], ['boxes', 'box'], ['bag', 'bag'], ['bags', 'bag'], ['pack', 'pack'], ['packs', 'pack'],
]);

function httpError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function text(value) {
  return value == null ? '' : String(value).trim();
}

function optionalText(value) {
  const result = text(value);
  return result || null;
}

function normalized(value) {
  return text(value)
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function normalizedUnit(value) {
  const unit = normalized(value);
  return UNIT_ALIASES.get(unit) || unit;
}

function number(value) {
  if (value == null || text(value) === '') return null;
  const numeric = typeof value === 'number'
    ? value
    : Number(text(value).replace(/,/g, '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(numeric) ? numeric : NaN;
}

function nonNegative(value, label) {
  const parsed = number(value);
  if (parsed == null) return null;
  if (!Number.isFinite(parsed) || parsed < 0) throw httpError(`${label} must be a non-negative number.`);
  return parsed;
}

function positive(value, label) {
  const parsed = number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) throw httpError(`${label} must be a positive number.`);
  return parsed;
}

function validDate(value) {
  const source = text(value);
  if (!source) return null;
  const date = new Date(source);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function sameNumber(left, right) {
  return Math.abs(Number(left) - Number(right)) < 0.0001;
}

function sourceOf(row) {
  return { source_row: row.source_row, sheet_name: row.sheet_name };
}

function makeRecord(row, state, value = null, reason = null, fingerprint = null) {
  return { ...sourceOf(row), state, value, reason, fingerprint };
}

function emptyCounts() {
  return Object.fromEntries(DATASETS.map((dataset) => [dataset, 0]));
}

function recordId(prefix) {
  return `${prefix}_${randomUUID().replace(/-/g, '')}`;
}

function rowSnapshot(row, keys) {
  return Object.fromEntries(keys.map((key) => [key, row[key] == null ? null : row[key]]));
}

function comparable(value) {
  return value instanceof Date ? value.toISOString() : value;
}

function valuesMatch(current, snapshot) {
  return Object.entries(snapshot).every(([key, expected]) => {
    const actual = comparable(current[key] == null ? null : current[key]);
    const expectedValue = comparable(expected);
    if (typeof expectedValue === 'number') return sameNumber(actual, expectedValue);
    return actual === expectedValue;
  });
}

function indexByNormalizedName(rows, field = 'name') {
  const result = new Map();
  rows.forEach((row) => {
    const key = normalized(row[field]);
    if (!key) return;
    const list = result.get(key) || [];
    list.push(row);
    result.set(key, list);
  });
  return result;
}

function addToIndex(index, key, record) {
  const list = index.get(key) || [];
  list.push(record);
  index.set(key, list);
}

function publicRecord(dataset, record) {
  return {
    dataset,
    sheet_name: record.sheet_name,
    source_row: record.source_row,
    state: record.state,
    reason: record.reason,
    values: record.value,
  };
}

class MigrationService {
  static async getCatalog(businessId, client = null) {
    const runner = client || { query };
    const [materials, products, retailers, suppliers, importedOrders] = await Promise.all([
      runner.query('SELECT material_id, name, unit FROM material WHERE business_id = $1', [businessId]),
      runner.query('SELECT product_id, name FROM product WHERE business_id = $1', [businessId]),
      runner.query('SELECT retailer_id, name FROM retailer WHERE business_id = $1', [businessId]),
      runner.query('SELECT supplier_id, name FROM supplier WHERE business_id = $1', [businessId]),
      runner.query(
        `SELECT source_fingerprint
         FROM migration_entity
         WHERE business_id = $1 AND entity_type = 'order' AND source_fingerprint IS NOT NULL`,
        [businessId]
      ),
    ]);

    return {
      materials: materials.rows,
      products: products.rows,
      retailers: retailers.rows,
      suppliers: suppliers.rows,
      importedOrderFingerprints: new Set(importedOrders.rows.map((row) => row.source_fingerprint)),
    };
  }

  static buildPlan(payload, catalog) {
    const datasets = Object.fromEntries(DATASETS.map((dataset) => [dataset, []]));
    const validByDataset = Object.fromEntries(DATASETS.map((dataset) => [dataset, []]));
    const materialKeys = new Set(catalog.materials.map((row) => `${normalized(row.name)}:${normalizedUnit(row.unit)}`));
    const productKeys = new Set(catalog.products.map((row) => normalized(row.name)));
    const customerKeys = new Set(catalog.retailers.map((row) => normalized(row.name)));
    const supplierKeys = new Set(catalog.suppliers.map((row) => normalized(row.name)));
    const materialNames = indexByNormalizedName(catalog.materials);
    const productNames = indexByNormalizedName(catalog.products);
    const customerNames = indexByNormalizedName(catalog.retailers);
    const incomingMaterialsByName = new Map();
    const incomingProductsByName = new Map();
    const incomingCustomersByName = new Map();
    const seenInventoryTargets = new Set();
    const seenBomKeys = new Set();
    const seenOrderFingerprints = new Set(catalog.importedOrderFingerprints);

    const add = (dataset, record) => {
      datasets[dataset].push(record);
      if (record.state === 'valid') validByDataset[dataset].push(record);
    };

    for (const row of payload.datasets.suppliers || []) {
      const name = text(row.values.name);
      const key = normalized(name);
      if (!name) {
        add('suppliers', makeRecord(row, 'attention', null, 'Supplier name is required.'));
      } else if (supplierKeys.has(key)) {
        add('suppliers', makeRecord(row, 'duplicate', { name }, 'A supplier with this name already exists.'));
      } else {
        supplierKeys.add(key);
        add('suppliers', makeRecord(row, 'valid', {
          name,
          contact_phone: optionalText(row.values.contact_phone),
          email: optionalText(row.values.email),
          address: optionalText(row.values.address),
        }, null, `supplier:${key}`));
      }
    }

    for (const row of payload.datasets.materials || []) {
      const name = text(row.values.name);
      const unit = normalizedUnit(row.values.unit);
      const key = `${normalized(name)}:${unit}`;
      try {
        if (!name || !unit) throw httpError('Material name and unit are required.');
        const value = {
          name,
          unit,
          current_stock: nonNegative(row.values.current_stock, 'Starting quantity'),
          unit_cost: nonNegative(row.values.unit_cost, 'Unit cost'),
          reorder_threshold: nonNegative(row.values.reorder_threshold, 'Reorder threshold'),
          supplier_name: optionalText(row.values.supplier_name),
        };
        if (materialKeys.has(key)) {
          add('materials', makeRecord(row, 'duplicate', { name, unit }, 'A material with this name and unit already exists.'));
          continue;
        }
        materialKeys.add(key);
        const record = makeRecord(row, 'valid', value, null, `material:${key}`);
        add('materials', record);
        addToIndex(incomingMaterialsByName, normalized(name), record);
      } catch (error) {
        add('materials', makeRecord(row, 'attention', null, error.message));
      }
    }

    for (const row of payload.datasets.products || []) {
      const name = text(row.values.name);
      const key = normalized(name);
      try {
        if (!name) throw httpError('Product name is required.');
        const value = {
          name,
          category: optionalText(row.values.category) || 'General',
          unit: normalizedUnit(row.values.unit) || 'piece',
          selling_price: nonNegative(row.values.selling_price, 'Selling price') ?? 0,
          current_stock: nonNegative(row.values.current_stock, 'Starting quantity'),
        };
        if (productKeys.has(key)) {
          add('products', makeRecord(row, 'duplicate', { name }, 'A product with this name already exists.'));
          continue;
        }
        productKeys.add(key);
        const record = makeRecord(row, 'valid', value, null, `product:${key}`);
        add('products', record);
        addToIndex(incomingProductsByName, key, record);
      } catch (error) {
        add('products', makeRecord(row, 'attention', null, error.message));
      }
    }

    for (const row of payload.datasets.customers || []) {
      const name = text(row.values.name);
      const key = normalized(name);
      if (!name) {
        add('customers', makeRecord(row, 'attention', null, 'Customer name is required.'));
      } else if (customerKeys.has(key)) {
        add('customers', makeRecord(row, 'duplicate', { name }, 'A customer with this name already exists.'));
      } else {
        customerKeys.add(key);
        const record = makeRecord(row, 'valid', {
          name,
          contact_phone: optionalText(row.values.contact_phone),
          address: optionalText(row.values.address),
          credit_terms: optionalText(row.values.credit_terms),
        }, null, `customer:${key}`);
        add('customers', record);
        addToIndex(incomingCustomersByName, key, record);
      }
    }

    const resolveMaterial = (name) => {
      const key = normalized(name);
      const incoming = incomingMaterialsByName.get(key) || [];
      const existing = materialNames.get(key) || [];
      const candidates = [...incoming.map((record) => ({ kind: 'incoming', record })), ...existing.map((row) => ({ kind: 'existing', row }))];
      return candidates.length === 1 ? candidates[0] : null;
    };

    const resolveProduct = (name) => {
      const key = normalized(name);
      const incoming = incomingProductsByName.get(key) || [];
      const existing = productNames.get(key) || [];
      const candidates = [...incoming.map((record) => ({ kind: 'incoming', record })), ...existing.map((row) => ({ kind: 'existing', row }))];
      return candidates.length === 1 ? candidates[0] : null;
    };

    const resolveCustomer = (name) => {
      const key = normalized(name);
      const incoming = incomingCustomersByName.get(key) || [];
      const existing = customerNames.get(key) || [];
      const candidates = [...incoming.map((record) => ({ kind: 'incoming', record })), ...existing.map((row) => ({ kind: 'existing', row }))];
      return candidates.length === 1 ? candidates[0] : null;
    };

    for (const row of payload.datasets.inventory || []) {
      const itemName = text(row.values.item_name);
      try {
        const quantity = nonNegative(row.values.quantity, 'Inventory quantity');
        if (!itemName || quantity == null) throw httpError('Inventory item name and quantity are required.');
        const declaredType = normalized(row.values.entity_type);
        const product = declaredType === 'material' ? null : resolveProduct(itemName);
        const material = declaredType === 'product' ? null : resolveMaterial(itemName);
        const candidates = [product, material].filter(Boolean);
        if (candidates.length !== 1) throw httpError('Match this inventory row to one new product or material before importing.');
        const target = candidates[0];
        if (target.kind === 'existing') {
          add('inventory', makeRecord(row, 'duplicate', { item_name: itemName, quantity }, 'Existing stock is never changed by a migration.'));
          continue;
        }
        if (seenInventoryTargets.has(target.record.fingerprint)) {
          add('inventory', makeRecord(row, 'duplicate', { item_name: itemName, quantity }, 'This item appears more than once in the inventory sheet.'));
          continue;
        }
        const currentStock = target.record.value.current_stock;
        if (currentStock != null && !sameNumber(currentStock, quantity)) {
          throw httpError('This item has conflicting quantities in its catalog and inventory sheets.');
        }
        seenInventoryTargets.add(target.record.fingerprint);
        target.record.value.current_stock = quantity;
        add('inventory', makeRecord(row, 'valid', {
          item_name: itemName,
          quantity,
          entity_type: target.record.fingerprint.startsWith('product:') ? 'product' : 'material',
        }));
      } catch (error) {
        add('inventory', makeRecord(row, 'attention', null, error.message));
      }
    }

    for (const row of payload.datasets.boms || []) {
      const productName = text(row.values.product_name);
      const materialName = text(row.values.material_name);
      try {
        const quantityPerUnit = positive(row.values.quantity_per_unit, 'Quantity per unit');
        if (!productName || !materialName) throw httpError('BOM product and material names are required.');
        const product = resolveProduct(productName);
        const material = resolveMaterial(materialName);
        if (!product || !material) throw httpError('Match this BOM row to one product and one material before importing.');
        if (product.kind === 'existing') throw httpError('Existing product recipes are never replaced by a migration.');
        const materialKey = material.kind === 'existing' ? material.row.material_id : material.record.fingerprint;
        const bomKey = `${product.record.fingerprint}:${materialKey}`;
        if (seenBomKeys.has(bomKey)) {
          add('boms', makeRecord(row, 'duplicate', { product_name: productName, material_name: materialName }, 'This material is already listed in this product recipe.'));
          continue;
        }
        seenBomKeys.add(bomKey);
        const value = {
          product_ref: { kind: 'incoming', key: product.record.fingerprint },
          material_ref: material.kind === 'existing'
            ? { kind: 'existing', id: material.row.material_id }
            : { kind: 'incoming', key: material.record.fingerprint },
          product_name: productName,
          material_name: materialName,
          quantity_per_unit: quantityPerUnit,
        };
        add('boms', makeRecord(row, 'valid', value, null, `bom:${product.record.fingerprint}:${material.kind === 'existing' ? material.row.material_id : material.record.fingerprint}`));
      } catch (error) {
        add('boms', makeRecord(row, 'attention', null, error.message));
      }
    }

    for (const row of payload.datasets.orders || []) {
      const customerName = text(row.values.customer_name);
      const productName = text(row.values.product_name);
      try {
        const quantity = positive(row.values.quantity, 'Order quantity');
        const unitPrice = nonNegative(row.values.unit_price, 'Unit price');
        const suppliedTotal = nonNegative(row.values.total_amount, 'Order total');
        const totalAmount = suppliedTotal ?? (unitPrice == null ? null : quantity * unitPrice);
        const amountPaid = nonNegative(row.values.amount_paid, 'Amount paid') ?? 0;
        const dispatchedAt = validDate(row.values.dispatched_at);
        if (!customerName || !productName) throw httpError('Order customer and product are required.');
        if (totalAmount == null) throw httpError('Add an order total or unit price before importing this order.');
        if (!dispatchedAt) throw httpError('Add a valid order date before importing this order.');
        if (amountPaid > totalAmount) throw httpError('Amount paid cannot exceed the order total.');
        const customer = resolveCustomer(customerName);
        const product = resolveProduct(productName);
        if (!customer || !product) throw httpError('Match this order to one customer and one product before importing.');
        const orderNumber = optionalText(row.values.order_number);
        const fingerprint = `order:${normalized(orderNumber || `${customerName}|${productName}|${dispatchedAt}|${quantity}|${totalAmount}`)}`;
        if (seenOrderFingerprints.has(fingerprint)) {
          add('orders', makeRecord(row, 'duplicate', { customer_name: customerName, product_name: productName }, 'This order already appears in a previous or current migration.', fingerprint));
          continue;
        }
        seenOrderFingerprints.add(fingerprint);
        add('orders', makeRecord(row, 'valid', {
          customer_ref: customer.kind === 'existing'
            ? { kind: 'existing', id: customer.row.retailer_id }
            : { kind: 'incoming', key: customer.record.fingerprint },
          product_ref: product.kind === 'existing'
            ? { kind: 'existing', id: product.row.product_id }
            : { kind: 'incoming', key: product.record.fingerprint },
          order_number: orderNumber,
          customer_name: customerName,
          product_name: productName,
          quantity,
          total_amount: totalAmount,
          amount_paid: amountPaid,
          dispatched_at: dispatchedAt,
        }, null, fingerprint));
      } catch (error) {
        add('orders', makeRecord(row, 'attention', null, error.message));
      }
    }

    const counts = {
      detected: emptyCounts(),
      valid: emptyCounts(),
      attention: emptyCounts(),
      duplicates: emptyCounts(),
      skipped: emptyCounts(),
    };
    const issues = [];
    const preview = [];
    DATASETS.forEach((dataset) => {
      const records = datasets[dataset];
      counts.detected[dataset] = records.length;
      records.forEach((record) => {
        if (record.state === 'valid') {
          counts.valid[dataset] += 1;
          if (preview.length < 40) preview.push(publicRecord(dataset, record));
        } else if (record.state === 'duplicate') {
          counts.duplicates[dataset] += 1;
          counts.skipped[dataset] += 1;
          issues.push(publicRecord(dataset, record));
        } else {
          counts.attention[dataset] += 1;
          issues.push(publicRecord(dataset, record));
        }
      });
    });
    counts.skipped.empty_rows = payload.empty_rows || 0;

    const total = (group) => Object.values(counts[group]).reduce((sum, value) => sum + value, 0);
    return {
      datasets,
      summary: {
        detected: total('detected') + (payload.empty_rows || 0),
        valid: total('valid'),
        attention: total('attention'),
        duplicates: total('duplicates'),
        skipped: total('skipped'),
        by_dataset: counts,
      },
      issues,
      preview,
    };
  }

  static async analyze(payload, businessId, userId) {
    const catalog = await this.getCatalog(businessId);
    const plan = this.buildPlan(payload, catalog);
    const importId = recordId('imp');
    await query(
      `INSERT INTO migration_import
        (import_id, business_id, file_name, file_hash, status, detected_counts, skipped_counts, attention_count, errors, plan, created_by)
       VALUES ($1, $2, $3, $4, 'draft', $5, $6, $7, $8, $9, $10)`,
      [
        importId,
        businessId,
        payload.file.name,
        payload.file.hash || null,
        JSON.stringify(plan.summary.by_dataset.detected),
        JSON.stringify({ duplicates: plan.summary.by_dataset.duplicates, skipped: plan.summary.by_dataset.skipped }),
        plan.summary.attention,
        JSON.stringify(plan.issues),
        JSON.stringify({ datasets: plan.datasets, summary: plan.summary }),
        userId,
      ]
    );

    return {
      id: importId,
      file_name: payload.file.name,
      status: 'draft',
      summary: plan.summary,
      issues: plan.issues,
      preview: plan.preview,
    };
  }

  static async assertPlanStillSafe(client, plan, businessId) {
    const catalog = await this.getCatalog(businessId, client);
    const materialKeys = new Set(catalog.materials.map((row) => `${normalized(row.name)}:${normalizedUnit(row.unit)}`));
    const productKeys = new Set(catalog.products.map((row) => normalized(row.name)));
    const customerKeys = new Set(catalog.retailers.map((row) => normalized(row.name)));
    const supplierKeys = new Set(catalog.suppliers.map((row) => normalized(row.name)));

    const collisions = [];
    for (const record of plan.datasets.materials.filter((item) => item.state === 'valid')) {
      if (materialKeys.has(`${normalized(record.value.name)}:${normalizedUnit(record.value.unit)}`)) collisions.push('materials');
    }
    for (const record of plan.datasets.products.filter((item) => item.state === 'valid')) {
      if (productKeys.has(normalized(record.value.name))) collisions.push('products');
    }
    for (const record of plan.datasets.customers.filter((item) => item.state === 'valid')) {
      if (customerKeys.has(normalized(record.value.name))) collisions.push('customers');
    }
    for (const record of plan.datasets.suppliers.filter((item) => item.state === 'valid')) {
      if (supplierKeys.has(normalized(record.value.name))) collisions.push('suppliers');
    }
    if (collisions.length > 0) {
      throw httpError(`Your data changed after review (${[...new Set(collisions)].join(', ')}). Review the file again before importing.`, 409);
    }
  }

  static async audit(client, importId, businessId, entityType, entityId, sourceFingerprint, afterSnapshot) {
    await client.query(
      `INSERT INTO migration_entity
        (migration_entity_id, import_id, business_id, entity_type, entity_id, source_fingerprint, after_snapshot)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [recordId('iment'), importId, businessId, entityType, entityId, sourceFingerprint || null, JSON.stringify(afterSnapshot)]
    );
  }

  static async commit(importId, businessId, confirmAttention) {
    const client = await getClient();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [businessId]);
      await client.query('LOCK TABLE supplier, material, product, retailer IN SHARE ROW EXCLUSIVE MODE');
      const { rows } = await client.query(
        `SELECT * FROM migration_import WHERE import_id = $1 AND business_id = $2 FOR UPDATE`,
        [importId, businessId]
      );
      const migration = rows[0];
      if (!migration) throw httpError('This import review was not found.', 404);
      if (migration.status !== 'draft') throw httpError('This import has already been finalized.', 409);
      if (migration.attention_count > 0 && !confirmAttention) {
        throw httpError('Review the records needing attention before importing the ready records.');
      }
      const plan = migration.plan;
      await this.assertPlanStillSafe(client, plan, businessId);

      const ids = {
        suppliers: new Map(),
        materials: new Map(),
        products: new Map(),
        customers: new Map(),
      };
      const importedCounts = emptyCounts();
      const validRecords = (dataset) => plan.datasets[dataset].filter((record) => record.state === 'valid');

      for (const record of validRecords('suppliers')) {
        const supplierId = recordId('sup');
        const { rows: inserted } = await client.query(
          `INSERT INTO supplier (supplier_id, business_id, name, contact_phone, email, address)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING supplier_id, name, contact_phone, email, address`,
          [supplierId, businessId, record.value.name, record.value.contact_phone, record.value.email, record.value.address]
        );
        ids.suppliers.set(record.fingerprint, supplierId);
        await this.audit(client, importId, businessId, 'supplier', supplierId, record.fingerprint, inserted[0]);
        importedCounts.suppliers += 1;
      }

      for (const record of validRecords('materials')) {
        const materialId = recordId('mat');
        const { rows: inserted } = await client.query(
          `INSERT INTO material (material_id, business_id, name, unit, unit_cost, current_stock, reorder_threshold, supplier_name)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING material_id, name, unit, unit_cost, current_stock, reorder_threshold, supplier_name`,
          [
            materialId,
            businessId,
            record.value.name,
            record.value.unit,
            record.value.unit_cost ?? 0,
            record.value.current_stock ?? 0,
            record.value.reorder_threshold ?? 0,
            record.value.supplier_name,
          ]
        );
        ids.materials.set(record.fingerprint, materialId);
        await this.audit(client, importId, businessId, 'material', materialId, record.fingerprint, inserted[0]);
        importedCounts.materials += 1;
      }

      for (const record of validRecords('products')) {
        const productId = recordId('prod');
        const { rows: inserted } = await client.query(
          `INSERT INTO product (product_id, business_id, name, category, unit, selling_price, current_stock)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING product_id, name, category, unit, selling_price, current_stock, cost_per_unit, active`,
          [
            productId,
            businessId,
            record.value.name,
            record.value.category,
            record.value.unit,
            record.value.selling_price,
            record.value.current_stock ?? 0,
          ]
        );
        ids.products.set(record.fingerprint, productId);
        await this.audit(client, importId, businessId, 'product', productId, record.fingerprint, inserted[0]);
        importedCounts.products += 1;
      }

      for (const record of validRecords('customers')) {
        const retailerId = recordId('ret');
        const { rows: inserted } = await client.query(
          `INSERT INTO retailer (retailer_id, business_id, name, contact_phone, address, credit_terms)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING retailer_id, name, contact_phone, address, credit_terms`,
          [retailerId, businessId, record.value.name, record.value.contact_phone, record.value.address, record.value.credit_terms]
        );
        ids.customers.set(record.fingerprint, retailerId);
        await this.audit(client, importId, businessId, 'retailer', retailerId, record.fingerprint, inserted[0]);
        importedCounts.customers += 1;
      }

      for (const record of validRecords('boms')) {
        const productId = ids.products.get(record.value.product_ref.key);
        const materialId = record.value.material_ref.kind === 'existing'
          ? record.value.material_ref.id
          : ids.materials.get(record.value.material_ref.key);
        if (!productId || !materialId) throw httpError('A BOM reference changed after review.', 409);
        const recipeId = recordId('rec');
        const { rows: inserted } = await client.query(
          `INSERT INTO recipe (recipe_id, business_id, product_id, material_id, quantity_per_unit)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING recipe_id, product_id, material_id, quantity_per_unit`,
          [recipeId, businessId, productId, materialId, record.value.quantity_per_unit]
        );
        await this.audit(client, importId, businessId, 'recipe', recipeId, record.fingerprint, inserted[0]);
        importedCounts.boms += 1;
      }

      const bomProductIds = [...new Set(validRecords('boms').map((record) => ids.products.get(record.value.product_ref.key)).filter(Boolean))];
      for (const productId of bomProductIds) {
        const { rows: updated } = await client.query(
          `UPDATE product
           SET cost_per_unit = (
             SELECT COALESCE(SUM(r.quantity_per_unit * m.unit_cost), 0)
             FROM recipe r
             JOIN material m ON m.material_id = r.material_id
             WHERE r.product_id = product.product_id
           )
           WHERE product_id = $1 AND business_id = $2
           RETURNING product_id, name, category, unit, selling_price, current_stock, cost_per_unit, active`,
          [productId, businessId]
        );
        const auditRow = await client.query(
          `SELECT migration_entity_id, after_snapshot
           FROM migration_entity
           WHERE import_id = $1 AND entity_type = 'product' AND entity_id = $2`,
          [importId, productId]
        );
        if (auditRow.rows[0]) {
          await client.query(
            'UPDATE migration_entity SET after_snapshot = $1 WHERE migration_entity_id = $2',
            [JSON.stringify(updated[0]), auditRow.rows[0].migration_entity_id]
          );
        }
      }

      for (const record of validRecords('orders')) {
        const retailerId = record.value.customer_ref.kind === 'existing'
          ? record.value.customer_ref.id
          : ids.customers.get(record.value.customer_ref.key);
        const productId = record.value.product_ref.kind === 'existing'
          ? record.value.product_ref.id
          : ids.products.get(record.value.product_ref.key);
        if (!retailerId || !productId) throw httpError('An order reference changed after review.', 409);
        const orderId = recordId('ord');
        let status = 'owes';
        if (sameNumber(record.value.amount_paid, record.value.total_amount)) status = 'paid';
        else if (record.value.amount_paid > 0) status = 'partial';
        const { rows: inserted } = await client.query(
          `INSERT INTO dispatch_order
            (order_id, business_id, retailer_id, product_id, quantity, total_amount, amount_paid, status, dispatched_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING order_id, retailer_id, product_id, quantity, total_amount, amount_paid, status, dispatched_at`,
          [
            orderId,
            businessId,
            retailerId,
            productId,
            record.value.quantity,
            record.value.total_amount,
            record.value.amount_paid,
            status,
            record.value.dispatched_at,
          ]
        );
        await this.audit(client, importId, businessId, 'order', orderId, record.fingerprint, inserted[0]);
        if (record.value.amount_paid > 0) {
          const transactionId = recordId('txn');
          const { rows: payment } = await client.query(
            `INSERT INTO finance (transaction_id, business_id, type, related_order_id, amount, date, note)
             VALUES ($1, $2, 'payment_received', $3, $4, $5, $6)
             RETURNING transaction_id, type, related_order_id, amount, date, note`,
            [transactionId, businessId, orderId, record.value.amount_paid, record.value.dispatched_at, `Imported payment for ${orderId}`]
          );
          await this.audit(client, importId, businessId, 'finance', transactionId, null, payment[0]);
        }
        importedCounts.orders += 1;
      }

      importedCounts.inventory = validRecords('inventory').length;
      await client.query(
        `UPDATE migration_import
         SET status = 'completed', imported_counts = $1, completed_at = NOW()
         WHERE import_id = $2`,
        [JSON.stringify(importedCounts), importId]
      );
      await client.query('COMMIT');
      return { id: importId, status: 'completed', imported_counts: importedCounts };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async getHistory(businessId) {
    const { rows } = await query(
      `SELECT import_id AS id, file_name, status, detected_counts, imported_counts, skipped_counts,
              attention_count, errors, created_at, completed_at, rolled_back_at
       FROM migration_import
       WHERE business_id = $1 AND status IN ('completed', 'rolled_back')
       ORDER BY created_at DESC`,
      [businessId]
    );
    return rows.map((row) => ({ ...row, can_rollback: row.status === 'completed' }));
  }

  static async loadEntities(client, importId) {
    const { rows } = await client.query(
      `SELECT entity_type, entity_id, after_snapshot
       FROM migration_entity
       WHERE import_id = $1
       ORDER BY created_at DESC`,
      [importId]
    );
    return rows;
  }

  static async ensureRollbackSafe(client, entities, businessId) {
    const group = (type) => entities.filter((entity) => entity.entity_type === type);
    const ids = (type) => group(type).map((entity) => entity.entity_id);
    const tables = {
      supplier: { table: 'supplier', id: 'supplier_id', fields: ['supplier_id', 'name', 'contact_phone', 'email', 'address'] },
      material: { table: 'material', id: 'material_id', fields: ['material_id', 'name', 'unit', 'unit_cost', 'current_stock', 'reorder_threshold', 'supplier_name'] },
      product: { table: 'product', id: 'product_id', fields: ['product_id', 'name', 'category', 'unit', 'selling_price', 'current_stock', 'cost_per_unit', 'active'] },
      retailer: { table: 'retailer', id: 'retailer_id', fields: ['retailer_id', 'name', 'contact_phone', 'address', 'credit_terms'] },
      recipe: { table: 'recipe', id: 'recipe_id', fields: ['recipe_id', 'product_id', 'material_id', 'quantity_per_unit'] },
      order: { table: 'dispatch_order', id: 'order_id', fields: ['order_id', 'retailer_id', 'product_id', 'quantity', 'total_amount', 'amount_paid', 'status', 'dispatched_at'] },
      finance: { table: 'finance', id: 'transaction_id', fields: ['transaction_id', 'type', 'related_order_id', 'amount', 'date', 'note'] },
    };

    for (const [type, config] of Object.entries(tables)) {
      const typeEntities = group(type);
      if (typeEntities.length === 0) continue;
      const { rows } = await client.query(
        `SELECT ${config.fields.join(', ')} FROM ${config.table}
         WHERE ${config.id} = ANY($1) AND business_id = $2`,
        [ids(type), businessId]
      );
      const current = new Map(rows.map((row) => [row[config.id], row]));
      for (const entity of typeEntities) {
        const found = current.get(entity.entity_id);
        if (!found || !valuesMatch(found, entity.after_snapshot)) {
          throw httpError('Rollback is unavailable because one or more imported records changed after this migration.', 409);
        }
      }
    }

    const orderIds = ids('order');
    const financeIds = ids('finance');
    const productIds = ids('product');
    const materialIds = ids('material');
    const retailerIds = ids('retailer');
    const recipeIds = ids('recipe');
    const assertNoRows = async (sql, params, label) => {
      const { rows } = await client.query(sql, params);
      if (rows.length > 0) throw httpError(`Rollback is unavailable because imported ${label} are now used by later records.`, 409);
    };

    if (orderIds.length > 0) {
      await assertNoRows(
        'SELECT 1 FROM finance WHERE related_order_id = ANY($1) AND NOT (transaction_id = ANY($2)) LIMIT 1',
        [orderIds, financeIds],
        'orders'
      );
      await assertNoRows(
        'SELECT 1 FROM order_item WHERE order_id = ANY($1) LIMIT 1',
        [orderIds],
        'orders'
      );
    }
    if (productIds.length > 0) {
      await assertNoRows(
        'SELECT 1 FROM production_log WHERE product_id = ANY($1) LIMIT 1',
        [productIds],
        'products'
      );
      await assertNoRows(
        'SELECT 1 FROM dispatch_order WHERE product_id = ANY($1) AND NOT (order_id = ANY($2)) LIMIT 1',
        [productIds, orderIds],
        'products'
      );
      await assertNoRows(
        'SELECT 1 FROM recipe WHERE product_id = ANY($1) AND NOT (recipe_id = ANY($2)) LIMIT 1',
        [productIds, recipeIds],
        'product recipes'
      );
    }
    if (materialIds.length > 0) {
      await assertNoRows(
        'SELECT 1 FROM batch_material_usage WHERE material_id = ANY($1) LIMIT 1',
        [materialIds],
        'materials'
      );
      await assertNoRows(
        'SELECT 1 FROM material_restock_log WHERE material_id = ANY($1) LIMIT 1',
        [materialIds],
        'materials'
      );
      await assertNoRows(
        'SELECT 1 FROM recipe WHERE material_id = ANY($1) AND NOT (recipe_id = ANY($2)) LIMIT 1',
        [materialIds, recipeIds],
        'materials'
      );
    }
    if (retailerIds.length > 0) {
      await assertNoRows(
        'SELECT 1 FROM dispatch_order WHERE retailer_id = ANY($1) AND NOT (order_id = ANY($2)) LIMIT 1',
        [retailerIds, orderIds],
        'customers'
      );
    }
  }

  static async rollback(importId, businessId) {
    const client = await getClient();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [businessId]);
      const { rows } = await client.query(
        `SELECT status FROM migration_import WHERE import_id = $1 AND business_id = $2 FOR UPDATE`,
        [importId, businessId]
      );
      if (!rows[0]) throw httpError('This import was not found.', 404);
      if (rows[0].status !== 'completed') throw httpError('Only completed imports can be rolled back.', 409);
      const entities = await this.loadEntities(client, importId);
      await this.ensureRollbackSafe(client, entities, businessId);

      const ids = (type) => entities.filter((entity) => entity.entity_type === type).map((entity) => entity.entity_id);
      const remove = async (table, column, type) => {
        const entityIds = ids(type);
        if (entityIds.length > 0) {
          await client.query(`DELETE FROM ${table} WHERE ${column} = ANY($1) AND business_id = $2`, [entityIds, businessId]);
        }
      };

      await remove('finance', 'transaction_id', 'finance');
      await remove('dispatch_order', 'order_id', 'order');
      await remove('recipe', 'recipe_id', 'recipe');
      await remove('product', 'product_id', 'product');
      await remove('material', 'material_id', 'material');
      await remove('retailer', 'retailer_id', 'retailer');
      await remove('supplier', 'supplier_id', 'supplier');
      await client.query(
        `UPDATE migration_import SET status = 'rolled_back', rolled_back_at = NOW() WHERE import_id = $1`,
        [importId]
      );
      await client.query('COMMIT');
      return { id: importId, status: 'rolled_back' };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = MigrationService;
