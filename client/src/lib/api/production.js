import { apiFetch } from './client.js'

export const getRecipes = () => apiFetch('/api/production/recipes')
export const logProductionRun = (payload) =>
  apiFetch('/api/production/log', { method: 'POST', body: JSON.stringify(payload) })
