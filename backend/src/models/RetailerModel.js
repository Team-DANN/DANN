//Retailer model
const { query } = require('../db/database');

class RetailerModel {
  static async getAll(businessId = 'biz_default') {
    const { rows } = await query(
      `SELECT
        retailer_id AS id,
        retailer_id,
        business_id,
        name,
        contact_phone,
        address,
        credit_terms,
        created_at
      FROM retailer
      WHERE business_id = $1
      ORDER BY name ASC`,
      [businessId]
    );
    return rows;
  }

  static async getById(retailerId, businessId = 'biz_default') {
    const { rows } = await query(
      `SELECT
        retailer_id AS id,
        retailer_id,
        business_id,
        name,
        contact_phone,
        address,
        credit_terms,
        created_at
      FROM retailer
      WHERE retailer_id = $1 AND business_id = $2`,
      [retailerId, businessId]
    );
    return rows[0];
  }

  static async create(retailerData) {
    const {
      retailer_id,
      business_id = 'biz_default',
      name,
      contact_phone = null,
      address = null,
      credit_terms = null,
    } = retailerData;

    await query(
      `INSERT INTO retailer (retailer_id, business_id, name, contact_phone, address, credit_terms)
      VALUES ($1, $2, $3, $4, $5, $6)`,
      [retailer_id, business_id, name, contact_phone, address, credit_terms]
    );
    return this.getById(retailer_id, business_id);
  }

  static async update(retailerId, updateData, businessId = 'biz_default') {
    const existing = await this.getById(retailerId, businessId);
    if (!existing) return null;

    const name = updateData.name || existing.name;
    const contact_phone = updateData.contact_phone !== undefined ? updateData.contact_phone : existing.contact_phone;
    const address = updateData.address !== undefined ? updateData.address : existing.address;
    const credit_terms = updateData.credit_terms !== undefined ? updateData.credit_terms : existing.credit_terms;

    await query(
      `UPDATE retailer
      SET name = $1, contact_phone = $2, address = $3, credit_terms = $4
      WHERE retailer_id = $5 AND business_id = $6`,
      [name, contact_phone, address, credit_terms, retailerId, businessId]
    );
    return this.getById(retailerId, businessId);
  }

  static async delete(retailerId, businessId = 'biz_default') {
    await query(
      `DELETE FROM retailer
      WHERE retailer_id = $1 AND business_id = $2`,
      [retailerId, businessId]
    );
    return true;
  }
}

module.exports = RetailerModel;