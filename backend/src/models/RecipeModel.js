const { getDb } = require('../db/database');

class RecipeModel {
  static getByProductId(productId, businessId = 'biz_default') {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT 
        r.recipe_id,
        r.business_id,
        r.product_id,
        r.material_id AS materialId,
        r.material_id,
        m.name AS material_name,
        m.unit AS material_unit,
        m.unit_cost AS material_unit_cost,
        r.quantity_per_unit AS qtyPerUnit,
        r.quantity_per_unit,
        r.created_at
      FROM recipe r
      JOIN material m ON r.material_id = m.material_id
      WHERE r.product_id = ? AND r.business_id = ?
    `);
    return stmt.all(productId, businessId);
  }

  static addIngredient(recipeData) {
    const db = getDb();
    const {
      recipe_id,
      business_id = 'biz_default',
      product_id,
      material_id,
      quantity_per_unit,
    } = recipeData;

    const stmt = db.prepare(`
      INSERT OR REPLACE INTO recipe (recipe_id, business_id, product_id, material_id, quantity_per_unit)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(recipe_id, business_id, product_id, material_id, quantity_per_unit);
    return this.getByProductId(product_id, business_id);
  }
}

module.exports = RecipeModel;
