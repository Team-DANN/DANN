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