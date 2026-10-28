/**
 * B2B BUY SIDE — vendors, purchase orders, payables.
 *
 * Takes `query` as a parameter so this file never has to require
 * db/database.js (which would be circular), same as agentMigrations.js.
 * Called from runMigrations() AFTER the plain column migrations, because
 * the two new columns on existing tables reference tables created here.
 *
 * Design notes:
 *  - Every table carries business_id and cascades from business, so
 *    deleting an account removes its B2B rows too.
 *  - Foreign keys to vendor / purchase_order / payable deliberately leave
 *    ON DELETE unspecified (NO ACTION, checked at the end of the statement).
 *    RESTRICT is checked immediately, and would make the delete-account
 *    cascade fail whenever the vendor is removed before its purchase orders.
 *  - Vendors are soft-deleted (active = FALSE) because purchase orders and
 *    payables point at them. Names are unique per business, case-
 *    insensitively, among ACTIVE vendors only.
 *  - purchase_order_line keeps a snapshot of the material name and unit so a
 *    purchase order still prints after its material is deleted. material_id
 *    becomes NULL in that case; the receive step must refuse such lines.
 *  - created_by is plain TEXT with no foreign key: the audit must outlive
 *    any account (same reasoning as production_log_undo).
 *  - One payable per receive action, not per purchase order, so a partial
 *    delivery creates a bill for exactly what arrived.
 *
 * Safe to run on every boot: everything is IF NOT EXISTS, and the ALTERs
 * only run when the column is missing (so a normal boot takes no table lock).
 */

async function columnExists(query, table, col) {
  const { rows } = await query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = current_schema() AND table_name = $1 AND column_name = $2`,
    [table, col]
  );
  return rows.length > 0;
}

async function migrateB2B(query) {
  await query(`
    CREATE TABLE IF NOT EXISTS vendor (
      vendor_id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      name TEXT NOT NULL,
      contact_phone TEXT,
      address TEXT,
      credit_days INTEGER NOT NULL DEFAULT 0 CHECK (credit_days >= 0 AND credit_days <= 365),
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_by TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      FOREIGN KEY (business_id) REFERENCES business (business_id) ON DELETE CASCADE
    );
  `);

  await query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_vendor_business_name_active
    ON vendor (business_id, LOWER(name))
    WHERE active = TRUE;
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS purchase_order (
      po_id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      po_number INTEGER NOT NULL,
      vendor_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'sent', 'partially_received', 'received', 'cancelled')),
      order_date DATE NOT NULL DEFAULT CURRENT_DATE,
      expected_date DATE,
      notes TEXT,
      sent_at TIMESTAMPTZ,
      created_by TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      FOREIGN KEY (business_id) REFERENCES business (business_id) ON DELETE CASCADE,
      FOREIGN KEY (vendor_id) REFERENCES vendor (vendor_id)
    );
  `);

  await query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_po_business_number
    ON purchase_order (business_id, po_number);
  `);
  await query(`
    CREATE INDEX IF NOT EXISTS idx_po_business_status
    ON purchase_order (business_id, status, created_at DESC);
  `);
  await query(`
    CREATE INDEX IF NOT EXISTS idx_po_vendor
    ON purchase_order (business_id, vendor_id);
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS purchase_order_line (
      po_line_id TEXT PRIMARY KEY,
      po_id TEXT NOT NULL,
      business_id TEXT NOT NULL,
      material_id TEXT,
      material_name TEXT NOT NULL,
      unit TEXT NOT NULL,
      quantity_ordered NUMERIC(12,4) NOT NULL CHECK (quantity_ordered > 0),
      unit_price NUMERIC(12,4) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
      quantity_received NUMERIC(12,4) NOT NULL DEFAULT 0 CHECK (quantity_received >= 0),
      FOREIGN KEY (po_id) REFERENCES purchase_order (po_id) ON DELETE CASCADE,
      FOREIGN KEY (business_id) REFERENCES business (business_id) ON DELETE CASCADE,
      FOREIGN KEY (material_id) REFERENCES material (material_id) ON DELETE SET NULL
    );
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_po_line_po
    ON purchase_order_line (po_id);
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS payable (
      payable_id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      vendor_id TEXT NOT NULL,
      po_id TEXT,
      amount NUMERIC(14,4) NOT NULL CHECK (amount >= 0),
      amount_paid NUMERIC(14,4) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
      due_date DATE,
      note TEXT,
      created_by TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      FOREIGN KEY (business_id) REFERENCES business (business_id) ON DELETE CASCADE,
      FOREIGN KEY (vendor_id) REFERENCES vendor (vendor_id),
      FOREIGN KEY (po_id) REFERENCES purchase_order (po_id) ON DELETE SET NULL
    );
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_payable_vendor
    ON payable (business_id, vendor_id);
  `);
  await query(`
    CREATE INDEX IF NOT EXISTS idx_payable_open
    ON payable (business_id, due_date)
    WHERE amount_paid < amount;
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS vendor_payment (
      vendor_payment_id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      payable_id TEXT NOT NULL,
      amount NUMERIC(14,4) NOT NULL CHECK (amount > 0),
      paid_at TIMESTAMPTZ DEFAULT NOW(),
      method TEXT,
      note TEXT,
      created_by TEXT,
      FOREIGN KEY (business_id) REFERENCES business (business_id) ON DELETE CASCADE,
      FOREIGN KEY (payable_id) REFERENCES payable (payable_id) ON DELETE CASCADE
    );
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_vendor_payment_payable
    ON vendor_payment (payable_id);
  `);

  // --- Links from the existing tables --------------------------------------
  // material.vendor_id: which vendor normally supplies this material.
  // supplier_name stays; the client and the assistant still read it.
  if (!(await columnExists(query, 'material', 'vendor_id'))) {
    await query(`
      ALTER TABLE material
      ADD COLUMN vendor_id TEXT REFERENCES vendor (vendor_id) ON DELETE SET NULL;
    `);
  }
  await query(`
    CREATE INDEX IF NOT EXISTS idx_material_vendor
    ON material (business_id, vendor_id)
    WHERE vendor_id IS NOT NULL;
  `);

  // material_restock_log.po_line_id: ties a receipt back to the PO line that
  // caused it. NULL for ordinary restocks and manual adjustments.
  if (!(await columnExists(query, 'material_restock_log', 'po_line_id'))) {
    await query(`
      ALTER TABLE material_restock_log
      ADD COLUMN po_line_id TEXT REFERENCES purchase_order_line (po_line_id) ON DELETE SET NULL;
    `);
  }
  await query(`
    CREATE INDEX IF NOT EXISTS idx_restock_po_line
    ON material_restock_log (po_line_id)
    WHERE po_line_id IS NOT NULL;
  `);
}

module.exports = { migrateB2B };