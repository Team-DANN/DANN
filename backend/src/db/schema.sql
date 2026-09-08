-- DANN Backend SQL Schema Definition (PostgreSQL / Supabase)
-- Source of Truth: docs/architecture/Backend_Data_model.md & DANN_Backend_Structure.docx
-- Multi-Tenant Scope: business_id on all operational tables
--
-- NOTE: kept IF NOT EXISTS guards (Postgres supports them on CREATE TABLE) so this
-- script stays safely re-runnable — the original plan suggested dropping them since
-- "Supabase runs this once as a migration", but that makes retries/CI re-runs fail hard.

-- 1. Business / Tenant Table
CREATE TABLE IF NOT EXISTS business (
    business_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'bakery',
    timezone TEXT DEFAULT 'Asia/Kolkata',
    currency TEXT DEFAULT '₹',
    owner_user_id TEXT,
    plan_tier TEXT DEFAULT 'Free',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    country TEXT,
    deleted_at TIMESTAMPTZ,
    alert_settings JSONB DEFAULT '{"runway_threshold_days":3,"types":{"low_stock":true,"payment_overdue":true,"anomaly":true}}'
);

-- 2. User / Auth Table
-- "user" is a reserved word in PostgreSQL — must be double-quoted everywhere it's
-- used (table name, and in FOREIGN KEY REFERENCES). Model code must quote it too,
-- e.g. `SELECT * FROM "user" WHERE ...`.
CREATE TABLE IF NOT EXISTS "user" (
    user_id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    phone TEXT,
    role TEXT DEFAULT 'owner',
    password_hash TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (business_id) REFERENCES business (business_id) ON DELETE CASCADE
);

-- 2b. Business Membership Table (workspace switcher)
-- Additive join table — does NOT replace user.business_id, which stays
-- the user's "home" business for login purposes. This table is the
-- source of truth for "which businesses can this login switch into."
-- Same shape will support team invites later (role differentiation),
-- so it's built now rather than as a second table down the line.
CREATE TABLE IF NOT EXISTS business_members (
    membership_id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'owner', -- 'owner' for now; 'member'/'admin' when invites land
    created_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (business_id) REFERENCES business (business_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES "user" (user_id) ON DELETE CASCADE,
    UNIQUE (business_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_business_members_user_id ON business_members (user_id);

-- Backfill: every existing user gets a membership row for their current
-- (only) business. Safe to re-run — ON CONFLICT DO NOTHING.
INSERT INTO business_members (membership_id, business_id, user_id, role)
SELECT 'bm_' || business_id || '_' || user_id, business_id, user_id, role
FROM "user"
ON CONFLICT (business_id, user_id) DO NOTHING;


-- 3. Raw Material Table
CREATE TABLE IF NOT EXISTS material (
    material_id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL,
    name TEXT NOT NULL,
    unit TEXT NOT NULL,
    unit_cost NUMERIC(12,4) DEFAULT 0.0,
    current_stock NUMERIC(12,4) DEFAULT 0.0,
    reorder_threshold NUMERIC(12,4) DEFAULT 0.0,
    supplier_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (business_id) REFERENCES business (business_id) ON DELETE CASCADE
);

-- 4. Product Catalog Table
CREATE TABLE IF NOT EXISTS product (
    product_id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT DEFAULT 'General',
    unit TEXT DEFAULT 'piece',
    selling_price NUMERIC(12,4) NOT NULL DEFAULT 0.0,
    current_stock NUMERIC(12,4) NOT NULL DEFAULT 0.0, -- Finished goods stock level
    image_url TEXT,
    active BOOLEAN DEFAULT TRUE,
    cost_per_unit NUMERIC(12,4) DEFAULT 0.0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (business_id) REFERENCES business (business_id) ON DELETE CASCADE
);

-- 5. Recipe (Product <-> Material Join Table)
CREATE TABLE IF NOT EXISTS recipe (
    recipe_id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    material_id TEXT NOT NULL,
    quantity_per_unit NUMERIC(12,4) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (business_id) REFERENCES business (business_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES product (product_id) ON DELETE CASCADE,
    FOREIGN KEY (material_id) REFERENCES material (material_id) ON DELETE CASCADE
);

-- 6. Production Batch Log Table
CREATE TABLE IF NOT EXISTS production_log (
    production_id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    quantity_produced NUMERIC(12,4) NOT NULL,
    labor_cost NUMERIC(12,4) DEFAULT 0.0,
    total_material_cost NUMERIC(12,4) DEFAULT 0.0,
    materials_consumed TEXT, -- JSON string snapshot
    produced_at TIMESTAMPTZ DEFAULT NOW(),
    logged_by TEXT,
    FOREIGN KEY (business_id) REFERENCES business (business_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES product (product_id) ON DELETE CASCADE,
    FOREIGN KEY (logged_by) REFERENCES "user" (user_id)
);

-- 7. Batch Material Usage (Snapshot Audit Trail)
CREATE TABLE IF NOT EXISTS batch_material_usage (
    usage_id TEXT PRIMARY KEY,
    production_id TEXT NOT NULL,
    material_id TEXT NOT NULL,
    quantity_used NUMERIC(12,4) NOT NULL,
    cost_per_unit_snapshot NUMERIC(12,4) NOT NULL,
    FOREIGN KEY (production_id) REFERENCES production_log (production_id) ON DELETE CASCADE,
    FOREIGN KEY (material_id) REFERENCES material (material_id) ON DELETE CASCADE
);

-- 8. Material Restock / Transaction Log Table
CREATE TABLE IF NOT EXISTS material_restock_log (
    restock_id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL,
    material_id TEXT NOT NULL,
    type TEXT DEFAULT 'purchase', -- 'purchase' or 'manual_adjustment'
    quantity_added NUMERIC(12,4) NOT NULL,
    cost NUMERIC(12,4) NOT NULL DEFAULT 0.0,
    restocked_at TIMESTAMPTZ DEFAULT NOW(),
    logged_by TEXT,
    FOREIGN KEY (business_id) REFERENCES business (business_id) ON DELETE CASCADE,
    FOREIGN KEY (material_id) REFERENCES material (material_id) ON DELETE CASCADE,
    FOREIGN KEY (logged_by) REFERENCES "user" (user_id)
);

-- 9. Retailer Table
CREATE TABLE IF NOT EXISTS retailer (
    retailer_id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL,
    name TEXT NOT NULL,
    contact_phone TEXT,
    address TEXT,
    credit_terms TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (business_id) REFERENCES business (business_id) ON DELETE CASCADE
);

-- 10. Dispatch / Order Table
CREATE TABLE IF NOT EXISTS dispatch_order (
    order_id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL,
    retailer_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    quantity NUMERIC(12,4) NOT NULL,
    total_amount NUMERIC(12,4) NOT NULL,
    amount_paid NUMERIC(12,4) NOT NULL DEFAULT 0.0,
    status TEXT DEFAULT 'owes', -- paid / partial / owes
    dispatched_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (business_id) REFERENCES business (business_id) ON DELETE CASCADE,
    FOREIGN KEY (retailer_id) REFERENCES retailer (retailer_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES product (product_id) ON DELETE CASCADE
);

-- 11. Order Item Detail Table
CREATE TABLE IF NOT EXISTS order_item (
    order_item_id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    quantity NUMERIC(12,4) NOT NULL,
    selling_price_snapshot NUMERIC(12,4) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES dispatch_order (order_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES product (product_id) ON DELETE CASCADE
);

-- 12. Finance Ledger Table
CREATE TABLE IF NOT EXISTS finance (
    transaction_id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL,
    type TEXT NOT NULL, -- payment_received / expense / adjustment
    related_order_id TEXT,
    amount NUMERIC(12,4) NOT NULL,
    date TIMESTAMPTZ DEFAULT NOW(),
    note TEXT,
    FOREIGN KEY (business_id) REFERENCES business (business_id) ON DELETE CASCADE,
    FOREIGN KEY (related_order_id) REFERENCES dispatch_order (order_id) ON DELETE SET NULL
);

-- 13. Alerts Table
CREATE TABLE IF NOT EXISTS alert (
    alert_id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL,
    type TEXT NOT NULL, -- low_stock / payment_overdue / anomaly
    severity TEXT DEFAULT 'info',
    related_entity_id TEXT,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    read BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (business_id) REFERENCES business (business_id) ON DELETE CASCADE
);

-- Indexes on business_id: SQLite didn't need these for a single-tenant local file,
-- but every operational table here is filtered by business_id on nearly every query
-- once you're on a shared Postgres instance. Added to avoid full table scans per tenant.
CREATE INDEX IF NOT EXISTS idx_user_business_id ON "user" (business_id);
CREATE INDEX IF NOT EXISTS idx_material_business_id ON material (business_id);
CREATE INDEX IF NOT EXISTS idx_product_business_id ON product (business_id);
CREATE INDEX IF NOT EXISTS idx_recipe_business_id ON recipe (business_id);
CREATE INDEX IF NOT EXISTS idx_production_log_business_id ON production_log (business_id);
CREATE INDEX IF NOT EXISTS idx_material_restock_log_business_id ON material_restock_log (business_id);
CREATE INDEX IF NOT EXISTS idx_retailer_business_id ON retailer (business_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_order_business_id ON dispatch_order (business_id);
CREATE INDEX IF NOT EXISTS idx_finance_business_id ON finance (business_id);
CREATE INDEX IF NOT EXISTS idx_alert_business_id ON alert (business_id);