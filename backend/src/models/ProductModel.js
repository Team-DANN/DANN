const { getDb } = require('../db/database');

class ProductModel {
  static getAll(businessId = 'biz_default') {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT 
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
      WHERE p.business_id = ? AND p.active = 1
      ORDER BY p.name ASC
    `);
    return stmt.all(businessId);
  }

  static getById(productId, businessId = 'biz_default') {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT 
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
      WHERE p.product_id = ? AND p.business_id = ?
    `);
    return stmt.get(productId, businessId);
  }

  static create(productData) {
    const db = getDb();
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

    const stmt = db.prepare(`
      INSERT INTO product (product_id, business_id, name, category, unit, selling_price, current_stock, image_url, cost_per_unit)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(product_id, business_id, name, category, unit, selling_price, current_stock, image_url, cost_per_unit);
    return this.getById(product_id, business_id);
  }

  static updateCostPerUnit(productId, businessId = 'biz_default') {
    const db = getDb();
    const stmt = db.prepare(`
      UPDATE product
      SET cost_per_unit = (
        SELECT COALESCE(SUM(r.quantity_per_unit * m.unit_cost), 0.0)
        FROM recipe r
        JOIN material m ON r.material_id = m.material_id
        WHERE r.product_id = product.product_id
      )
      WHERE product_id = ? AND business_id = ?
    `);
    stmt.run(productId, businessId);
    return this.getById(productId, businessId);
  }
}

module.exports = ProductModel;
