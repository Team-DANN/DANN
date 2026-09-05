// PATH: src/lib/api/production.js
import { apiFetch } from '../apiClient.js'

export async function getProducts() {
  const res = await apiFetch('/api/products')
  return res.data
}

// GET /api/products/:id returns the product row with a real `recipe` array
// attached (ProductService.getAllProducts/getProductById join RecipeModel
// server-side) — { materialId, qtyPerUnit, material_name, material_unit, ... }
// per ingredient. Nothing mocked here.
export async function getProduct(productId) {
  const res = await apiFetch(`/api/products/${productId}`)
  return res.data
}

export async function createProduct(payload) {
  const res = await apiFetch('/api/products', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return res.data
}

// Matches createBatchSchema exactly: { product_id, quantity_produced,
// labor_cost? }. Previously the call site sent `quantity` instead of
// `quantity_produced`, which zod correctly rejected with a 400
// ("quantity_produced: Required") — translated here the same way
// orders.js/retailers.js translate camelCase call-site args into the
// backend's real snake_case field names.
export async function logProduction({ productId, quantityProduced, laborCost }) {
  const res = await apiFetch('/api/batches', {
    method: 'POST',
    body: JSON.stringify({
      product_id: productId,
      quantity_produced: quantityProduced,
      labor_cost: laborCost ?? 0,
    }),
  })
  return res.data
}