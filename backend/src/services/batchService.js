//batch Service
const { query, getClient } = require('../db/database');
const ProductModel = require('../models/ProductModel');
const RecipeModel = require('../models/RecipeModel');
const MaterialModel = require('../models/MaterialModel');
const AlertService = require('./alertService');

class BatchService {
  static async getBatches(businessId, limit = 50) {
    const { rows } = await query(
      `SELECT 
        pl.production_id AS id,
        pl.production_id,
        pl.business_id,
        pl.product_id,
        p.name AS product_name,
        pl.quantity_produced,
        pl.labor_cost,
        pl.total_material_cost,
        pl.materials_consumed,
        pl.produced_at,
        pl.logged_by
      FROM production_log pl
      JOIN product p ON pl.product_id = p.product_id
      WHERE pl.business_id = $1
      ORDER BY pl.produced_at DESC
      LIMIT $2`,
      [businessId, limit]
    );
    return rows.map(b => ({
      ...b,
      materials_consumed: b.materials_consumed ? JSON.parse(b.materials_consumed) : [],
    }));
  }

  static async getBatchById(batchId, businessId) {
    const { rows } = await query(
      `SELECT 
        pl.production_id AS id,
        pl.production_id,
        pl.business_id,
        pl.product_id,
        p.name AS product_name,
        pl.quantity_produced,
        pl.labor_cost,
        pl.total_material_cost,
        pl.materials_consumed,
        pl.produced_at,
        pl.logged_by
      FROM production_log pl
      JOIN product p ON pl.product_id = p.product_id
      WHERE pl.production_id = $1 AND pl.business_id = $2`,
      [batchId, businessId]
    );
    const batch = rows[0];
    if (!batch) {
      const err = new Error(`Production batch '${batchId}' not found`);
      err.status = 404;
      throw err;
    }

    const { rows: usages } = await query(
      `SELECT 
        bmu.usage_id,
        bmu.material_id,
        m.name AS material_name,
        m.unit AS material_unit,
        bmu.quantity_used,
        bmu.cost_per_unit_snapshot,
        (bmu.quantity_used * bmu.cost_per_unit_snapshot) AS line_cost
      FROM batch_material_usage bmu
      JOIN material m ON bmu.material_id = m.material_id
      WHERE bmu.production_id = $1`,
      [batchId]
    );

    return {
      ...batch,
      materials_consumed: batch.materials_consumed ? JSON.parse(batch.materials_consumed) : [],
      material_usage_details: usages,
    };
  }

  /**
   * ATOMIC BATCH EXECUTION:
   * 1. Validates product & recipe items.
   * 2. Checks material stock sufficiency (throws if insufficient — nothing
   *    written yet at that point).
   * 3. Single DB transaction on one checked-out client:
   *    a) Save production_log record
   *    b) Deduct raw materials & snapshot material cost in batch_material_usage
   *    c) Increment finished product stock
   * 4. Sync low stock alerts for consumed materials (after commit).
   *
   * NOTE ON CONCURRENCY: the stock-sufficiency check reads material rows
   * before BEGIN, then deducts them inside the transaction. Under SQLite's
   * single-connection model this was effectively atomic. Under Postgres with
   * a connection pool, two concurrent requests for the same material could
   * both pass the check before either commits, potentially over-deducting
   * stock below zero. If concurrent batch recording is expected in
   * production, consider `SELECT ... FOR UPDATE` on the material rows inside
   * the transaction, or a CHECK constraint that stock can't go negative.
   */
  static async recordProduction(batchData, businessId, loggedBy = 'user_default') {
    const { product_id, quantity_produced, labor_cost = 0, manual_material_cost = null } = batchData;

    if (!product_id || !quantity_produced || quantity_produced <= 0) {
      const err = new Error('product_id and a positive quantity_produced are required');
      err.status = 400;
      throw err;
    }

    const product = await ProductModel.getById(product_id, businessId);
    if (!product) {
      const err = new Error(`Product '${product_id}' not found`);
      err.status = 404;
      throw err;
    }

    const recipe = await RecipeModel.getByProductId(product_id, businessId);
    const production_id = `batch_${Date.now()}`;
    const consumedList = [];
    let totalMaterialCost = 0;

    // Check material stock sufficiency first (reads only, fine on the shared pool)
    if (recipe.length > 0) {
      for (const item of recipe) {
        const requiredQty = item.qtyPerUnit * quantity_produced;
        const material = await MaterialModel.getById(item.material_id, businessId);

        if (!material) {
          throw new Error(`Material '${item.material_id}' not found`);
        }

        if (material.current_stock < requiredQty) {
          const err = new Error(`Insufficient stock for material '${material.name}'. Required: ${requiredQty} ${material.unit}, Available: ${material.current_stock} ${material.unit}`);
          err.status = 400;
          throw err;
        }

        const lineCost = requiredQty * material.unit_cost;
        totalMaterialCost += lineCost;
        consumedList.push({
          material_id: item.material_id,
          name: material.name,
          unit: material.unit,
          quantity_used: requiredQty,
          unit_cost_snapshot: material.unit_cost,
          total_line_cost: lineCost,
        });
      }
    } else {
      totalMaterialCost = manual_material_cost || 0;
    }

    // All writes go through one checked-out client so the transaction is real —
    // calling the *Model helpers here would each grab a different pooled
    // connection and silently escape the transaction.
    const client = await getClient();
    try {
      await client.query('BEGIN');

      // 1. Insert parent production_log record
      await client.query(
        `INSERT INTO production_log (production_id, business_id, product_id, quantity_produced, labor_cost, total_material_cost, materials_consumed, logged_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [production_id, businessId, product_id, quantity_produced, labor_cost, totalMaterialCost, JSON.stringify(consumedList), loggedBy]
      );

      // 2. Process material stock deductions and usage details
      if (recipe.length > 0) {
        for (const item of consumedList) {
          await client.query(
            `UPDATE material
            SET current_stock = current_stock - $1
            WHERE material_id = $2 AND business_id = $3`,
            [item.quantity_used, item.material_id, businessId]
          );
          const usage_id = `bmu_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          await client.query(
            `INSERT INTO batch_material_usage (usage_id, production_id, material_id, quantity_used, cost_per_unit_snapshot)
            VALUES ($1, $2, $3, $4, $5)`,
            [usage_id, production_id, item.material_id, item.quantity_used, item.unit_cost_snapshot]
          );
        }
      }

      // 3. Add produced quantity to finished product stock
      await client.query(
        `UPDATE product
        SET current_stock = current_stock + $1
        WHERE product_id = $2 AND business_id = $3`,
        [quantity_produced, product_id, businessId]
      );

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    // Check & sync low stock alerts after committed stock deduction
    if (recipe.length > 0) {
      for (const item of consumedList) {
        const updatedMaterial = await MaterialModel.getById(item.material_id, businessId);
        if (updatedMaterial) {
          await AlertService.syncMaterialStockAlert(updatedMaterial, businessId);
        }
      }
    }

    return this.getBatchById(production_id, businessId);
  }
}

module.exports = BatchService;