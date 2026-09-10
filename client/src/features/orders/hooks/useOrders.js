// PATH: src/features/orders/hooks/useOrders.js
import { useCallback, useEffect, useState } from 'react'
import { getOrders } from '../../../lib/api/orders.js'

export function useOrders(filter) {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setOrders((await getOrders(filter)) ?? [])
    } catch (err) {
      setError(err.message || 'Failed to load orders')
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter?.retailer_id, filter?.status])

  useEffect(() => { load() }, [load])

  return { orders, loading, error, refetch: load }
}