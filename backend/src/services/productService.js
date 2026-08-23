const ProductModel = require('../models/ProductModel');
const RecipeModel = require('../models/RecipeModel');
const { getDb } = require('../db/database');

class ProductService {
  static getAllProducts(businessId) {
    const products = ProductModel.getAll(businessId);
    return products.map(p => {
      const recipe = RecipeModel.getByProductId(p.product_id, businessId);
      return { ...p, recipe };
    });
  }

  static getProductById(productId, businessId) {
    const product = ProductModel.getById(productId, businessId);
    if (!product) {
      const err = new Error(`Product with ID '${productId}' not found`);
      err.status = 404;
      throw err;
    }
    const recipe = RecipeModel.getByProductId(productId, businessId);
    return { ...product, recipe };
  }

  static createProduct(productData, businessId) {
    const { name, category = 'General', unit = 'piece', selling_price = 0, current_stock = 0, image_url = null, recipe = [] } = productData;
    if (!name) {
      const err = new Error('Product name is required');
      err.status = 400;
      throw err;
    }
    const product_id = productData.product_id || `prod_${Date.now()}`;

    const db = getDb();
    db.exec('BEGIN TRANSACTION;');
    try {
      const stmt = db.prepare(`
        INSERT INTO product (product_id, business_id, name, category, unit, selling_price, current_stock, image_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(product_id, businessId, name, category, unit, selling_price, current_stock, image_url);

      if (Array.isArray(recipe) && recipe.length > 0) {
        const insertRecipe = db.prepare(`
          INSERT INTO recipe (recipe_id, business_id, product_id, material_id, quantity_per_unit)
          VALUES (?, ?, ?, ?, ?)
        `);
        for (const item of recipe) {
          const recipe_id = `rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          insertRecipe.run(recipe_id, businessId, product_id, item.materialId || item.material_id, item.qtyPerUnit || item.quantity_per_unit);
        }
      }

      ProductModel.updateCostPerUnit(product_id, businessId);
      db.exec('COMMIT;');
    } catch (err) {
      db.exec('ROLLBACK;');
      throw err;
    }

    return this.getProductById(product_id, businessId);
  }

  static updateRecipe(productId, recipeItems, businessId) {
    const db = getDb();
    this.getProductById(productId, businessId); // verify exists

    db.exec('BEGIN TRANSACTION;');
    try {
      // Clear existing recipe
      const deleteStmt = db.prepare(`DELETE FROM recipe WHERE product_id = ? AND business_id = ?`);
      deleteStmt.run(productId, businessId);

      // Insert new recipe items
      const insertRecipe = db.prepare(`
        INSERT INTO recipe (recipe_id, business_id, product_id, material_id, quantity_per_unit)
        VALUES (?, ?, ?, ?, ?)
      `);
      for (const item of recipeItems) {
        const recipe_id = `rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        insertRecipe.run(recipe_id, businessId, productId, item.materialId || item.material_id, item.qtyPerUnit || item.quantity_per_unit);
      }

      // Update cached cost per unit
      ProductModel.updateCostPerUnit(productId, businessId);
      db.exec('COMMIT;');
    } catch (err) {
      db.exec('ROLLBACK;');
      throw err;
    }

    return this.getProductById(productId, businessId);
  }
}

module.exports = ProductService;
