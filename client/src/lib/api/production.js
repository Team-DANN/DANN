// PATH: src/lib/api/production.js
import { apiFetch } from '../apiClient.js'

export async function getProducts() {
  const res = await apiFetch('/api/products')
  return res.data
}

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

export async function deleteProduct(productId) {
  return apiFetch(`/api/products/${productId}`, { method: 'DELETE' })
}

// Returns the logged batch, including its `id`, so the Done screen can undo it.
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

// Latest 50 batches for the business. Each carries `can_edit`.
export async function getBatches() {
  const res = await apiFetch('/api/batches')
  return res.data
}

// One batch with `material_usage_details` (the ingredient lines).
export async function getBatch(batchId) {
  const res = await apiFetch(`/api/batches/${batchId}`)
  return res.data
}

// Edit history, newest first: [{ edit_id, edited_at, edited_by_name, before_data, after_data }]
export async function getBatchHistory(batchId) {
  const res = await apiFetch(`/api/batches/${batchId}/history`)
  return res.data
}

// patch: any of quantity_produced, labor_cost, manual_material_cost,
// materials: [{ material_id, quantity_used }] (the COMPLETE new list).
export async function updateBatch(batchId, patch) {
  const res = await apiFetch(`/api/batches/${batchId}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
  return res.data
}

// Real reversal: ingredients go back to stock, finished stock comes out.
// Refused with 409 if any of it was already dispatched.
export async function undoBatch(batchId) {
  return apiFetch(`/api/batches/${batchId}`, { method: 'DELETE' })
}