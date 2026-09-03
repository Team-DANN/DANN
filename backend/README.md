# Backend — DANN Core Engine & Architecture

Owner: Backend Team / Lead  
Branch: `backend`  
Reference Specifications: 
- Architecture Document: [DANN_Backend_Structure.docx]
- Data Model Specification: [Backend_Data_model.md]

## Instructions to AI Model In This project : 
1. Avoid Emojis and other symbols in the code, documentation, file names, folder names, etc.
2. Always update this readme after every phase completes.
3. If you found a solution or new idea for any other phase, document it in the respective backend file.

## Status & Progress Tracker (To Prevent Merge Conflicts)

> **Current Status**: **Phases 1-4 COMPLETED + Auth & Zod Validation Layer Integrated**  
> **Active Phase**: Ready for Phase 5 (Frontend & AI Agent Integration).

### Phase Execution Checklist

- [x] **Phase 1: Project Setup & Database Layer (REDONE)**
  - [x] Layered Folder Architecture (`config/`, `middleware/`, `models/`, `services/`, `controllers/`, `routes/`, `schemas/`)
  - [x] Full DDL Schema Setup matching `Backend_Data_model.md` & `DANN_Backend_Structure.docx` ([schema.sql])
  - [x] Data Access Object Models (`UserModel`, `MaterialModel`, `ProductModel`, `RecipeModel`, `ProductionModel`, `AlertModel`, `RetailerModel`)
  - [x] Thin Controllers & Service Logic (`AuthService`, `MaterialService`, `ProductService`, `BatchService`, `RetailerService`, `OrderService`, `ReportService`, `AlertService`)
  - [x] All-or-Nothing Atomic Transactions for Batches & Orders
  - [x] Database Seeding aligned with Frontend IDs ([seed.js])
  - [x] Automated Phase 1 Redo Verification Test Suite ([phase1_redo_test.js])
- [x] **Phase 2: Production & Inventory Logic Verification (COMPLETED)**
  - [x] Restock logging (`POST /api/materials/:id/restock`) with purchase cost tracking and stock addition
  - [x] Manual adjustment (`POST /api/materials/:id/adjust`) for inventory physical recount overrides
  - [x] Production batch logging (`POST /api/batches`) with automatic material deduction, usage snapshot logging, and finished stock increment
  - [x] Low-stock alert threshold query (`GET /api/materials/low-stock`) & automated notification sync via AlertService (`/api/alerts`)
  - [x] Automated Phase 2 Verification Test Suite ([phase2_test.js])
- [x] **Phase 3: Retailers, Orders & Sales Logic (COMPLETED)**
  - [x] Retailers CRUD management (`/api/retailers` with `GET`, `POST`, `PATCH`, `DELETE`)
  - [x] Atomic Order delivery (`POST /api/orders`) with automatic finished product stock deduction
  - [x] Insufficient finished stock rollback guard
  - [x] Payment logging (`POST /api/orders/:id/payment`) & status updates (`paid`, `partial`, `owes`) with finance ledger integration
  - [x] Unpaid summary report per retailer (`GET /api/orders/unpaid-summary`)
  - [x] Automated Phase 3 Verification Test Suite ([phase3_test.js])
- [x] **Phase 4: Cost & Profit Engine Reports (COMPLETED)**
  - [x] Overall and date-filtered profit summary report (`GET /api/reports/profit-summary`)
  - [x] Product profitability breakdown sorted descending by margin (`GET /api/reports/profit-by-product`)
  - [x] Weekly margin analytics & trend percentage (`GET /api/reports/weekly-margin`)
  - [x] Outstanding receivables & overdue count summary (`GET /api/reports/receivables`)
  - [x] Material consumption runway estimate (`GET /api/reports/runway`)
  - [x] Automated Phase 4 Verification Test Suite ([phase4_test.js])
- [x] **Authentication & Zod Validation Layer (COMPLETED)**
  - [x] Owner registration with business tenant container (`POST /api/auth/register`)
  - [x] Owner login & JWT token issuance (`POST /api/auth/login`)
  - [x] Authenticated user profile context (`GET /api/auth/me`)
  - [x] Zod schema validation middleware across all input endpoints ([validationSchemas.js])
  - [x] Automated Auth & Validation Test Suite ([auth_and_validation_test.js])
- [x] **Phase 5: Frontend & Agent Integration**
  - [x] Integration with `client/` frontend and `agents/` AI module

---

## Backend Layered Architecture

```text
backend/
├── src/
│   ├── config/              — Environment variables & DB connection (env.js, database.js)
│   ├── middleware/          — JWT Bearer auth check, tenant scoping, Zod validator, error handling (authMiddleware.js, validate.js, errorHandler.js)
│   ├── schemas/             — Zod request validation schemas (validationSchemas.js)
│   ├── routes/              — Maps URLs to controllers (authRoutes, materialRoutes, productRoutes, batchRoutes, retailerRoutes, orderRoutes, reportRoutes, alertRoutes)
│   ├── controllers/         — Request validation & thin handler layer (authController, materialController, productController, retailerController, orderController, reportController, alertController)
│   ├── services/            — Core business logic & atomic transactions (authService, materialService, productService, batchService, retailerService, orderService, reportService, alertService)
│   ├── models/              — Data Access Objects (DAOs: UserModel, MaterialModel, ProductModel, RecipeModel, ProductionModel, RetailerModel, AlertModel)
│   ├── db/                  — DDL schema (schema.sql) & seed script (seed.js)
│   ├── tests/               — Verification test suites (phase1_redo_test.js, phase2_test.js, phase3_test.js, phase4_test.js, auth_and_validation_test.js)
│   └── index.js             — Express application entry point
├── .env.example             — Template for local config
├── package.json             — Dependencies and scripts
└── README.md                — Architecture reference
```

---

## Entity & ID Mapping Reference (Matched to Frontend)

All entity primary key names and multi-tenant foreign keys strictly mirror [Backend_Data_model.md] and align with frontend mock data:

| Entity | PK Column Name | FK Tenant Scope | Frontend Matched IDs |
|---|---|---|---|
| **Business** | `business_id` | N/A (Tenant Root) | `'biz_default'` |
| **User** | `user_id` | `business_id` | `'user_default'` (Leo Noel Zuze) |
| **Raw Material** | `material_id` | `business_id` | `'flour'`, `'sugar'`, `'butter'`, `'eggs'`, `'milk'`, `'yeast'` |
| **Product** | `product_id` | `business_id` | `'bread-loaf'`, `'sponge-cake'`, `'butter-cookies'`, `'milk-bun'`, `'dinner-roll'`, `'rusk'`, `'donut'`, `'muffin'`, `'pretzel'`, `'croissant'` |
| **Recipe** | `recipe_id` | `business_id` | Linked join rows mapping `product_id` ↔ `material_id` with `quantity_per_unit` |
| **Production Batch** | `production_id` | `business_id` | Auto-generated batch run logs |
| **Batch Material Usage**| `usage_id` | N/A | Audit trail snapshot of material cost & usage |
| **Restock Log** | `restock_id` | `business_id` | Auto-generated material restock logs |
| **Retailer** | `retailer_id` | `business_id` | `'ret_sharma'`, `'ret_patel'` |
| **Dispatch Order** | `order_id` | `business_id` | Customer dispatch orders |
| **Finance Ledger** | `transaction_id` | `business_id` | Payment & expense ledger transactions |
| **Alerts** | `alert_id` | `business_id` | `'alt_001'`, `'alt_002'` |

---

## API Routes Summary

- **Auth**: `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- **Materials**: `GET /api/materials`, `GET /api/materials/low-stock`, `POST /api/materials`, `PATCH /api/materials/:id`, `DELETE /api/materials/:id`, `POST /api/materials/:id/restock`, `POST /api/materials/:id/adjust`
- **Products**: `GET /api/products`, `GET /api/products/:id`, `POST /api/products`, `PUT /api/products/:id/recipe`
- **Batches**: `GET /api/batches`, `GET /api/batches/:id`, `POST /api/batches` (Atomic production run)
- **Retailers**: `GET /api/retailers`, `GET /api/retailers/:id`, `POST /api/retailers`, `PATCH /api/retailers/:id`, `DELETE /api/retailers/:id`
- **Orders**: `GET /api/orders`, `GET /api/orders/unpaid-summary`, `POST /api/orders` (Atomic sale delivery), `POST /api/orders/:id/payment`
- **Reports**: `GET /api/reports/profit-summary`, `GET /api/reports/profit-by-product`, `GET /api/reports/weekly-margin`, `GET /api/reports/receivables`, `GET /api/reports/runway`
- **Alerts**: `GET /api/alerts`, `GET /api/alerts/unread-count`, `PATCH /api/alerts/:id/read`
