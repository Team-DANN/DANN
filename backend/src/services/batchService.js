const { getDb } = require('../db/database');
const ProductModel = require('../models/ProductModel');
const RecipeModel = require('../models/RecipeModel');
const MaterialModel = require('../models/MaterialModel');
const AlertService = require('./alertService');

class BatchService {
  static getBatches(businessId, limit = 50) {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT 
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
      WHERE pl.business_id = ?
      ORDER BY pl.produced_at DESC
      LIMIT ?
    `);
    const batches = stmt.all(businessId, limit);
    return batches.map(b => ({
      ...b,
      materials_consumed: b.materials_consumed ? JSON.parse(b.materials_consumed) : [],
    }));
  }

  static getBatchById(batchId, businessId) {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT 
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
      WHERE pl.production_id = ? AND pl.business_id = ?
    `);
    const batch = stmt.get(batchId, businessId);
    if (!batch) {
      const err = new Error(`Production batch '${batchId}' not found`);
      err.status = 404;
      throw err;
    }

    const usagesStmt = db.prepare(`
      SELECT 
        bmu.usage_id,
        bmu.material_id,
        m.name AS material_name,
        m.unit AS material_unit,
        bmu.quantity_used,
        bmu.cost_per_unit_snapshot,
        (bmu.quantity_used * bmu.cost_per_unit_snapshot) AS line_cost
      FROM batch_material_usage bmu
      JOIN material m ON bmu.material_id = m.material_id
      WHERE bmu.production_id = ?
    `);
    const usages = usagesStmt.all(batchId);

    return {
      ...batch,
      materials_consumed: batch.materials_consumed ? JSON.parse(batch.materials_consumed) : [],
      material_usage_details: usages,
    };
  }

  /**
   * ATOMIC BATCH EXECUTION:
   * 1. Validates product & recipe items.
   * 2. Checks material stock sufficiency (Rolls back if stock insufficient).
   * 3. Single DB transaction:
   *    a) Save production_log record
   *    b) Deduct raw materials & snapshot material cost in batch_material_usage
   *    c) Increment finished product stock
   * 4. Sync low stock alerts for consumed materials.
   */
  static recordProduction(batchData, businessId, loggedBy = 'user_default') {
    const { product_id, quantity_produced, labor_cost = 0, manual_material_cost = null } = batchData;

    if (!product_id || !quantity_produced || quantity_produced <= 0) {
      const err = new Error('product_id and a positive quantity_produced are required');
      err.status = 400;
      throw err;
    }

    const product = ProductModel.getById(product_id, businessId);
    if (!product) {
      const err = new Error(`Product '${product_id}' not found`);
      err.status = 404;
      throw err;
    }

    const recipe = RecipeModel.getByProductId(product_id, businessId);
    const db = getDb();
    const production_id = `batch_${Date.now()}`;
    const consumedList = [];
    let totalMaterialCost = 0;

    // Check material stock sufficiency first
    if (recipe.length > 0) {
      for (const item of recipe) {
        const requiredQty = item.qtyPerUnit * quantity_produced;
        const material = MaterialModel.getById(item.material_id, businessId);

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

    db.exec('BEGIN TRANSACTION;');
    try {
      // 1. Insert parent production_log record
      const insertLog = db.prepare(`
        INSERT INTO production_log (production_id, business_id, product_id, quantity_produced, labor_cost, total_material_cost, materials_consumed, logged_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      insertLog.run(
        production_id,
        businessId,
        product_id,
        quantity_produced,
        labor_cost,
        totalMaterialCost,
        JSON.stringify(consumedList),
        loggedBy
      );

      // 2. Process material stock deductions and usage details
      if (recipe.length > 0) {
        const deductStmt = db.prepare(`
          UPDATE material
          SET current_stock = current_stock - ?
          WHERE material_id = ? AND business_id = ?
        `);
        const insertUsage = db.prepare(`
          INSERT INTO batch_material_usage (usage_id, production_id, material_id, quantity_used, cost_per_unit_snapshot)
          VALUES (?, ?, ?, ?, ?)
        `);

        for (const item of consumedList) {
          deductStmt.run(item.quantity_used, item.material_id, businessId);
          const usage_id = `bmu_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          insertUsage.run(usage_id, production_id, item.material_id, item.quantity_used, item.unit_cost_snapshot);
        }
      }

      // 3. Add produced quantity to finished product stock
      const addProductStock = db.prepare(`
        UPDATE product
        SET current_stock = current_stock + ?
        WHERE product_id = ? AND business_id = ?
      `);
      addProductStock.run(quantity_produced, product_id, businessId);

      db.exec('COMMIT;');
    } catch (err) {
      db.exec('ROLLBACK;');
      throw err;
    }

    // Check & sync low stock alerts after committed stock deduction
    if (recipe.length > 0) {
      for (const item of consumedList) {
        const updatedMaterial = MaterialModel.getById(item.material_id, businessId);
        if (updatedMaterial) {
          AlertService.syncMaterialStockAlert(updatedMaterial, businessId);
        }
      }
    }

    return this.getBatchById(production_id, businessId);
  }
}

module.exports = BatchService;
