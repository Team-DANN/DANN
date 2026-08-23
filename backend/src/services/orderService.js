const { getDb } = require('../db/database');
const ProductModel = require('../models/ProductModel');

class OrderService {
  static getOrders(businessId, filter = {}) {
    const db = getDb();
    let query = `
      SELECT 
        o.order_id AS id,
        o.order_id,
        o.business_id,
        o.retailer_id,
        r.name AS retailer_name,
        o.product_id,
        p.name AS product_name,
        o.quantity,
        o.total_amount,
        o.amount_paid,
        o.status,
        o.dispatched_at
      FROM dispatch_order o
      JOIN retailer r ON o.retailer_id = r.retailer_id
      JOIN product p ON o.product_id = p.product_id
      WHERE o.business_id = ?
    `;

    const params = [businessId];

    if (filter.retailer_id) {
      query += ` AND o.retailer_id = ?`;
      params.push(filter.retailer_id);
    }

    if (filter.status) {
      query += ` AND o.status = ?`;
      params.push(filter.status);
    }

    query += ` ORDER BY o.dispatched_at DESC`;

    const stmt = db.prepare(query);
    return stmt.all(...params);
  }

  static getOrderById(orderId, businessId) {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT 
        o.order_id AS id,
        o.order_id,
        o.business_id,
        o.retailer_id,
        r.name AS retailer_name,
        o.product_id,
        p.name AS product_name,
        o.quantity,
        o.total_amount,
        o.amount_paid,
        o.status,
        o.dispatched_at
      FROM dispatch_order o
      JOIN retailer r ON o.retailer_id = r.retailer_id
      JOIN product p ON o.product_id = p.product_id
      WHERE o.order_id = ? AND o.business_id = ?
    `);
    const order = stmt.get(orderId, businessId);
    if (!order) {
      const err = new Error(`Order '${orderId}' not found`);
      err.status = 404;
      throw err;
    }
    return order;
  }

  /**
   * ATOMIC ORDER CREATION:
   * 1. Checks finished product stock sufficiency.
   * 2. Single DB transaction:
   *    a) Deducts finished product stock from product table
   *    b) Inserts order into dispatch_order table
   *    c) Derives status (paid, partial, owes)
   *    d) Records initial payment in finance table if amount_paid > 0
   */
  static createOrder(orderData, businessId) {
    const { retailer_id, product_id, quantity, amount_paid = 0 } = orderData;

    if (!retailer_id || !product_id || !quantity || quantity <= 0) {
      const err = new Error('retailer_id, product_id, and positive quantity are required');
      err.status = 400;
      throw err;
    }

    const product = ProductModel.getById(product_id, businessId);
    if (!product) {
      const err = new Error(`Product '${product_id}' not found`);
      err.status = 404;
      throw err;
    }

    if (product.current_stock < quantity) {
      const err = new Error(`Insufficient finished product stock for '${product.name}'. Requested: ${quantity}, Available: ${product.current_stock}`);
      err.status = 400;
      throw err;
    }

    const total_amount = quantity * product.selling_price;
    let status = 'owes';
    if (amount_paid >= total_amount) {
      status = 'paid';
    } else if (amount_paid > 0) {
      status = 'partial';
    }

    const order_id = `ord_${Date.now()}`;
    const db = getDb();

    db.exec('BEGIN TRANSACTION;');
    try {
      // Deduct finished product stock
      const updateStock = db.prepare(`
        UPDATE product
        SET current_stock = current_stock - ?
        WHERE product_id = ? AND business_id = ?
      `);
      updateStock.run(quantity, product_id, businessId);

      // Create dispatch order record
      const insertOrder = db.prepare(`
        INSERT INTO dispatch_order (order_id, business_id, retailer_id, product_id, quantity, total_amount, amount_paid, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      insertOrder.run(order_id, businessId, retailer_id, product_id, quantity, total_amount, amount_paid, status);

      // Record transaction in ledger if payment received
      if (amount_paid > 0) {
        const txn_id = `txn_${Date.now()}`;
        const insertLedger = db.prepare(`
          INSERT INTO finance (transaction_id, business_id, type, related_order_id, amount, note)
          VALUES (?, ?, 'payment_received', ?, ?, ?)
        `);
        insertLedger.run(txn_id, businessId, order_id, amount_paid, `Payment for order ${order_id}`);
      }

      db.exec('COMMIT;');
    } catch (err) {
      db.exec('ROLLBACK;');
      throw err;
    }

    return this.getOrderById(order_id, businessId);
  }

  static recordPayment(orderId, paymentAmount, businessId) {
    if (!paymentAmount || paymentAmount <= 0) {
      const err = new Error('paymentAmount must be greater than zero');
      err.status = 400;
      throw err;
    }

    const order = this.getOrderById(orderId, businessId);
    const newAmountPaid = order.amount_paid + paymentAmount;
    let newStatus = 'owes';
    if (newAmountPaid >= order.total_amount) {
      newStatus = 'paid';
    } else if (newAmountPaid > 0) {
      newStatus = 'partial';
    }

    const db = getDb();
    db.exec('BEGIN TRANSACTION;');
    try {
      const updateOrder = db.prepare(`
        UPDATE dispatch_order
        SET amount_paid = ?, status = ?
        WHERE order_id = ? AND business_id = ?
      `);
      updateOrder.run(newAmountPaid, newStatus, orderId, businessId);

      const txn_id = `txn_${Date.now()}`;
      const insertLedger = db.prepare(`
        INSERT INTO finance (transaction_id, business_id, type, related_order_id, amount, note)
        VALUES (?, ?, 'payment_received', ?, ?, ?)
      `);
      insertLedger.run(txn_id, businessId, orderId, paymentAmount, `Subsequent payment for order ${orderId}`);

      db.exec('COMMIT;');
    } catch (err) {
      db.exec('ROLLBACK;');
      throw err;
    }

    return this.getOrderById(orderId, businessId);
  }

  static getUnpaidSummary(businessId) {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT 
        r.retailer_id,
        r.name AS retailer_name,
        r.contact_phone,
        COUNT(o.order_id) AS unpaid_orders_count,
        SUM(o.total_amount - o.amount_paid) AS total_owed
      FROM dispatch_order o
      JOIN retailer r ON o.retailer_id = r.retailer_id
      WHERE o.business_id = ? AND o.status IN ('owes', 'partial')
      GROUP BY r.retailer_id, r.name, r.contact_phone
      HAVING total_owed > 0
      ORDER BY total_owed DESC
    `);
    return stmt.all(businessId);
  }
}

module.exports = OrderService;
