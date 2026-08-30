const assert = require('assert');
const { seedDatabase } = require('../db/seed');
const BatchService = require('../services/batchService');
const OrderService = require('../services/orderService');
const ReportService = require('../services/reportService');

console.log('[TEST] Starting Phase 4 Cost & Profit Engine Reports Verification...');

const businessId = 'biz_default';

// 1. Reset database to clean state
seedDatabase();

// 2. Setup Production & Sales Activity for Reporting
console.log('\n--- 1. Setting up Batch Production & Sales Activity ---');
// Produce 20 loaves of Bread @ derived cost 28/loaf = 560 material cost + 40 labor = 600 total cost
const batch1 = BatchService.recordProduction({
  product_id: 'bread-loaf',
  quantity_produced: 20,
  labor_cost: 40.0,
}, businessId, 'user_default');

// Sell 15 loaves of Bread @ 40/loaf = 600 revenue. 400 paid, 200 owed
const order1 = OrderService.createOrder({
  retailer_id: 'ret_sharma',
  product_id: 'bread-loaf',
  quantity: 15,
  amount_paid: 400.0,
}, businessId);

// Sell 2 Sponge Cakes @ 250/cake = 500 revenue. 0 paid, 500 owed
const order2 = OrderService.createOrder({
  retailer_id: 'ret_sharma',
  product_id: 'sponge-cake',
  quantity: 2,
  amount_paid: 0.0,
}, businessId);

// 3. Test Profit Summary Report
console.log('\n--- 2. Testing Profit Summary Report ---');
const summary = ReportService.getProfitSummary(businessId);
console.log('[TEST] Generated Profit Summary:', summary);

// Revenue = 600 (order1) + 500 (order2) = 1100
assert.strictEqual(summary.total_revenue, 1100.0, 'Total revenue should be 1100');
// Material Cost = 560 (batch1)
assert.strictEqual(summary.total_material_cost, 560.0, 'Total material cost should be 560');
// Labor Cost = 40 (batch1)
assert.strictEqual(summary.total_labor_cost, 40.0, 'Total labor cost should be 40');
// Total Cost = 560 + 40 = 600
assert.strictEqual(summary.total_cost, 600.0, 'Total cost should be 600');
// Net Profit = 1100 - 600 = 500
assert.strictEqual(summary.net_profit, 500.0, 'Net profit should be 500');
// Profit Margin % = (500 / 1100) * 100 = 45.45%
assert.strictEqual(summary.profit_margin_percent, 45.45, 'Profit margin should be 45.45%');
assert.strictEqual(summary.total_orders, 2, 'Total orders should be 2');
assert.strictEqual(summary.total_batches, 1, 'Total batches should be 1');

// 4. Test Profit by Product Breakdown
console.log('\n--- 3. Testing Profit by Product Breakdown ---');
const productsProfit = ReportService.getProfitByProduct(businessId);
assert.ok(productsProfit.length > 0, 'Should return product catalog');

// Verify products sorted by margin_percent descending
for (let i = 0; i < productsProfit.length - 1; i++) {
  assert.ok(
    productsProfit[i].margin_percent >= productsProfit[i + 1].margin_percent,
    'Products must be sorted by margin percent descending'
  );
}

const breadProfit = productsProfit.find(p => p.product_id === 'bread-loaf');
assert.ok(breadProfit, 'Bread Loaf must exist in breakdown');
assert.strictEqual(breadProfit.selling_price, 40.0, 'Bread selling price should be 40');
assert.strictEqual(breadProfit.cost_per_unit, 28.0, 'Bread cost per unit should be 28');
assert.strictEqual(breadProfit.unit_profit, 12.0, 'Bread unit profit should be 12');
assert.strictEqual(breadProfit.margin_percent, 30.0, 'Bread profit margin should be 30%');

// 5. Test Weekly Margin Trend
console.log('\n--- 4. Testing Weekly Margin Trend Analytics ---');
const weeklyMargin = ReportService.getWeeklyMargin(businessId);
console.log('[TEST] Generated Weekly Margin:', weeklyMargin);
assert.strictEqual(weeklyMargin.amount, 500.0, 'Weekly net profit amount should be 500');
assert.ok(weeklyMargin.trend !== undefined, 'Trend percentage should be calculated');

// 6. Test Receivables & Overdue Summary
console.log('\n--- 5. Testing Receivables Summary ---');
const receivables = ReportService.getReceivablesSummary(businessId);
console.log('[TEST] Generated Receivables Summary:', receivables);
// order1 owes 200, order2 owes 500 -> total 700
assert.strictEqual(receivables.amount, 700.0, 'Total receivables should be 700');
assert.strictEqual(receivables.overdueCount, 2, 'Unpaid orders count should be 2');

// 7. Test Material Stock Runway Estimation
console.log('\n--- 6. Testing Material Runway Estimation ---');
const runway = ReportService.getRunwayEstimate(businessId);
console.log('[TEST] Generated Runway Estimate:', runway);
assert.ok(runway.material, 'Runway report must identify a material');
assert.ok(typeof runway.daysLeft === 'number', 'Days left should be a numeric estimate');
assert.ok(Array.isArray(runway.details), 'Detailed runways should be an array');

console.log('\nALL PHASE 4 VERIFICATION TESTS PASSED 100% PERFECTLY!');
