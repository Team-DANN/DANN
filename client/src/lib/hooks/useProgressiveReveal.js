// PATH: src/lib/hooks/useProgressiveReveal.js
import { useMemo, useState } from 'react'

// Shared "show a reasonable number, then reveal ~10 more per tap" pattern.
// Purely a display cap over an already-fetched list — it never fetches
// more from the backend, so "View more" can't accidentally open the rest
// of the database. Call `reset()` whenever the underlying filter changes
// (new search query, new status filter) so the cap doesn't stay stuck open.
export function useProgressiveReveal(items, { initial = 8, increment = 10 } = {}) {
  const [count, setCount] = useState(initial)

  const visible = useMemo(() => items.slice(0, count), [items, count])
  const hasMore = items.length > visible.length
  const remaining = items.length - visible.length

  function showMore() {
    setCount((c) => c + increment)
  }

  function reset() {
    setCount(initial)
  }

  return { visible, hasMore, remaining, showMore, reset }
}