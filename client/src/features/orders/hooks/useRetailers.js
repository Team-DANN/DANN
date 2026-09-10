// PATH: src/features/orders/hooks/useRetailers.js
import { useCallback, useEffect, useState } from 'react'
import { getRetailers } from '../../../lib/api/retailers.js'

export function useRetailers() {
  const [retailers, setRetailers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRetailers((await getRetailers()) ?? [])
    } catch (err) {
      setError(err.message || 'Failed to load retailers')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return { retailers, loading, error, refetch: load }
}