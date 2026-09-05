// PATH: src/features/production/components/ProductPicker.jsx
import { useMemo, useState } from 'react'
import { Search, Plus, Loader2 } from 'lucide-react'
import ProductTile from './ProductTile.jsx'
import VoiceLogButton from './VoiceLogButton.jsx'
import { useProgressiveReveal } from '../../../lib/hooks/useProgressiveReveal.js'

// Pure display component now — no longer self-fetches as a fallback.
// Every real call site (ProductionPlannerPage, LogDispatchFlow) always
// passes `products`/`loading`/`error` from its own useProducts() call, so
// there's exactly one fetch per page, not a hidden second one in here.
export default function ProductPicker({ products, loading = false, error = null, onSelect, onAddProduct, onRetry }) {
  const [query, setQuery] = useState('')

  const catalog = products ?? []

  const searchResults = useMemo(() => {
    if (!query.trim()) return null
    const q = query.trim().toLowerCase()
    return catalog.filter((p) => p.name.toLowerCase().includes(q))
  }, [catalog, query])

  const { visible, hasMore, remaining, showMore, reset } = useProgressiveReveal(catalog, {
    initial: 8,
    increment: 10,
  })

  const visibleProducts = searchResults ?? visible

  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      <VoiceLogButton />

      <div className="relative">
        <Search size={16} strokeWidth={2} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)] lg:left-4 lg:h-[18px] lg:w-[18px]" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            reset()
          }}
          placeholder="Search products…"
          className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] py-2.5 pl-9 pr-3 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:border-[var(--color-stamp)] focus:outline-none lg:py-3.5 lg:pl-11 lg:pr-4 lg:text-base"
        />
      </div>

      {!query.trim() && (
        <p className="text-xs text-[var(--color-ink-muted)] lg:text-sm">Your products</p>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-[var(--color-ink-muted)] lg:text-base">
          <Loader2 size={18} strokeWidth={2} className="animate-spin" />
          Loading products…
        </div>
      ) : error ? (
        <div className="flex items-center justify-between rounded-xl border border-[var(--color-error)] bg-[var(--color-paper-light)] px-4 py-3 text-sm text-[var(--color-error)]">
          <span>Couldn't load products. {error}</span>
          {onRetry && (
            <button onClick={onRetry} className="font-semibold underline">Retry</button>
          )}
        </div>
      ) : visibleProducts.length === 0 && query.trim() ? (
        <p className="py-6 text-center text-sm text-[var(--color-ink-muted)] lg:py-8 lg:text-base">
          No products match "{query}"
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:gap-4">
            {visibleProducts.map((product) => (
              <ProductTile key={product.id} product={product} onClick={() => onSelect(product)} />
            ))}

            {!query.trim() && (
              <button
                type="button"
                onClick={onAddProduct}
                className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--color-border)] p-5 text-[var(--color-ink-muted)] hover:border-[var(--color-stamp)] hover:text-[var(--color-stamp)] lg:gap-3 lg:p-7"
              >
                <Plus size={28} strokeWidth={2} className="lg:h-9 lg:w-9" />
                <span className="text-center text-sm font-medium lg:text-base">Add product</span>
              </button>
            )}

            {!query.trim() && catalog.length === 0 && (
              <p className="col-span-full py-6 text-center text-sm text-[var(--color-ink-muted)] lg:py-8 lg:text-base">
                No products yet — tap "Add product" to get started.
              </p>
            )}
          </div>

          {!query.trim() && hasMore && (
            <button
              type="button"
              onClick={showMore}
              className="text-center text-sm font-medium text-[var(--color-stamp)] lg:text-base"
            >
              View more ({Math.min(remaining, 10)} more)
            </button>
          )}
        </>
      )}
    </div>
  )
}