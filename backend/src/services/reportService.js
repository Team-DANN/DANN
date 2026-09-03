//orderService
const { query, getClient } = require('../db/database');
const ProductModel = require('../models/ProductModel');

class OrderService {
  static async getOrders(businessId, filter = {}) {
    let sql = `
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
      WHERE o.business_id = $1
    `;

    const params = [businessId];

    if (filter.retailer_id) {
      params.push(filter.retailer_id);
      sql += ` AND o.retailer_id = $${params.length}`;
    }

    if (filter.status) {
      params.push(filter.status);
      sql += ` AND o.status = $${params.length}`;
    }

    sql += ` ORDER BY o.dispatched_at DESC`;

    const { rows } = await query(sql, params);
    return rows;
  }

  static async getOrderById(orderId, businessId) {
    const { rows } = await query(
      `SELECT 
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
      WHERE o.order_id = $1 AND o.business_id = $2`,
      [orderId, businessId]
    );
    const order = rows[0];
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
   * 2. Single DB transaction on one checked-out client:
   *    a) Deducts finished product stock from product table
   *    b) Inserts order into dispatch_order table
   *    c) Derives status (paid, partial, owes)
   *    d) Records initial payment in finance table if amount_paid > 0
   */
  static async createOrder(orderData, businessId) {
    const { retailer_id, product_id, quantity, amount_paid = 0 } = orderData;

    if (!retailer_id || !product_id || !quantity || quantity <= 0) {
      const err = new Error('retailer_id, product_id, and positive quantity are required');
      err.status = 400;
      throw err;
    }

    const product = await ProductModel.getById(product_id, businessId);
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

    const client = await getClient();
    try {
      await client.query('BEGIN');

      // Deduct finished product stock
      await client.query(
        `UPDATE product
        SET current_stock = current_stock - $1
        WHERE product_id = $2 AND business_id = $3`,
        [quantity, product_id, businessId]
      );

      // Create dispatch order record
      await client.query(
        `INSERT INTO dispatch_order (order_id, business_id, retailer_id, product_id, quantity, total_amount, amount_paid, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [order_id, businessId, retailer_id, product_id, quantity, total_amount, amount_paid, status]
      );

      // Record transaction in ledger if payment received
      if (amount_paid > 0) {
        const txn_id = `txn_${Date.now()}`;
        await client.query(
          `INSERT INTO finance (transaction_id, business_id, type, related_order_id, amount, note)
          VALUES ($1, $2, 'payment_received', $3, $4, $5)`,
          [txn_id, businessId, order_id, amount_paid, `Payment for order ${order_id}`]
        );
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    return this.getOrderById(order_id, businessId);
  }

  static async recordPayment(orderId, paymentAmount, businessId) {
    if (!paymentAmount || paymentAmount <= 0) {
      const err = new Error('paymentAmount must be greater than zero');
      err.status = 400;
      throw err;
    }

    const order = await this.getOrderById(orderId, businessId);
    // order.amount_paid / total_amount arrive as real numbers (see the NUMERIC
    // type-parser fix in database.js) so this addition is safe.
    const newAmountPaid = order.amount_paid + paymentAmount;
    let newStatus = 'owes';
    if (newAmountPaid >= order.total_amount) {
      newStatus = 'paid';
    } else if (newAmountPaid > 0) {
      newStatus = 'partial';
    }

    const client = await getClient();
    try {
      await client.query('BEGIN');

      await client.query(
        `UPDATE dispatch_order
        SET amount_paid = $1, status = $2
        WHERE order_id = $3 AND business_id = $4`,
        [newAmountPaid, newStatus, orderId, businessId]
      );

      const txn_id = `txn_${Date.now()}`;
      await client.query(
        `INSERT INTO finance (transaction_id, business_id, type, related_order_id, amount, note)
        VALUES ($1, $2, 'payment_received', $3, $4, $5)`,
        [txn_id, businessId, orderId, paymentAmount, `Subsequent payment for order ${orderId}`]
      );

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    return this.getOrderById(orderId, businessId);
  }

  static async getUnpaidSummary(businessId) {
    // Postgres can't reference a SELECT-list alias (total_owed) inside HAVING —
    // unlike SQLite, which is lenient about this — so the full expression is
    // repeated here instead of the original `HAVING total_owed > 0`.
    const { rows } = await query(
      `SELECT 
        r.retailer_id,
        r.name AS retailer_name,
        r.contact_phone,
        COUNT(o.order_id) AS unpaid_orders_count,
        SUM(o.total_amount - o.amount_paid) AS total_owed
      FROM dispatch_order o
      JOIN retailer r ON o.retailer_id = r.retailer_id
      WHERE o.business_id = $1 AND o.status IN ('owes', 'partial')
      GROUP BY r.retailer_id, r.name, r.contact_phone
      HAVING SUM(o.total_amount - o.amount_paid) > 0
      ORDER BY total_owed DESC`,
      [businessId]
    );
    return rows;
  }
}

module.exports = OrderService;