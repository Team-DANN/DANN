// PATH: src/lib/api/production.js
import { apiFetch } from '../apiClient.js'

export async function getProducts() {
  const res = await apiFetch('/api/products')
  return res.data
}

// NOTE: no dedicated GET recipe route exists yet — backend only has
// PUT /:id/recipe (update) and GET /:id (product, no recipe array in the
// controller's select). Ask your teammate for GET /api/products/:id/recipe,
// or have ProductController.getById join the recipe table.
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

export async function logProduction(payload) {
  const res = await apiFetch('/api/batches', { method: 'POST', body: JSON.stringify(payload) })
  return res.data
}