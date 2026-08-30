const assert = require('assert');
const { getDb, initDb } = require('../db/database');
const { seedDatabase } = require('../db/seed');
const MaterialModel = require('../models/MaterialModel');
const ProductModel = require('../models/ProductModel');
const RecipeModel = require('../models/RecipeModel');
const AlertModel = require('../models/AlertModel');

console.log('[TEST] Starting Phase 1 Model & Entity Verification...');

// 1. Seed DB
seedDatabase();

// 2. Test Materials
const materials = MaterialModel.getAll('biz_default');
console.log(`[TEST] Found ${materials.length} raw materials seeded.`);
assert.strictEqual(materials.length, 6, 'Should have 6 materials seeded');

const flour = MaterialModel.getById('flour', 'biz_default');
assert.ok(flour, 'Flour material should exist with ID "flour"');
assert.strictEqual(flour.unit, 'kg', 'Flour unit should be "kg"');
assert.strictEqual(flour.qtyOnHand, 18, 'Flour stock should match frontend mockData (18)');

// 3. Test Products
const products = ProductModel.getAll('biz_default');
console.log(`[TEST] Found ${products.length} products seeded.`);
assert.strictEqual(products.length, 10, 'Should have 10 products seeded');

const bread = ProductModel.getById('bread-loaf', 'biz_default');
assert.ok(bread, 'Bread Loaf product should exist with ID "bread-loaf"');

// 4. Test Recipes
const breadRecipe = RecipeModel.getByProductId('bread-loaf', 'biz_default');
console.log(`[TEST] Bread Loaf recipe ingredients count: ${breadRecipe.length}`);
assert.strictEqual(breadRecipe.length, 3, 'Bread Loaf recipe should have 3 ingredients');

// 5. Test Product Derived Cost Per Unit
// Bread Loaf: 0.5kg flour (40/kg) + 5g yeast (0.5/g) + 0.1l milk (55/l) = 20 + 2.5 + 5.5 = 28.0
console.log(`[TEST] Bread Loaf cost_per_unit derived: ₹${bread.cost_per_unit}`);
assert.strictEqual(bread.cost_per_unit, 28.0, 'Bread Loaf cost per unit should equal 28.0');

// 6. Test Alerts
const alerts = AlertModel.getAll('biz_default');
assert.strictEqual(alerts.length, 2, 'Should have 2 alerts seeded');
const unread = AlertModel.getUnreadCount('biz_default');
assert.strictEqual(unread, 2, 'Unread alert count should be 2');

console.log('[TEST] ✅ ALL PHASE 1 VERIFICATION TESTS PASSED SUCCESSFULLY!');
