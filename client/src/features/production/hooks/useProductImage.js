import { useEffect, useState } from 'react'

// Reads the product name, then asks Pexels for a matching photo.
// GET https://api.pexels.com/v1/search?query=<product name>&per_page=1
//
// Pexels license: free for commercial use, no attribution required
// (https://www.pexels.com/license/) — the simplest fit for a paid app.
//
// SECURITY NOTE: never put the real API key directly in client code that
// ships to users — anyone can read it out of the bundle and use up your
// quota. For real use, proxy this through backend/ (a small route like
// GET /api/product-photo?query=...) that holds the key server-side and
// calls Pexels on the client's behalf. VITE_PEXELS_API_KEY below is only
// safe for local dev, not production.
const PEXELS_API_KEY = import.meta.env.VITE_PEXELS_API_KEY
const PEXELS_ENDPOINT = 'https://api.pexels.com/v1/search'

// Simple in-memory cache so switching screens doesn't re-fetch the same
// product photo repeatedly.
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
    if (!PEXELS_API_KEY) {
      // No key configured — fall back silently, caller shows the icon placeholder instead.
      setStatus('error')
      return
    }

    let cancelled = false
    setStatus('loading')

    fetch(`${PEXELS_ENDPOINT}?query=${encodeURIComponent(query)}&per_page=1`, {
      headers: { Authorization: PEXELS_API_KEY },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Pexels request failed: ${res.status}`)
        return res.json()
      })
      .then((data) => {
        if (cancelled) return
        const photo = data.photos?.[0]?.src?.medium ?? null
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