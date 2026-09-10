// PATH: src/lib/api/inventory.js
import { apiFetch } from '../apiClient.js'

export async function getMaterials() {
  const res = await apiFetch('/api/materials')
  return res.data
}

export async function getLowStockMaterials() {
  const res = await apiFetch('/api/materials/low-stock')
  return res.data
}

export async function createMaterial(payload) {
  const res = await apiFetch('/api/materials', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return res.data
}

export async function deleteMaterial(materialId, { force = false } = {}) {
  const qs = force ? '?force=true' : ''
  return apiFetch(`/api/materials/${materialId}${qs}`, { method: 'DELETE' })
}

export async function restockMaterial(materialId, { quantity_added, cost }) {
  const res = await apiFetch(`/api/materials/${materialId}/restock`, {
    method: 'POST',
    body: JSON.stringify({ quantity_added, cost }),
  })
  return res.data
}