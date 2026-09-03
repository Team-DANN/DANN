// PATH: src/lib/api/orders.js
import { apiFetch } from '../apiClient.js'

export async function getOrders(filter = {}) {
  const params = new URLSearchParams()
  if (filter.retailer_id) params.set('retailer_id', filter.retailer_id)
  if (filter.status) params.set('status', filter.status)
  const qs = params.toString() ? `?${params}` : ''
  const res = await apiFetch(`/api/orders${qs}`)
  return res.data
}

export async function getUnpaidSummary() {
  const res = await apiFetch('/api/orders/unpaid-summary')
  return res.data
}

// Matches createOrderSchema exactly — one product per order, no client-sent
// total. The backend derives `amount` from product.selling_price * quantity,
// so don't try to pass a total in; it isn't accepted and would be dropped
// by zod anyway.
export async function createOrder({ retailerId, productId, quantity, amountPaid }) {
  const res = await apiFetch('/api/orders', {
    method: 'POST',
    body: JSON.stringify({
      retailer_id: retailerId,
      product_id: productId,
      quantity,
      amount_paid: amountPaid ?? 0,
    }),
  })
  return res.data
}

export async function recordPayment(orderId, amount) {
  const res = await apiFetch(`/api/orders/${orderId}/payment`, {
    method: 'POST',
    body: JSON.stringify({ amount }),
  })
  return res.data
}