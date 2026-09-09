import { useCallback, useEffect, useState } from 'react'
import { getProducts } from '../../../lib/api/production.js'

// Replaces extendedProductCatalog (mock). Shape returned by GET /api/products
// is the flat product row from ProductModel — { id, name, category, unit,
// selling_price, current_stock, image_url, cost_per_unit, ... }. There is
// NO `recipe` array on this object (see the TODO in lib/api/production.js —
// no GET recipe route exists yet), so anything downstream that needs a
// recipe (AddProductFlow suggestions, ConfirmProduction's consumption calc)
// still has to source it separately until that route exists.
export function useProducts() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getProducts()
      setProducts(data ?? [])
    } catch (err) {
      setError(err.message || 'Failed to load products')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return { products, loading, error, refetch: load }
}