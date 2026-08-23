const OrderService = require('../services/orderService');

class OrderController {
  static getAll(req, res, next) {
    try {
      const filter = {
        retailer_id: req.query.retailer_id,
        status: req.query.status,
      };
      const orders = OrderService.getOrders(req.business_id, filter);
      res.json({ success: true, data: orders });
    } catch (err) {
      next(err);
    }
  }

  static getById(req, res, next) {
    try {
      const order = OrderService.getOrderById(req.params.id, req.business_id);
      res.json({ success: true, data: order });
    } catch (err) {
      next(err);
    }
  }

  static createOrder(req, res, next) {
    try {
      const order = OrderService.createOrder(req.body, req.business_id);
      res.status(201).json({ success: true, message: 'Order recorded & finished stock deducted successfully', data: order });
    } catch (err) {
      next(err);
    }
  }

  static recordPayment(req, res, next) {
    try {
      const { amount } = req.body;
      const order = OrderService.recordPayment(req.params.id, amount, req.business_id);
      res.json({ success: true, message: 'Payment recorded successfully', data: order });
    } catch (err) {
      next(err);
    }
  }

  static getUnpaidSummary(req, res, next) {
    try {
      const summary = OrderService.getUnpaidSummary(req.business_id);
      res.json({ success: true, data: summary });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = OrderController;
