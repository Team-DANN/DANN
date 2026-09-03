// PATH: src/features/inventory/hooks/useMaterials.js
import { useCallback, useEffect, useState } from 'react'
import { getMaterials } from '../../../lib/api/inventory.js'

export function useMaterials() {
  const [materials, setMaterials] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setMaterials((await getMaterials()) ?? [])
    } catch (err) {
      setError(err.message || 'Failed to load materials')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return { materials, loading, error, refetch: load }
}