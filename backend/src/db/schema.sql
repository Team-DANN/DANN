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

-- NOTE: a business_members join table briefly lived here to support a
-- "one login, multiple businesses" workspace switcher. That design was
-- replaced with a different model — multiple independent accounts (own
-- email/password each) switched between client-side, no shared login —
-- so business_members was dropped as unused. If you're applying this
-- schema fresh, there's nothing to do; if you already ran the earlier
-- version, run this once against Supabase to clean it up:
--
--   DROP TABLE IF EXISTS business_members CASCADE;

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
--
-- `read` and `resolved` are DELIBERATELY SEPARATE flags:
--
--   read     = has a human seen this alert. Set ONLY by markAsRead /
--              markAllRead (a user action, e.g. opening the Alerts page).
--              Never touched by the sync logic in alertService.js.
--   resolved = is the underlying real-world condition still true. Set
--              ONLY by the sync functions in alertService.js, and only
--              when the actual number changes (stock recovers, burn rate
--              slows, invoice gets paid). Never touched by viewing or
--              reading an alert.
--
-- "Active alerts" — what the Alerts page lists and what Home's "N active"
-- count means — is resolved = false. Whether a row renders bold/unseen is
-- read = false. Conflating these two was the root cause of alerts
-- endlessly duplicating on every page refresh; see database.js for the
-- migration that fixes existing installs, and idx_alert_active_unique
-- there for how it's enforced at the database level.
CREATE TABLE IF NOT EXISTS alert (
    alert_id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL,
    type TEXT NOT NULL, -- low_stock / runway_low / payment_overdue / anomaly
    severity TEXT DEFAULT 'info',
    related_entity_id TEXT,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    read BOOLEAN DEFAULT FALSE,
    resolved BOOLEAN NOT NULL DEFAULT FALSE,
    FOREIGN KEY (business_id) REFERENCES business (business_id) ON DELETE CASCADE
);

-- Deliberately NOT creating idx_alert_active_unique here. On a fresh
-- install this would be safe (table has no rows yet) — but on an
-- EXISTING database, this table already exists WITHOUT a `resolved`
-- column until the ALTER TABLE migration runs, and schema.sql executes
-- BEFORE runMigrations() in initDb(). A CREATE INDEX referencing
-- `resolved` at this point would fail with "column does not exist" and
-- crash server startup before the column-add migration ever gets a
-- chance to run. See database.js -> migrateAlertActiveModel() for where
-- this index is actually created, safely, after the column is confirmed
-- to exist — works identically for fresh and existing installs.

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