//orderService.js
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
   * 1. Single DB transaction on one checked-out client, product row LOCKED
   *    with SELECT ... FOR UPDATE for the duration:
   *    a) Re-reads current_stock + selling_price under the lock — this is
   *       the number that's actually trusted, not the pre-transaction read.
   *    b) Checks stock sufficiency against that locked read.
   *    c) Deducts finished product stock.
   *    d) Inserts order into dispatch_order.
   *    e) Derives status (paid, partial, owes).
   *    f) Records initial payment in finance table if amount_paid > 0.
   *
   * Concurrency note: previously the stock check ran on a plain read from
   * the shared pool *before* BEGIN, then the deduction happened inside the
   * transaction. Two requests for the same product arriving close together
   * could both pass the check before either committed, over-deducting stock
   * below zero. FOR UPDATE makes the second request block until the first
   * commits, then it re-reads the post-deduction stock and checks against
   * that — so a legitimate "insufficient stock" rejection can now happen on
   * the *second* concurrent tap even though it looked fine when the person
   * tapped it, which is correct: the stock really was gone by the time it
   * was that request's turn.
   */
  static async createOrder(orderData, businessId) {
    const { retailer_id, product_id, quantity, amount_paid = 0 } = orderData;

    if (!retailer_id || !product_id || !quantity || quantity <= 0) {
      const err = new Error('retailer_id, product_id, and positive quantity are required');
      err.status = 400;
      throw err;
    }

    const order_id = `ord_${Date.now()}`;

    const client = await getClient();
    try {
      await client.query('BEGIN');

      // Lock the product row for the rest of this transaction so a
      // concurrent order for the same product has to wait its turn.
      const { rows: productRows } = await client.query(
        `SELECT product_id, name, selling_price, current_stock
        FROM product
        WHERE product_id = $1 AND business_id = $2
        FOR UPDATE`,
        [product_id, businessId]
      );
      const product = productRows[0];
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

  /**
   * Returns unpaid/partial orders that are past their retailer's credit
   * window — the actual server-side definition of "overdue", used to drive
   * real payment_overdue alerts. Mirrors the logic in the frontend's
   * useReceivablesSummary.js isOverdue(), but resolved per-retailer using
   * parseCreditDays(retailer.credit_terms) instead of a flat client-side
   * default, since the backend has access to the real credit_terms text.
   */
  static async getOverdueOrders(businessId) {
    const { parseCreditDays } = require('../utils/creditTerms');

    const { rows } = await query(
      `SELECT 
        o.order_id,
        o.business_id,
        o.retailer_id,
        r.name AS retailer_name,
        r.credit_terms,
        o.product_id,
        o.quantity,
        o.total_amount,
        o.amount_paid,
        o.status,
        o.dispatched_at
      FROM dispatch_order o
      JOIN retailer r ON o.retailer_id = r.retailer_id
      WHERE o.business_id = $1 AND o.status IN ('owes', 'partial')`,
      [businessId]
    );

    const now = new Date();
    return rows.filter((o) => {
      const creditDays = parseCreditDays(o.credit_terms);
      const dueDate = new Date(o.dispatched_at);
      dueDate.setDate(dueDate.getDate() + creditDays);
      return now > dueDate;
    });
  }
}

module.exports = OrderService;