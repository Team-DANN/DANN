import { useEffect, useState } from 'react'
import { apiFetch } from '../../../lib/apiClient.js'

// Reads the product name, then asks OUR backend for a matching photo —
// GET /api/product-photo?query=<product name> — which the backend
// proxies to Pexels using a server-side-only key. Previously this called
// Pexels directly from the browser with VITE_PEXELS_API_KEY, which ships
// inside the client bundle and is readable by anyone who opens dev tools
// — the key now lives only in the backend's environment (PEXELS_API_KEY,
// no VITE_ prefix, never sent to the client).
const cache = new Map()

export function useProductImage(query) {
  const [imageUrl, setImageUrl] = useState(cache.get(query) ?? null)
  const [status, setStatus] = useState(cache.has(query) ? 'done' : 'idle')

  useEffect(() => {
    if (!query) return
    if (cache.has(query)) {
      setImageUrl(cache.get(query))
      setStatus('done')
      return
    }

    let cancelled = false
    setStatus('loading')

    apiFetch(`/api/product-photo?query=${encodeURIComponent(query)}`)
      .then((res) => {
        if (cancelled) return
        const photo = res?.data?.imageUrl ?? null
        cache.set(query, photo)
        setImageUrl(photo)
        setStatus('done')
      })
      .catch(() => {
        if (cancelled) return
        cache.set(query, null)
        setImageUrl(null)
        setStatus('error')
      })

    return () => {
      cancelled = true
    }
  }, [query])

  return { imageUrl, status }
}