# DANN B2B Supply Chain MVP: progress.md

Last updated: 28 Oct 2026 (update 2)
Attach this file at the start of every chat about B2B. Update it at the end of each step.

## 1. Goal

**In one line:** DANN tracks the whole chain from the vendor you buy from to the retailer you sell to, as records and documents, with the money owed in both directions.

The lead's sketch: Vendor and raw material -> Manufacturer -> Finished goods -> Packaging -> Transport / Warehouse / Dealer / Distributor / Retailer.

MVP, organised under the lead's three areas:

- **Material:** vendors, purchase orders (PO), receiving goods (stock goes up), a PO document to send to the vendor.
- **Sales and Distribution:** orders with several products, order status (placed, dispatched, delivered), transport details, a dispatch note to send to the retailer, customer type (retailer, dealer, distributor).
- **Finance:** payables (owed to vendors) next to receivables (owed by retailers), one cash position.

Also: a chain view (vendor -> materials -> products -> retailers, by recipe) and agent tools for the new actions, built last.

## 2. Agreed scope

- Records and documents inside the manufacturer's own account. Vendors and retailers do not log in. Nothing is shared between accounts.
- Documents are made in the browser (print stylesheet or client-side PDF). Sharing = PDF download + pre-filled WhatsApp link. No email sending.
- Scope document: "DANN B2B Supply Chain MVP: Scope for Agreement" (shared 27 Oct 2026).

**Out of scope for v1:** external logins or a connected network, lot-level traceability, multi-warehouse stock, a separate packaging stage, distributor-to-retailer tiers, GST tax invoices (the MVP makes a dispatch note), email sending.

## 3. How we are building it

- **Backend first, tested in the terminal. Client screens come after the backend steps pass.**
- All backend code lives under `backend/src/` (`db/`, `services/`, `models/`, `routes/`, `controllers/`, `middleware/`, `schemas/`, `utils/`). One-off scripts sit in `backend/` and must require `./src/...`.
- Work is on the `backend` branch.
- Every step ends with a terminal check script (`tmp-*.js` in `backend/`, deleted after use), then a commit of only the real files.

## 4. Decisions

Change each box to ticked once confirmed.

- [ ] Stock deduction: per-business setting, default = today's behaviour (deduct at order creation); B2B option deducts at dispatch.
- [ ] Warehouse and a separate packaging stage: left out of v1.
- [ ] Dispatch note, not a GST invoice.
- [x] Backfill: vendor records created from existing `supplier_name` values (applied 28 Oct 2026).
- [ ] Wayne's review of the B2B backend changes. The work is on `backend`, not the separate `backend-b2b` branch described in the scope document. Backend drafted by Jayz. Wayne not yet told: ______
- [ ] The hosted backend is deployed manually; each backend step is deployed before the client relies on it. Is the local `.env` database the same one the hosted app uses? ______

## 5. Schema status

**Built and in the database (Step 1):**
- `vendor`, `purchase_order`, `purchase_order_line`, `payable`, `vendor_payment`
- `material.vendor_id` (nullable)
- `material_restock_log.po_line_id` (nullable)
- `MaterialService.applyRestock(client, ...)`: the restock core, split out so a PO receipt can run inside its own transaction. `recordRestock` now calls it.

**Not built yet:**
- `retailer.customer_type` and `credit_days`
- `order_line`, `order.status`, `dispatch`
- user recorded on orders and payments
- the `payable_due` alert type and its alert setting
- the deduct-at-dispatch business setting

**Facts the schema relies on (confirmed from the live database):** `material_id` is the primary key of `material`; `restock_id` is the primary key of `material_restock_log`; restock log rows cascade-delete with their material; `logged_by` points at `"user"` with no cascade.

## 6. Steps

Status words: **Not started**, **In progress**, **Done**.

### Backend

**Step 0: Prepare (Done).** Files and the constraints query supplied. The columns query was not needed.

**Step 1: Buy-side schema (Done, 28 Oct 2026).**
- New: `src/db/b2bMigrations.js`, `src/db/backfillVendors.js`.
- Changed: `src/db/database.js` (calls `migrateB2B`), `src/services/materialService.js` (`applyRestock`).
- Check: `tmp-b2b-check.js` gave 17 passed, 0 failed.
- Backfill applied: 13 vendors created, 33 materials linked, across 4 businesses.
- **Not covered by the check script:** two restocks of the same material at the same moment (the row lock), and the full `recordRestock` path including alerts. Do one ordinary restock from the app and confirm it behaves as before.
- Cleanup: delete `backend/tmp-b2b-check.js`. Delete `src/db/backfillVendors.js` too if the local `.env` database is the one the hosted app uses; otherwise keep it until it has been run on the hosted database.

**Step 2: Buy-side API (Not started).**
Services, models, routes, controllers and validation for vendors, purchase orders and payables.

Endpoints (proposed):
- `/api/vendors`: list, get, create, update, deactivate (soft delete). Inventory module.
- `/api/purchase-orders`: list (filter by status or vendor), get with lines, create draft with lines, edit while draft, send, receive, cancel. Inventory module.
- `/api/payables`: list open or all (filter by vendor), record a payment on a payable. Finance module.
- Materials accept `vendor_id`; `supplier_name` is kept in step with the vendor name.
- Register the new routers in `src/app.js` (the file that mounts the routes).

Proposed rules (confirm or change before the code is written):
1. A PO can be received from draft or sent; draft to sent is optional.
2. Receiving more than was ordered is allowed.
3. A receive records `quantity x unit_price` as the restock cost, goes through `applyRestock`, updates `quantity_received`, sets the PO status (partially received or received) and creates one payable.
4. Payable due date = receive date + the vendor's `credit_days`.
5. A payment above the outstanding amount on a payable is rejected.
6. Lines whose material was deleted cannot be received.
7. PO numbers count up per business (PO-1, PO-2, ...).
8. Vendors are deactivated, never deleted. Vendor names are unique per business among active vendors.

Files needed:
- `src/middleware/validate.js`
- `src/middleware/authMiddleware.js`
- `src/middleware/errorHandler.js`
- the file `src/app.js` is registered in (confirm the name; the one pasted looks like the app file)

Done when: a terminal check script creates a vendor, creates a PO, sends it, receives part and then the rest, and shows stock up, a payable per receive, the right PO status, a payment, and a rejected overpayment. It runs against a transaction or test business that is cleaned up afterwards.

**Step 3: Sell-side API (Not started).**
`order_line`, order status, `dispatch` record, `customer_type` on retailer, user recorded on orders and payments, optional deduct-at-dispatch setting. The old single-product order request must keep working unchanged.

Files needed:
- order routes, controller, service and model
- `createOrderSchema` and the retailer schemas (already in `validationSchemas.js`)
- retailer model and service
- the receivables report service
- agent-actions `tools/order.py`, if the orders tool exists yet

**Step 4: Finance API (Not started).**
Payables report, one cash position (receivables minus payables), `payable_due` alert (add to `ALERT_TYPE_MODULES` and to `alertSettingsSchema`, which would otherwise strip the new key), vendor payment history.

Files needed: reports service, controller and routes; the alerts service; `alertAccess.js` and `validationSchemas.js` (already seen).

### Client (after the backend steps pass)

**Step 5: Buy-side screens and PO document (Not started).** Vendors and Purchase orders tabs in Inventory, a "create PO" action on low-stock alerts, PO PDF and WhatsApp link.

**Step 6: Sell-side screens and dispatch note (Not started).** Multi-product orders, status, dispatch form, dispatch note PDF and WhatsApp link.

**Step 7: Finance screens (Not started).** Payables beside receivables, record a vendor payment, cash position.

### Last

**Step 8: Chain view, agent tools, import (Not started).** Chain view (read-only, by recipe); agent-actions propose and confirm tools for create PO, receive PO, dispatch and vendor payment; vendor and customer import in the migration feature (its schema already has a `suppliers` dataset, so check how that import writes supplier data against the new vendor table).

**Step 9: End-to-end demo (Not started).**
1. Add a vendor.
2. Create a PO and send it as a PDF.
3. Receive the goods: stock up, amount owed appears.
4. Produce a batch that uses the material.
5. Create a two-product retailer order, dispatch it with transport details, send the dispatch note.
6. Record a payment from the retailer and a payment to the vendor; show one cash position.

## 7. Rules for this work

- Always give full files, not snippets.
- Ask for files rather than guess field names. Verify field names against the real schema (field-name mismatches are a recurring bug).
- Every new query and endpoint scopes by the active business, not a stale `business_id`.
- Foreign keys to `vendor`, `purchase_order` and `payable` leave ON DELETE unspecified on purpose, so the delete-account cascade cannot be blocked.
- Permissions: Inventory module for the buy side, Orders for the sell side, Finance for payables and vendor payments.
- No mock data. Any stub is clearly marked PREVIEW or STUB with an exact TODO.
- Verify destructive shell commands first (`head -1`, `tail -1`, `wc -l`).
- Commit only the real files by name (never `git add .`, because of the `tmp-*` scripts). Deploy the hosted backend manually, and only when the step is tested.

## 8. Open questions

- Does the lead need warehouse or a separate packaging stage in v1?
- Is a dispatch note enough, or does he expect a GST invoice?
- Has Wayne seen the B2B changes now on `backend`?
- Is the local `.env` database the hosted one? (decides whether `backfillVendors.js` can be deleted)
- Some backfilled "vendors" may not be real vendors (for example "Local Market"). They can be deactivated once the vendor screens exist.

## 9. Log

- 27 Oct 2026, update 1: lead asked for B2B; scope chosen (records and documents, no logins); scope document written and agreed; progress.md created. No code written.
- 28 Oct 2026, update 2: Step 1 done. Buy-side schema migrated, restock refactored into `applyRestock`, check script 17 of 17 passed, vendor backfill applied (13 vendors, 33 materials). Plan changed to backend first, client screens after; Steps 2 to 9 renumbered.