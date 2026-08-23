const { getDb, initDb } = require('./database');

function seedDatabase() {
  initDb();
  const db = getDb();

  console.log('[DB] Seeding database with initial data aligned with frontend mock data...');

  const businessId = 'biz_default';
  const userId = 'user_default';

  // 1. Business
  const insertBiz = db.prepare(`
    INSERT OR REPLACE INTO business (business_id, name, type, timezone, currency, owner_user_id, plan_tier)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  insertBiz.run(businessId, 'Leo Bakery & Sweets', 'bakery', 'Asia/Kolkata', '₹', userId, 'Free');

  // 2. User
  const insertUser = db.prepare(`
    INSERT OR REPLACE INTO user (user_id, business_id, name, email, phone, role)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  insertUser.run(userId, businessId, 'Leo Noel Zuze', 'leonoelzuze@gmail.com', '+91 9876543210', 'owner');

  // 3. Raw Materials (exact IDs matching client/src/lib/mockData.js)
  const materials = [
    { material_id: 'flour', name: 'Wheat flour', unit: 'kg', unit_cost: 40.0, current_stock: 18.0, reorder_threshold: 10.0, supplier_name: 'Apex Grains Supplier' },
    { material_id: 'sugar', name: 'Sugar', unit: 'kg', unit_cost: 45.0, current_stock: 12.0, reorder_threshold: 5.0, supplier_name: 'SweetLife Mills' },
    { material_id: 'butter', name: 'Butter', unit: 'kg', unit_cost: 450.0, current_stock: 6.0, reorder_threshold: 2.0, supplier_name: 'Fresh Dairy Co' },
    { material_id: 'eggs', name: 'Eggs', unit: 'pcs', unit_cost: 6.0, current_stock: 90.0, reorder_threshold: 30.0, supplier_name: 'Poultry Fresh' },
    { material_id: 'milk', name: 'Milk', unit: 'l', unit_cost: 55.0, current_stock: 10.0, reorder_threshold: 5.0, supplier_name: 'Fresh Dairy Co' },
    { material_id: 'yeast', name: 'Yeast', unit: 'g', unit_cost: 0.5, current_stock: 400.0, reorder_threshold: 100.0, supplier_name: 'Baker Craft Supplies' },
  ];

  const insertMaterial = db.prepare(`
    INSERT OR REPLACE INTO material (material_id, business_id, name, unit, unit_cost, current_stock, reorder_threshold, supplier_name)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const m of materials) {
    insertMaterial.run(m.material_id, businessId, m.name, m.unit, m.unit_cost, m.current_stock, m.reorder_threshold, m.supplier_name);
  }

  // 4. Products (exact IDs matching client/src/features/production/data/productionMock.js)
  const products = [
    { product_id: 'bread-loaf', name: 'Bread Loaf', category: 'Bread', unit: 'piece', selling_price: 40.0, current_stock: 25.0, image_url: null },
    { product_id: 'sponge-cake', name: 'Sponge Cake', category: 'Cakes', unit: 'piece', selling_price: 250.0, current_stock: 10.0, image_url: null },
    { product_id: 'butter-cookies', name: 'Butter Cookies (dozen)', category: 'Cookies', unit: 'pack', selling_price: 150.0, current_stock: 15.0, image_url: null },
    { product_id: 'milk-bun', name: 'Milk Bun (pack of 6)', category: 'Bread', unit: 'pack', selling_price: 60.0, current_stock: 30.0, image_url: null },
    { product_id: 'dinner-roll', name: 'Dinner Rolls (dozen)', category: 'Bread', unit: 'pack', selling_price: 80.0, current_stock: 20.0, image_url: null },
    { product_id: 'rusk', name: 'Rusk (pack)', category: 'Snacks', unit: 'pack', selling_price: 50.0, current_stock: 40.0, image_url: null },
    { product_id: 'donut', name: 'Glazed Donut', category: 'Pastry', unit: 'piece', selling_price: 35.0, current_stock: 12.0, image_url: null },
    { product_id: 'muffin', name: 'Muffin (box of 4)', category: 'Pastry', unit: 'box', selling_price: 120.0, current_stock: 8.0, image_url: null },
    { product_id: 'pretzel', name: 'Soft Pretzel', category: 'Snacks', unit: 'piece', selling_price: 45.0, current_stock: 18.0, image_url: null },
    { product_id: 'croissant', name: 'Croissant', category: 'Pastry', unit: 'piece', selling_price: 70.0, current_stock: 14.0, image_url: null },
  ];

  const insertProduct = db.prepare(`
    INSERT OR REPLACE INTO product (product_id, business_id, name, category, unit, selling_price, current_stock, image_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const p of products) {
    insertProduct.run(p.product_id, businessId, p.name, p.category, p.unit, p.selling_price, p.current_stock, p.image_url);
  }

  // 5. Recipes (matching productionMock.js)
  const recipes = [
    // Bread Loaf: flour 0.5, yeast 5, milk 0.1
    { recipe_id: 'rec_bread_flour', product_id: 'bread-loaf', material_id: 'flour', quantity_per_unit: 0.5 },
    { recipe_id: 'rec_bread_yeast', product_id: 'bread-loaf', material_id: 'yeast', quantity_per_unit: 5.0 },
    { recipe_id: 'rec_bread_milk', product_id: 'bread-loaf', material_id: 'milk', quantity_per_unit: 0.1 },

    // Sponge Cake: flour 0.3, sugar 0.2, butter 0.15, eggs 3
    { recipe_id: 'rec_cake_flour', product_id: 'sponge-cake', material_id: 'flour', quantity_per_unit: 0.3 },
    { recipe_id: 'rec_cake_sugar', product_id: 'sponge-cake', material_id: 'sugar', quantity_per_unit: 0.2 },
    { recipe_id: 'rec_cake_butter', product_id: 'sponge-cake', material_id: 'butter', quantity_per_unit: 0.15 },
    { recipe_id: 'rec_cake_eggs', product_id: 'sponge-cake', material_id: 'eggs', quantity_per_unit: 3.0 },

    // Butter Cookies: flour 0.25, sugar 0.15, butter 0.2
    { recipe_id: 'rec_cookies_flour', product_id: 'butter-cookies', material_id: 'flour', quantity_per_unit: 0.25 },
    { recipe_id: 'rec_cookies_sugar', product_id: 'butter-cookies', material_id: 'sugar', quantity_per_unit: 0.15 },
    { recipe_id: 'rec_cookies_butter', product_id: 'butter-cookies', material_id: 'butter', quantity_per_unit: 0.2 },

    // Milk Bun: flour 0.4, milk 0.2, eggs 1
    { recipe_id: 'rec_bun_flour', product_id: 'milk-bun', material_id: 'flour', quantity_per_unit: 0.4 },
    { recipe_id: 'rec_bun_milk', product_id: 'milk-bun', material_id: 'milk', quantity_per_unit: 0.2 },
    { recipe_id: 'rec_bun_eggs', product_id: 'milk-bun', material_id: 'eggs', quantity_per_unit: 1.0 },

    // Dinner Rolls: flour 0.35, yeast 4, milk 0.08
    { recipe_id: 'rec_roll_flour', product_id: 'dinner-roll', material_id: 'flour', quantity_per_unit: 0.35 },
    { recipe_id: 'rec_roll_yeast', product_id: 'dinner-roll', material_id: 'yeast', quantity_per_unit: 4.0 },
    { recipe_id: 'rec_roll_milk', product_id: 'dinner-roll', material_id: 'milk', quantity_per_unit: 0.08 },

    // Rusk: flour 0.45, sugar 0.1, butter 0.05
    { recipe_id: 'rec_rusk_flour', product_id: 'rusk', material_id: 'flour', quantity_per_unit: 0.45 },
    { recipe_id: 'rec_rusk_sugar', product_id: 'rusk', material_id: 'sugar', quantity_per_unit: 0.1 },
    { recipe_id: 'rec_rusk_butter', product_id: 'rusk', material_id: 'butter', quantity_per_unit: 0.05 },

    // Donut: flour 0.2, sugar 0.12, butter 0.08, eggs 0.5
    { recipe_id: 'rec_donut_flour', product_id: 'donut', material_id: 'flour', quantity_per_unit: 0.2 },
    { recipe_id: 'rec_donut_sugar', product_id: 'donut', material_id: 'sugar', quantity_per_unit: 0.12 },
    { recipe_id: 'rec_donut_butter', product_id: 'donut', material_id: 'butter', quantity_per_unit: 0.08 },
    { recipe_id: 'rec_donut_eggs', product_id: 'donut', material_id: 'eggs', quantity_per_unit: 0.5 },

    // Muffin: flour 0.3, sugar 0.18, eggs 2, milk 0.15
    { recipe_id: 'rec_muffin_flour', product_id: 'muffin', material_id: 'flour', quantity_per_unit: 0.3 },
    { recipe_id: 'rec_muffin_sugar', product_id: 'muffin', material_id: 'sugar', quantity_per_unit: 0.18 },
    { recipe_id: 'rec_muffin_eggs', product_id: 'muffin', material_id: 'eggs', quantity_per_unit: 2.0 },
    { recipe_id: 'rec_muffin_milk', product_id: 'muffin', material_id: 'milk', quantity_per_unit: 0.15 },

    // Pretzel: flour 0.25, yeast 3, butter 0.03
    { recipe_id: 'rec_pretzel_flour', product_id: 'pretzel', material_id: 'flour', quantity_per_unit: 0.25 },
    { recipe_id: 'rec_pretzel_yeast', product_id: 'pretzel', material_id: 'yeast', quantity_per_unit: 3.0 },
    { recipe_id: 'rec_pretzel_butter', product_id: 'pretzel', material_id: 'butter', quantity_per_unit: 0.03 },

    // Croissant: flour 0.18, butter 0.12, milk 0.05
    { recipe_id: 'rec_croissant_flour', product_id: 'croissant', material_id: 'flour', quantity_per_unit: 0.18 },
    { recipe_id: 'rec_croissant_butter', product_id: 'croissant', material_id: 'butter', quantity_per_unit: 0.12 },
    { recipe_id: 'rec_croissant_milk', product_id: 'croissant', material_id: 'milk', quantity_per_unit: 0.05 },
  ];

  const insertRecipe = db.prepare(`
    INSERT OR REPLACE INTO recipe (recipe_id, business_id, product_id, material_id, quantity_per_unit)
    VALUES (?, ?, ?, ?, ?)
  `);
  for (const r of recipes) {
    insertRecipe.run(r.recipe_id, businessId, r.product_id, r.material_id, r.quantity_per_unit);
  }

  // Calculate and update cached cost_per_unit for each product based on recipe & material costs
  const updateProductCost = db.prepare(`
    UPDATE product
    SET cost_per_unit = (
      SELECT COALESCE(SUM(r.quantity_per_unit * m.unit_cost), 0.0)
      FROM recipe r
      JOIN material m ON r.material_id = m.material_id
      WHERE r.product_id = product.product_id
    )
    WHERE business_id = ?
  `);
  updateProductCost.run(businessId);

  // 6. Retailer
  const insertRetailer = db.prepare(`
    INSERT OR REPLACE INTO retailer (retailer_id, business_id, name, contact_phone, address, credit_terms)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  insertRetailer.run('ret_sharma', businessId, 'Sharma Retailers', '+91 9812345678', 'Main Market, City Center', '14 Days Net');

  // 7. Initial Alerts
  const insertAlert = db.prepare(`
    INSERT OR REPLACE INTO alert (alert_id, business_id, type, severity, related_entity_id, message, read)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  insertAlert.run('alt_001', businessId, 'low_stock', 'high', 'flour', 'Wheat flour , 2 days left', 0);
  insertAlert.run('alt_002', businessId, 'payment_overdue', 'medium', 'ret_sharma', 'Sharma Retailers, ₹4,200 overdue', 0);

  console.log('[DB] Seeding completed successfully.');
}

if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };
