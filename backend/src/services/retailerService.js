const RetailerModel = require('../models/RetailerModel');

class RetailerService {
  static getAllRetailers(businessId) {
    return RetailerModel.getAll(businessId);
  }

  static getRetailerById(retailerId, businessId) {
    const retailer = RetailerModel.getById(retailerId, businessId);
    if (!retailer) {
      const err = new Error(`Retailer '${retailerId}' not found`);
      err.status = 404;
      throw err;
    }
    return retailer;
  }

  static createRetailer(retailerData, businessId) {
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

  static updateRetailer(retailerId, updateData, businessId) {
    this.getRetailerById(retailerId, businessId); // verify exists
    return RetailerModel.update(retailerId, updateData, businessId);
  }

  static deleteRetailer(retailerId, businessId) {
    this.getRetailerById(retailerId, businessId); // verify exists
    RetailerModel.delete(retailerId, businessId);
    return { success: true, message: `Retailer ${retailerId} removed successfully` };
  }
}

module.exports = RetailerService;
