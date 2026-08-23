-- DANN Backend SQL Schema Definition
-- Source of Truth: docs/architecture/Backend_Data_model.md & DANN_Backend_Structure.docx
-- Multi-Tenant Scope: business_id on all operational tables

-- 1. Business / Tenant Table
CREATE TABLE IF NOT EXISTS business (
    business_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'bakery',
    timezone TEXT DEFAULT 'Asia/Kolkata',
    currency TEXT DEFAULT '₹',
    owner_user_id TEXT,
    plan_tier TEXT DEFAULT 'Free',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. User / Auth Table
CREATE TABLE IF NOT EXISTS user (
    user_id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    phone TEXT,
    role TEXT DEFAULT 'owner',
    password_hash TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (business_id) REFERENCES business (business_id) ON DELETE CASCADE
);

-- 3. Raw Material Table
CREATE TABLE IF NOT EXISTS material (
    material_id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL,
    name TEXT NOT NULL,
    unit TEXT NOT NULL,
    unit_cost REAL DEFAULT 0.0,
    current_stock REAL DEFAULT 0.0,
    reorder_threshold REAL DEFAULT 0.0,
    supplier_name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (business_id) REFERENCES business (business_id) ON DELETE CASCADE
);

-- 4. Product Catalog Table
CREATE TABLE IF NOT EXISTS product (
    product_id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT DEFAULT 'General',
    unit TEXT DEFAULT 'piece',
    selling_price REAL NOT NULL DEFAULT 0.0,
    current_stock REAL NOT NULL DEFAULT 0.0, -- Finished goods stock level
    image_url TEXT,
    active INTEGER DEFAULT 1,
    cost_per_unit REAL DEFAULT 0.0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (business_id) REFERENCES business (business_id) ON DELETE CASCADE
);

-- 5. Recipe (Product <-> Material Join Table)
CREATE TABLE IF NOT EXISTS recipe (
    recipe_id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    material_id TEXT NOT NULL,
    quantity_per_unit REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (business_id) REFERENCES business (business_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES product (product_id) ON DELETE CASCADE,
    FOREIGN KEY (material_id) REFERENCES material (material_id) ON DELETE CASCADE
);

-- 6. Production Batch Log Table
CREATE TABLE IF NOT EXISTS production_log (
    production_id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    quantity_produced REAL NOT NULL,
    labor_cost REAL DEFAULT 0.0,
    total_material_cost REAL DEFAULT 0.0,
    materials_consumed TEXT, -- JSON string snapshot
    produced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    logged_by TEXT,
    FOREIGN KEY (business_id) REFERENCES business (business_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES product (product_id) ON DELETE CASCADE,
    FOREIGN KEY (logged_by) REFERENCES user (user_id)
);

-- 7. Batch Material Usage (Snapshot Audit Trail)
CREATE TABLE IF NOT EXISTS batch_material_usage (
    usage_id TEXT PRIMARY KEY,
    production_id TEXT NOT NULL,
    material_id TEXT NOT NULL,
    quantity_used REAL NOT NULL,
    cost_per_unit_snapshot REAL NOT NULL,
    FOREIGN KEY (production_id) REFERENCES production_log (production_id) ON DELETE CASCADE,
    FOREIGN KEY (material_id) REFERENCES material (material_id) ON DELETE CASCADE
);

-- 8. Material Restock / Transaction Log Table
CREATE TABLE IF NOT EXISTS material_restock_log (
    restock_id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL,
    material_id TEXT NOT NULL,
    type TEXT DEFAULT 'purchase', -- 'purchase' or 'manual_adjustment'
    quantity_added REAL NOT NULL,
    cost REAL NOT NULL DEFAULT 0.0,
    restocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    logged_by TEXT,
    FOREIGN KEY (business_id) REFERENCES business (business_id) ON DELETE CASCADE,
    FOREIGN KEY (material_id) REFERENCES material (material_id) ON DELETE CASCADE,
    FOREIGN KEY (logged_by) REFERENCES user (user_id)
);

-- 9. Retailer Table
CREATE TABLE IF NOT EXISTS retailer (
    retailer_id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL,
    name TEXT NOT NULL,
    contact_phone TEXT,
    address TEXT,
    credit_terms TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (business_id) REFERENCES business (business_id) ON DELETE CASCADE
);

-- 10. Dispatch / Order Table
CREATE TABLE IF NOT EXISTS dispatch_order (
    order_id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL,
    retailer_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    quantity REAL NOT NULL,
    total_amount REAL NOT NULL,
    amount_paid REAL NOT NULL DEFAULT 0.0,
    status TEXT DEFAULT 'owes', -- paid / partial / owes
    dispatched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (business_id) REFERENCES business (business_id) ON DELETE CASCADE,
    FOREIGN KEY (retailer_id) REFERENCES retailer (retailer_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES product (product_id) ON DELETE CASCADE
);

-- 11. Order Item Detail Table
CREATE TABLE IF NOT EXISTS order_item (
    order_item_id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    quantity REAL NOT NULL,
    selling_price_snapshot REAL NOT NULL,
    FOREIGN KEY (order_id) REFERENCES dispatch_order (order_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES product (product_id) ON DELETE CASCADE
);

-- 12. Finance Ledger Table
CREATE TABLE IF NOT EXISTS finance (
    transaction_id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL,
    type TEXT NOT NULL, -- payment_received / expense / adjustment
    related_order_id TEXT,
    amount REAL NOT NULL,
    date DATETIME DEFAULT CURRENT_TIMESTAMP,
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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    read INTEGER DEFAULT 0,
    FOREIGN KEY (business_id) REFERENCES business (business_id) ON DELETE CASCADE
);
