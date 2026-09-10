//orderController.js
const OrderService = require('../services/orderService');
const AlertService = require('../services/alertService');

class OrderController {
  static async getAll(req, res, next) {
    try {
      const filter = {
        retailer_id: req.query.retailer_id,
        status: req.query.status,
      };
      const orders = await OrderService.getOrders(req.business_id, filter);
      res.json({ success: true, data: orders });
    } catch (err) {
      next(err);
    }
  }

  static async getById(req, res, next) {
    try {
      const order = await OrderService.getOrderById(req.params.id, req.business_id);
      res.json({ success: true, data: order });
    } catch (err) {
      next(err);
    }
  }

  static async createOrder(req, res, next) {
    try {
      const order = await OrderService.createOrder(req.body, req.business_id);
      await AlertService.syncOrderOverdueAlerts(req.business_id);
      res.status(201).json({ success: true, message: 'Order recorded & finished stock deducted successfully', data: order });
    } catch (err) {
      next(err);
    }
  }

  static async recordPayment(req, res, next) {
    try {
      const { amount } = req.body;
      const order = await OrderService.recordPayment(req.params.id, amount, req.business_id);
      await AlertService.syncOrderOverdueAlerts(req.business_id);
      res.json({ success: true, message: 'Payment recorded successfully', data: order });
    } catch (err) {
      next(err);
    }
  }

  static async getUnpaidSummary(req, res, next) {
    try {
      const summary = await OrderService.getUnpaidSummary(req.business_id);
      res.json({ success: true, data: summary });
    } catch (err) {
      next(err);
    }
  }

    static async getOverdue(req, res, next) {
    try {
      const overdueOrders = await OrderService.getOverdueOrders(req.business_id);
      res.json({ success: true, data: overdueOrders });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = OrderController;