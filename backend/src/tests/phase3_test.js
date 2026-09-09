const assert = require('assert');
const { seedDatabase } = require('../db/seed');
const RetailerService = require('../services/retailerService');
const ProductService = require('../services/productService');
const OrderService = require('../services/orderService');
const { getDb } = require('../db/database');

console.log('[TEST] Starting Phase 3 Retailers, Orders & Sales Logic Verification...');

const businessId = 'biz_default';

// 1. Reset database to clean state
seedDatabase();

// 2. Test Retailer Management
console.log('\n--- 1. Testing Retailer CRUD ---');
const initialRetailers = RetailerService.getAllRetailers(businessId);
assert.ok(initialRetailers.length >= 1, 'Should have at least seeded Sharma Retailers');

const newRetailer = RetailerService.createRetailer({
  retailer_id: 'ret_patel',
  name: 'Patel General Store',
  contact_phone: '+91 9988776655',
  address: 'Shop 12, West Market',
  credit_terms: '30 Days Net',
}, businessId);

assert.strictEqual(newRetailer.retailer_id, 'ret_patel', 'Retailer ID should match');
assert.strictEqual(newRetailer.name, 'Patel General Store', 'Retailer name should match');

// Update retailer
const updatedRetailer = RetailerService.updateRetailer('ret_patel', {
  address: 'Shop 14, West Market Complex',
}, businessId);
assert.strictEqual(updatedRetailer.address, 'Shop 14, West Market Complex', 'Address should be updated');

// 3. Test Atomic Order Sale Execution & Finished Stock Deduction
console.log('\n--- 2. Testing Atomic Order Execution & Finished Stock Deduction ---');
const breadBeforeOrder = ProductService.getProductById('bread-loaf', businessId);
const breadStockBefore = breadBeforeOrder.current_stock;
assert.strictEqual(breadStockBefore, 25.0, 'Initial bread stock should be 25 units');

// Sell 10 loaves of Bread @ 40/loaf = 400 total. Pay 150 (partial payment)
const order1 = OrderService.createOrder({
  retailer_id: 'ret_patel',
  product_id: 'bread-loaf',
  quantity: 10,
  amount_paid: 150.0,
}, businessId);

assert.ok(order1.order_id, 'Order ID should be created');
assert.strictEqual(order1.total_amount, 400.0, 'Total amount should be 400 (10 * 40)');
assert.strictEqual(order1.amount_paid, 150.0, 'Amount paid should be 150');
assert.strictEqual(order1.status, 'partial', 'Status should be partial');

// Verify finished product stock deduction
const breadAfterOrder = ProductService.getProductById('bread-loaf', businessId);
assert.strictEqual(breadAfterOrder.current_stock, 15.0, 'Bread stock should be reduced from 25 to 15 (25 - 10)');

// Verify finance ledger record
const db = getDb();
const ledgerRecord = db.prepare(`SELECT * FROM finance WHERE related_order_id = ?`).get(order1.order_id);
assert.ok(ledgerRecord, 'Finance ledger record should exist for order payment');
assert.strictEqual(ledgerRecord.amount, 150.0, 'Ledger payment amount should be 150');

// 4. Test Insufficient Finished Goods Stock Guard
console.log('\n--- 3. Testing Insufficient Finished Goods Stock Guard ---');
let caughtError = false;
try {
  // Attempt to sell 50 loaves when only 15 exist
  OrderService.createOrder({
    retailer_id: 'ret_patel',
    product_id: 'bread-loaf',
    quantity: 50,
  }, businessId);
} catch (err) {
  caughtError = true;
  console.log(`[TEST EXPECTED ERROR PASS] Caught insufficient finished stock: ${err.message}`);
}
assert.strictEqual(caughtError, true, 'Should throw error when finished stock is insufficient');

// Verify stock remained unchanged
const breadAfterRollback = ProductService.getProductById('bread-loaf', businessId);
assert.strictEqual(breadAfterRollback.current_stock, 15.0, 'Bread stock must remain 15 after failed order');

// 5. Test Payment Recording on Existing Orders
console.log('\n--- 4. Testing Subsequent Payment Recording ---');
// Record 250 payment to complete order1 (150 + 250 = 400 total)
const updatedOrder1 = OrderService.recordPayment(order1.order_id, 250.0, businessId);
assert.strictEqual(updatedOrder1.amount_paid, 400.0, 'Amount paid should now be 400');
assert.strictEqual(updatedOrder1.status, 'paid', 'Status should now be paid');

// Create an unpaid order for Sharma Retailers: 5 sponge cakes @ 250 = 1250 total, 0 paid
const order2 = OrderService.createOrder({
  retailer_id: 'ret_sharma',
  product_id: 'sponge-cake',
  quantity: 5,
  amount_paid: 0.0,
}, businessId);

assert.strictEqual(order2.total_amount, 1250.0, 'Total amount should be 1250');
assert.strictEqual(order2.status, 'owes', 'Status should be owes');

// 6. Test Unpaid Summary per Retailer
console.log('\n--- 5. Testing Unpaid Orders Summary ---');
const unpaidSummary = OrderService.getUnpaidSummary(businessId);
assert.ok(unpaidSummary.length >= 1, 'Should return unpaid summary');

const sharmaSummary = unpaidSummary.find(s => s.retailer_id === 'ret_sharma');
assert.ok(sharmaSummary, 'Sharma Retailers should be in unpaid summary');
assert.strictEqual(sharmaSummary.total_owed, 1250.0, 'Sharma Retailers total owed should be 1250');
assert.strictEqual(sharmaSummary.unpaid_orders_count, 1, 'Sharma Retailers should have 1 unpaid order');

// 7. Test Order Filtering
console.log('\n--- 6. Testing Order Filters ---');
const sharmaOrders = OrderService.getOrders(businessId, { retailer_id: 'ret_sharma' });
assert.ok(sharmaOrders.every(o => o.retailer_id === 'ret_sharma'), 'All filtered orders should belong to Sharma Retailers');

const paidOrders = OrderService.getOrders(businessId, { status: 'paid' });
assert.ok(paidOrders.every(o => o.status === 'paid'), 'All filtered orders should have status paid');

console.log('\nALL PHASE 3 VERIFICATION TESTS PASSED 100% PERFECTLY!');
