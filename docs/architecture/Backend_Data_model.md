# DANN — Backend Data Model

Reference for core backend schema, organized by domain. Assumes multi-tenant scoping (`business_id`) on every table unless noted.

---

## Business / Tenant

| Field | Role |
|---|---|
| `business_id` | Primary tenant identifier — scopes every other table |
| `name` | Business display name |
| `type` | e.g. bakery — used for domain-specific defaults/mock data |
| `timezone` | Drives greeting logic and date formatting on Home |
| `currency` | Currently ₹ / `en-IN`, kept configurable |
| `owner_user_id` | Links to the owning user account |
| `created_at` | Standard audit field |
| `plan_tier` | Free vs paid — gates features post-validation |

---

## User / Auth

| Field | Role |
|---|---|
| `user_id` | Primary key |
| `business_id` | Tenant scope |
| `name` | Display name |
| `phone` / `email` | Login identifier |
| `role` | owner / staff — kept minimal, no granular permissions yet |
| `password_hash` | Auth credential |

---

## Product

| Field | Role |
|---|---|
| `product_id` | Primary key |
| `business_id` | Tenant scope |
| `name` | Product name |
| `category` | Grouping for UI and reporting |
| `unit` | Unit of sale (e.g. piece, kg) |
| `selling_price` | Used in profitability calc |
| `image_url` | Optional visual, used in ProductPicker |
| `active` | Soft delete / archive flag |
| `cost_per_unit` | Cached/derived from Recipe — avoids recomputing on every profitability read |

---

## Material (Raw Material)

| Field | Role |
|---|---|
| `material_id` | Primary key |
| `business_id` | Tenant scope |
| `name` | Material name |
| `unit` | Unit of measure |
| `unit_cost` | Used in material cost and profitability calc |
| `current_stock` | Live stock level, feeds runway estimate |
| `reorder_threshold` | Powers "Needs attention" filter and low-stock warnings |
| `supplier_name` | Optional, for future reorder workflows |

---

## Recipe (Product ↔ Material)

Join table — makes runway estimation and auto-computed material consumption possible.

| Field | Role |
|---|---|
| `recipe_id` | Primary key |
| `product_id` | Links to Product |
| `material_id` | Links to Material |
| `quantity_per_unit` | Material consumed per unit of product produced |

---

## Production Log

Source of truth for runway estimates — replaces the fabricated 7-day mock data once backend is wired.

| Field | Role |
|---|---|
| `production_id` | Primary key |
| `business_id` | Tenant scope |
| `product_id` | What was produced |
| `quantity_produced` | Quantity entered via keypad flow |
| `materials_consumed` | Derived from Recipe × quantity, stored for history/audit |
| `produced_at` | Timestamp — drives 7-day/variance calculations |
| `logged_by` | User who logged the run |

---

## Material Restock Log

Lives under Inventory, not Finance — per consolidation principle.

| Field | Role |
|---|---|
| `restock_id` | Primary key |
| `material_id` | Links to Material |
| `quantity_added` | Restock quantity |
| `cost` | Cost of restock, feeds material cost trends |
| `restocked_at` | Timestamp |
| `logged_by` | User who logged the restock |

---

## Retailer

| Field | Role |
|---|---|
| `retailer_id` | Primary key |
| `business_id` | Tenant scope |
| `name` | Retailer name |
| `contact_phone` | Contact info |
| `address` | Optional |
| `credit_terms` | Optional, for future AR aging logic |

---

## Dispatch / Order

| Field | Role |
|---|---|
| `order_id` | Primary key |
| `retailer_id` | Links to Retailer |
| `product_id` | What was dispatched |
| `quantity` | Quantity dispatched |
| `total_amount` | Full order value |
| `amount_paid` | Hybrid payment model — number, not boolean; defaults to full payment with partial entry revealed on demand |
| `status` | paid / partial / owes — derived from `amount_paid` vs `total_amount`, not stored redundantly |
| `dispatched_at` | Timestamp — drives most-recent-first sort |

---

## Finance (next feature — schema worth locking now)

| Field | Role |
|---|---|
| `transaction_id` | Primary key |
| `business_id` | Tenant scope |
| `type` | payment_received / expense / adjustment |
| `related_order_id` | Nullable — links payments back to Orders without duplicating the ledger |
| `amount` | Transaction amount |
| `date` | Timestamp |
| `note` | Optional free text |

Finance should read from Orders + a separate expenses table rather than maintaining its own parallel payment ledger, to avoid drift with `amount_paid`.

---

## Alerts

Backs `AlertsContext` — bell badge count is simply `WHERE read = false`.

| Field | Role |
|---|---|
| `alert_id` | Primary key |
| `business_id` | Tenant scope |
| `type` | low_stock / payment_overdue / anomaly |
| `severity` | Drives badge/urgency styling |
| `related_entity_id` | Points back to the Material/Order/etc. that triggered it |
| `message` | Display text |
| `created_at` | Timestamp |
| `read` | Boolean — drives bell badge count |

---

## Open Question

All tables above assume `business_id` scoping for multi-tenancy. Worth confirming this matches how the core backend (owned by your teammate) is structured before the agents module is built against it — a mismatch here is expensive to fix later.
