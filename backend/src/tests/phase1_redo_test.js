const assert = require('assert');
const { seedDatabase } = require('../db/seed');
const MaterialService = require('../services/materialService');
const ProductService = require('../services/productService');
const BatchService = require('../services/batchService');
const OrderService = require('../services/orderService');
const ReportService = require('../services/reportService');

console.log('[TEST] Starting Redone Phase 1 Architecture & Flow Verification...');

const businessId = 'biz_default';

// 1. Reset database with seed data
seedDatabase();

// 2. Test Material Service & Restock
console.log('\n--- 1. Testing Material & Stock Management ---');
const initialFlour = MaterialService.getMaterialById('flour', businessId);
assert.strictEqual(initialFlour.current_stock, 18.0, 'Initial flour stock should be 18.0kg');

MaterialService.recordRestock('flour', { quantity_added: 10.0, cost: 400.0 }, businessId, 'user_default');
const restockedFlour = MaterialService.getMaterialById('flour', businessId);
assert.strictEqual(restockedFlour.current_stock, 28.0, 'Restocked flour stock should be 28.0kg');

// 3. Test Product & Recipe Service
console.log('\n--- 2. Testing Products & Derived Costs ---');
const bread = ProductService.getProductById('bread-loaf', businessId);
assert.ok(bread, 'Bread loaf product must exist');
assert.strictEqual(bread.cost_per_unit, 28.0, 'Bread loaf derived cost should be ₹28.0');
assert.strictEqual(bread.current_stock, 25.0, 'Initial bread loaf finished stock should be 25');

// 4. Test Atomic Production Batch Execution (All-or-Nothing)
console.log('\n--- 3. Testing Atomic Production Batch Execution ---');
// Record production of 10 Bread Loaves
// Bread Loaf recipe per unit: flour 0.5kg, yeast 5g, milk 0.1l
// For 10 units: flour required = 5kg, yeast required = 50g, milk required = 1.0l
const batch = BatchService.recordProduction({
  product_id: 'bread-loaf',
  quantity_produced: 10,
  labor_cost: 50.0,
}, businessId, 'user_default');

assert.ok(batch.production_id, 'Batch ID should be generated');
assert.strictEqual(batch.total_material_cost, 280.0, 'Total material cost for 10 loaves should be ₹280.0');

// Verify Raw Materials Stock Deduction
const postBatchFlour = MaterialService.getMaterialById('flour', businessId);
assert.strictEqual(postBatchFlour.current_stock, 23.0, 'Flour stock should be reduced from 28.0 to 23.0kg (28 - 5)');

// Verify Finished Product Stock Increment
const postBatchBread = ProductService.getProductById('bread-loaf', businessId);
assert.strictEqual(postBatchBread.current_stock, 35.0, 'Finished bread stock should increase from 25 to 35 (25 + 10)');

// Test Insufficient Stock Rollback
console.log('\n--- 4. Testing Insufficient Stock Rollback Guard ---');
let caughtError = false;
try {
  // Attempting to produce 1000 loaves requiring 500kg flour (only 23kg available)
  BatchService.recordProduction({
    product_id: 'bread-loaf',
    quantity_produced: 1000,
  }, businessId);
} catch (err) {
  caughtError = true;
  console.log(`[TEST EXPECTED ERROR PASS] Caught insufficient stock exception: ${err.message}`);
}
assert.strictEqual(caughtError, true, 'System must roll back and throw an exception on insufficient stock');

// Verify stock remained unchanged after rollback
const postRollbackFlour = MaterialService.getMaterialById('flour', businessId);
assert.strictEqual(postRollbackFlour.current_stock, 23.0, 'Flour stock must remain 23.0 after rolled-back batch attempt');

// 5. Test Atomic Order Sale Execution
console.log('\n--- 5. Testing Atomic Retailer Order Execution ---');
// Create sale of 15 Bread Loaves @ ₹40/loaf = ₹600 total, amount_paid = ₹600
const order = OrderService.createOrder({
  retailer_id: 'ret_sharma',
  product_id: 'bread-loaf',
  quantity: 15,
  amount_paid: 600.0,
}, businessId);

assert.ok(order.order_id, 'Order ID should be created');
assert.strictEqual(order.total_amount, 600.0, 'Total order amount should be 600');
assert.strictEqual(order.status, 'paid', 'Status should be paid');

// Verify Finished Product Stock Deduction
const postOrderBread = ProductService.getProductById('bread-loaf', businessId);
assert.strictEqual(postOrderBread.current_stock, 20.0, 'Finished bread stock should be reduced from 35 to 20 (35 - 15)');

// 6. Test Profit Summary Report
console.log('\n--- 6. Testing Profit & Margin Analytics Engine ---');
const profitSummary = ReportService.getProfitSummary(businessId);
console.log('[TEST] Profit Summary:', profitSummary);
assert.strictEqual(profitSummary.total_revenue, 600.0, 'Total revenue should be 600.0');
assert.strictEqual(profitSummary.total_material_cost, 280.0, 'Total material cost should be 280.0');
assert.strictEqual(profitSummary.net_profit, 270.0, 'Net profit should be 600 - (280 + 50 labor) = 270.0');

const profitByProduct = ReportService.getProfitByProduct(businessId);
assert.ok(profitByProduct.length > 0, 'Profit by product breakdown must return catalog');

console.log('\nALL REDONE PHASE 1 VERIFICATION TESTS PASSED 100% PERFECTLY!');
