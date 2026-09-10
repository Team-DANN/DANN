//Recipe model
const { query } = require('../db/database');

class RecipeModel {
  static async getByProductId(productId, businessId = 'biz_default') {
    const { rows } = await query(
      `SELECT
        r.recipe_id,
        r.business_id,
        r.product_id,
        r.material_id AS "materialId",
        r.material_id,
        m.name AS material_name,
        m.unit AS material_unit,
        m.unit_cost AS material_unit_cost,
        r.quantity_per_unit AS "qtyPerUnit",
        r.quantity_per_unit,
        r.created_at
      FROM recipe r
      JOIN material m ON r.material_id = m.material_id
      WHERE r.product_id = $1 AND r.business_id = $2`,
      [productId, businessId]
    );
    return rows;
  }

  static async addIngredient(recipeData) {
    const {
      recipe_id,
      business_id = 'biz_default',
      product_id,
      material_id,
      quantity_per_unit,
    } = recipeData;

    await query(
      `INSERT INTO recipe (recipe_id, business_id, product_id, material_id, quantity_per_unit)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (recipe_id) DO UPDATE SET
        business_id = EXCLUDED.business_id, product_id = EXCLUDED.product_id,
        material_id = EXCLUDED.material_id, quantity_per_unit = EXCLUDED.quantity_per_unit`,
      [recipe_id, business_id, product_id, material_id, quantity_per_unit]
    );
    return this.getByProductId(product_id, business_id);
  }
}

module.exports = RecipeModel;