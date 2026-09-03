//retailer service
const RetailerModel = require('../models/RetailerModel');

class RetailerService {
  static async getAllRetailers(businessId) {
    return RetailerModel.getAll(businessId);
  }

  static async getRetailerById(retailerId, businessId) {
    const retailer = await RetailerModel.getById(retailerId, businessId);
    if (!retailer) {
      const err = new Error(`Retailer '${retailerId}' not found`);
      err.status = 404;
      throw err;
    }
    return retailer;
  }

  static async createRetailer(retailerData, businessId) {
    const { name, contact_phone = null, address = null, credit_terms = null } = retailerData;
    if (!name) {
      const err = new Error('Retailer name is required');
      err.status = 400;
      throw err;
    }

    const retailer_id = retailerData.retailer_id || `ret_${Date.now()}`;
    return RetailerModel.create({
      retailer_id,
      business_id: businessId,
      name,
      contact_phone,
      address,
      credit_terms,
    });
  }

  static async updateRetailer(retailerId, updateData, businessId) {
    await this.getRetailerById(retailerId, businessId); // verify exists
    return RetailerModel.update(retailerId, updateData, businessId);
  }

  static async deleteRetailer(retailerId, businessId) {
    await this.getRetailerById(retailerId, businessId); // verify exists
    await RetailerModel.delete(retailerId, businessId);
    return { success: true, message: `Retailer ${retailerId} removed successfully` };
  }
}

module.exports = RetailerService;