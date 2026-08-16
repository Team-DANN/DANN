import { apiFetch } from './client.js'

export const getInventory = () => apiFetch('/api/inventory')
export const getRunway = (productId) => apiFetch(`/api/inventory/runway/${productId}`)
