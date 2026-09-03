//productService
const ProductModel = require('../models/ProductModel');
const RecipeModel = require('../models/RecipeModel');
const { getClient } = require('../db/database');

class ProductService {
  static async getAllProducts(businessId) {
    const products = await ProductModel.getAll(businessId);
    return Promise.all(
      products.map(async (p) => {
        const recipe = await RecipeModel.getByProductId(p.product_id, businessId);
        return { ...p, recipe };
      })
    );
  }

  static async getProductById(productId, businessId) {
    const product = await ProductModel.getById(productId, businessId);
    if (!product) {
      const err = new Error(`Product with ID '${productId}' not found`);
      err.status = 404;
      throw err;
    }
    const recipe = await RecipeModel.getByProductId(productId, businessId);
    return { ...product, recipe };
  }

  static async createProduct(productData, businessId) {
    const { name, category = 'General', unit = 'piece', selling_price = 0, current_stock = 0, image_url = null, recipe = [] } = productData;
    if (!name) {
      const err = new Error('Product name is required');
      err.status = 400;
      throw err;
    }
    const product_id = productData.product_id || `prod_${Date.now()}`;

    // Everything below runs on one checked-out client. Note we do NOT call
    // ProductModel.updateCostPerUnit() here — that helper uses the shared pool
    // via query(), which would run on a different connection outside this
    // transaction and could read the recipe rows before they're committed.
    const client = await getClient();
    try {
      await client.query('BEGIN');

      await client.query(
        `INSERT INTO product (product_id, business_id, name, category, unit, selling_price, current_stock, image_url)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [product_id, businessId, name, category, unit, selling_price, current_stock, image_url]
      );

      if (Array.isArray(recipe) && recipe.length > 0) {
        for (const item of recipe) {
          const recipe_id = `rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          await client.query(
            `INSERT INTO recipe (recipe_id, business_id, product_id, material_id, quantity_per_unit)
            VALUES ($1, $2, $3, $4, $5)`,
            [recipe_id, businessId, product_id, item.materialId || item.material_id, item.qtyPerUnit || item.quantity_per_unit]
          );
        }
      }

      await client.query(
        `UPDATE product
        SET cost_per_unit = (
          SELECT COALESCE(SUM(r.quantity_per_unit * m.unit_cost), 0.0)
          FROM recipe r
          JOIN material m ON r.material_id = m.material_id
          WHERE r.product_id = product.product_id
        )
        WHERE product_id = $1 AND business_id = $2`,
        [product_id, businessId]
      );

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    return this.getProductById(product_id, businessId);
  }

  static async updateRecipe(productId, recipeItems, businessId) {
    await this.getProductById(productId, businessId); // verify exists

    const client = await getClient();
    try {
      await client.query('BEGIN');

      // Clear existing recipe
      await client.query(`DELETE FROM recipe WHERE product_id = $1 AND business_id = $2`, [productId, businessId]);

      // Insert new recipe items
      for (const item of recipeItems) {
        const recipe_id = `rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        await client.query(
          `INSERT INTO recipe (recipe_id, business_id, product_id, material_id, quantity_per_unit)
          VALUES ($1, $2, $3, $4, $5)`,
          [recipe_id, businessId, productId, item.materialId || item.material_id, item.qtyPerUnit || item.quantity_per_unit]
        );
      }

      // Update cached cost per unit (inline on the same client — see note above)
      await client.query(
        `UPDATE product
        SET cost_per_unit = (
          SELECT COALESCE(SUM(r.quantity_per_unit * m.unit_cost), 0.0)
          FROM recipe r
          JOIN material m ON r.material_id = m.material_id
          WHERE r.product_id = product.product_id
        )
        WHERE product_id = $1 AND business_id = $2`,
        [productId, businessId]
      );

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    return this.getProductById(productId, businessId);
  }
}

module.exports = ProductService;