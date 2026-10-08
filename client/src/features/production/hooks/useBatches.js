import { useCallback, useEffect, useState } from 'react'
import { getBatches } from '../../../lib/api/production.js'

export function useBatches() {
  const [batches, setBatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refetch = useCallback(async () => {
    try {
      setError('')
      setBatches(await getBatches())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { batches, loading, error, refetch }
}