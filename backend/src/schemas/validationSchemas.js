const { z } = require('zod');

// Auth Schemas
const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  business_name: z.string().optional(),
  type: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// Material Schemas
const createMaterialSchema = z.object({
  material_id: z.string().optional(),
  name: z.string().min(1, 'Material name is required'),
  unit: z.string().min(1, 'Unit of measure is required'),
  unit_cost: z.number().nonnegative().optional(),
  current_stock: z.number().nonnegative().optional(),
  reorder_threshold: z.number().nonnegative().optional(),
  supplier_name: z.string().nullable().optional(),
});

const updateMaterialSchema = z.object({
  name: z.string().min(1).optional(),
  unit: z.string().min(1).optional(),
  unit_cost: z.number().nonnegative().optional(),
  reorder_threshold: z.number().nonnegative().optional(),
  supplier_name: z.string().nullable().optional(),
});

const restockMaterialSchema = z.object({
  quantity_added: z.number().positive('Quantity added must be a positive number'),
  cost: z.number().nonnegative().optional(),
});

const adjustMaterialSchema = z.object({
  actual_stock: z.number().nonnegative('Actual stock must be non-negative'),
});

// Product Schemas
const createProductSchema = z.object({
  product_id: z.string().optional(),
  name: z.string().min(1, 'Product name is required'),
  category: z.string().optional(),
  unit: z.string().optional(),
  selling_price: z.number().nonnegative(),
  current_stock: z.number().nonnegative().optional(),
  image_url: z.string().nullable().optional(),
  recipe: z.array(
    z.object({
      material_id: z.string().optional(),
      materialId: z.string().optional(),
      qtyPerUnit: z.number().positive().optional(),
      quantity_per_unit: z.number().positive().optional(),
    })
  ).optional(),
});

// Batch Schemas
const createBatchSchema = z.object({
  product_id: z.string().min(1, 'Product ID is required'),
  quantity_produced: z.number().positive('Quantity produced must be positive'),
  labor_cost: z.number().nonnegative().optional(),
  manual_material_cost: z.number().nonnegative().nullable().optional(),
});

// Retailer Schemas
const createRetailerSchema = z.object({
  retailer_id: z.string().optional(),
  name: z.string().min(1, 'Retailer name is required'),
  contact_phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  credit_terms: z.string().nullable().optional(),
});

const updateRetailerSchema = z.object({
  name: z.string().min(1).optional(),
  contact_phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  credit_terms: z.string().nullable().optional(),
});

// Order Schemas
const createOrderSchema = z.object({
  retailer_id: z.string().min(1, 'Retailer ID is required'),
  product_id: z.string().min(1, 'Product ID is required'),
  quantity: z.number().positive('Quantity must be positive'),
  amount_paid: z.number().nonnegative().optional(),
});

const recordPaymentSchema = z.object({
  amount: z.number().positive('Payment amount must be positive'),
});

module.exports = {
  registerSchema,
  loginSchema,
  createMaterialSchema,
  updateMaterialSchema,
  restockMaterialSchema,
  adjustMaterialSchema,
  createProductSchema,
  createBatchSchema,
  createRetailerSchema,
  updateRetailerSchema,
  createOrderSchema,
  recordPaymentSchema,
};
