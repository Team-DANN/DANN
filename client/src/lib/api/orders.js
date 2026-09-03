import { apiFetch } from './client.js'

export const getOrders = () => apiFetch('/api/orders')
export const getRetailers = () => apiFetch('/api/orders/retailers')
