const { getDb } = require('../db/database');

class RetailerModel {
  static getAll(businessId = 'biz_default') {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT 
        retailer_id AS id,
        retailer_id,
        business_id,
        name,
        contact_phone,
        address,
        credit_terms,
        created_at
      FROM retailer
      WHERE business_id = ?
      ORDER BY name ASC
    `);
    return stmt.all(businessId);
  }

  static getById(retailerId, businessId = 'biz_default') {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT 
        retailer_id AS id,
        retailer_id,
        business_id,
        name,
        contact_phone,
        address,
        credit_terms,
        created_at
      FROM retailer
      WHERE retailer_id = ? AND business_id = ?
    `);
    return stmt.get(retailerId, businessId);
  }

  static create(retailerData) {
    const db = getDb();
    const {
      retailer_id,
      business_id = 'biz_default',
      name,
      contact_phone = null,
      address = null,
      credit_terms = null,
    } = retailerData;

    const stmt = db.prepare(`
      INSERT INTO retailer (retailer_id, business_id, name, contact_phone, address, credit_terms)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(retailer_id, business_id, name, contact_phone, address, credit_terms);
    return this.getById(retailer_id, business_id);
  }

  static update(retailerId, updateData, businessId = 'biz_default') {
    const db = getDb();
    const existing = this.getById(retailerId, businessId);
    if (!existing) return null;

    const name = updateData.name || existing.name;
    const contact_phone = updateData.contact_phone !== undefined ? updateData.contact_phone : existing.contact_phone;
    const address = updateData.address !== undefined ? updateData.address : existing.address;
    const credit_terms = updateData.credit_terms !== undefined ? updateData.credit_terms : existing.credit_terms;

    const stmt = db.prepare(`
      UPDATE retailer
      SET name = ?, contact_phone = ?, address = ?, credit_terms = ?
      WHERE retailer_id = ? AND business_id = ?
    `);
    stmt.run(name, contact_phone, address, credit_terms, retailerId, businessId);
    return this.getById(retailerId, businessId);
  }

  static delete(retailerId, businessId = 'biz_default') {
    const db = getDb();
    const stmt = db.prepare(`
      DELETE FROM retailer
      WHERE retailer_id = ? AND business_id = ?
    `);
    stmt.run(retailerId, businessId);
    return true;
  }
}

module.exports = RetailerModel;
