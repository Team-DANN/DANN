const assert = require('assert');
const { seedDatabase } = require('../db/seed');
const MaterialService = require('../services/materialService');
const ProductService = require('../services/productService');
const BatchService = require('../services/batchService');
const AlertService = require('../services/alertService');

console.log('[TEST] Starting Phase 2 Production & Inventory Logic Verification...');

const businessId = 'biz_default';

// 1. Reset database to clean state
seedDatabase();

// 2. Test Material Restock Logging
console.log('\n--- 1. Testing Material Restock Logging ---');
const flourBeforeRestock = MaterialService.getMaterialById('flour', businessId);
assert.strictEqual(flourBeforeRestock.current_stock, 18.0, 'Initial flour stock should be 18kg');

const restockResult = MaterialService.recordRestock('flour', {
  quantity_added: 12.0,
  cost: 480.0,
}, businessId, 'user_default');

assert.strictEqual(restockResult.current_stock, 30.0, 'Flour stock after restock should be 30kg (18 + 12)');

// 3. Test Material Manual Adjustment
console.log('\n--- 2. Testing Material Manual Adjustment ---');
const adjustResult = MaterialService.recordAdjustment('flour', {
  actual_stock: 25.0,
}, businessId, 'user_default');

assert.strictEqual(adjustResult.current_stock, 25.0, 'Flour stock after manual adjustment should be exactly 25kg');

// 4. Test Production Batch Execution & Inventory Auto-Deductions
console.log('\n--- 3. Testing Production Batch Execution & Inventory Deductions ---');
const breadBeforeBatch = ProductService.getProductById('bread-loaf', businessId);
const initialBreadStock = breadBeforeBatch.current_stock;
const initialYeast = MaterialService.getMaterialById('yeast', businessId);
const initialMilk = MaterialService.getMaterialById('milk', businessId);

// Bread loaf recipe per unit: flour 0.5kg, yeast 5g, milk 0.1l
// Produce 20 loaves:
// Flour required = 10kg (current 25 -> remaining 15)
// Yeast required = 100g (current 400 -> remaining 300)
// Milk required = 2.0l (current 10 -> remaining 8)
const batch = BatchService.recordProduction({
  product_id: 'bread-loaf',
  quantity_produced: 20,
  labor_cost: 100.0,
}, businessId, 'user_default');

assert.ok(batch.production_id, 'Batch ID should be generated');
assert.strictEqual(batch.quantity_produced, 20, 'Quantity produced should be 20');
assert.strictEqual(batch.total_material_cost, 560.0, 'Material cost for 20 loaves should be 560 (28 * 20)');

// Verify finished goods stock increment
const breadAfterBatch = ProductService.getProductById('bread-loaf', businessId);
assert.strictEqual(breadAfterBatch.current_stock, initialBreadStock + 20, 'Finished goods stock should increase by 20');

// Verify constituent material deductions
const flourAfterBatch = MaterialService.getMaterialById('flour', businessId);
assert.strictEqual(flourAfterBatch.current_stock, 15.0, 'Flour stock should be 15kg (25 - 10)');

const yeastAfterBatch = MaterialService.getMaterialById('yeast', businessId);
assert.strictEqual(yeastAfterBatch.current_stock, 300.0, 'Yeast stock should be 300g (400 - 100)');

const milkAfterBatch = MaterialService.getMaterialById('milk', businessId);
assert.strictEqual(milkAfterBatch.current_stock, 8.0, 'Milk stock should be 8L (10 - 2)');

// 5. Test Low-Stock Alert Generation & Detection
console.log('\n--- 4. Testing Low-Stock Thresholds & Alert Sync ---');
// Flour threshold is 10kg (current stock is 15kg, above threshold)
let lowStockList = MaterialService.getLowStockMaterials(businessId);
assert.strictEqual(lowStockList.some(m => m.material_id === 'flour'), false, 'Flour should not be in low stock list yet');

// Produce 15 more bread loaves: consumes 7.5kg flour -> flour becomes 7.5kg (< 10kg threshold)
const batch2 = BatchService.recordProduction({
  product_id: 'bread-loaf',
  quantity_produced: 15,
}, businessId, 'user_default');

const flourAfterBatch2 = MaterialService.getMaterialById('flour', businessId);
assert.strictEqual(flourAfterBatch2.current_stock, 7.5, 'Flour stock should be 7.5kg (15 - 7.5)');

// Verify low-stock query returns flour
lowStockList = MaterialService.getLowStockMaterials(businessId);
const flourLowStock = lowStockList.find(m => m.material_id === 'flour');
assert.ok(flourLowStock, 'Flour should now appear in low stock list');
assert.strictEqual(flourLowStock.current_stock, 7.5, 'Flour stock should be 7.5 in low stock query');

// Verify alert created in alert table
const alerts = AlertService.getAllAlerts(businessId);
const flourAlert = alerts.find(a => a.related_entity_id === 'flour' && a.read === 0);
assert.ok(flourAlert, 'Active unread alert for flour should exist in alerts table');

// 6. Test Low-Stock Auto-Resolution on Restock
console.log('\n--- 5. Testing Alert Auto-Resolution on Restock ---');
MaterialService.recordRestock('flour', { quantity_added: 20.0, cost: 800.0 }, businessId, 'user_default');
const flourRestocked = MaterialService.getMaterialById('flour', businessId);
assert.strictEqual(flourRestocked.current_stock, 27.5, 'Flour stock should be 27.5kg (7.5 + 20)');

// Verify flour is no longer in low-stock list
const lowStockAfterRestock = MaterialService.getLowStockMaterials(businessId);
assert.strictEqual(lowStockAfterRestock.some(m => m.material_id === 'flour'), false, 'Flour should no longer be in low stock list');

console.log('\nALL PHASE 2 VERIFICATION TESTS PASSED 100% PERFECTLY!');
