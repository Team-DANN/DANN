//Product model
const { query } = require('../db/database');

class ProductModel {
  static async getAll(businessId = 'biz_default') {
    const { rows } = await query(
      `SELECT
        p.product_id AS id,
        p.product_id,
        p.business_id,
        p.name,
        p.category,
        p.unit,
        p.selling_price,
        p.current_stock,
        p.image_url,
        p.active,
        p.cost_per_unit,
        p.created_at
      FROM product p
      WHERE p.business_id = $1 AND p.active = true
      ORDER BY p.name ASC`,
      [businessId]
    );
    return rows;
  }

  static async getById(productId, businessId = 'biz_default') {
    const { rows } = await query(
      `SELECT
        p.product_id AS id,
        p.product_id,
        p.business_id,
        p.name,
        p.category,
        p.unit,
        p.selling_price,
        p.current_stock,
        p.image_url,
        p.active,
        p.cost_per_unit,
        p.created_at
      FROM product p
      WHERE p.product_id = $1 AND p.business_id = $2`,
      [productId, businessId]
    );
    return rows[0];
  }

  static async create(productData) {
    const {
      product_id,
      business_id = 'biz_default',
      name,
      category = 'General',
      unit = 'piece',
      selling_price = 0.0,
      current_stock = 0.0,
      image_url = null,
      cost_per_unit = 0.0,
    } = productData;

    await query(
      `INSERT INTO product (product_id, business_id, name, category, unit, selling_price, current_stock, image_url, cost_per_unit)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [product_id, business_id, name, category, unit, selling_price, current_stock, image_url, cost_per_unit]
    );
    return this.getById(product_id, business_id);
  }

  static async updateCostPerUnit(productId, businessId = 'biz_default') {
    await query(
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
    return this.getById(productId, businessId);
  }
}

module.exports = ProductModel;