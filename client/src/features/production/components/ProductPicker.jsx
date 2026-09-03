import { useMemo, useState } from 'react'
import { Search, Plus } from 'lucide-react'
import ProductTile from './ProductTile.jsx'
import VoiceLogButton from './VoiceLogButton.jsx'
import { extendedProductCatalog, topProductIds } from '../data/productionMock.js'

// Default view stays small (top N by usage) so the screen never overwhelms —
// full catalog only loads in once the person actually searches for it.
// Real version: topProductIds ranked server-side by production frequency,
// search hits a paginated DB query instead of filtering an in-memory array.
export default function ProductPicker({ products, onSelect, onVoiceConfirm, onAddProduct }) {
  const [query, setQuery] = useState('')

  const catalog = products ?? extendedProductCatalog

  const topProducts = useMemo(
    () => topProductIds.map((id) => catalog.find((p) => p.id === id)).filter(Boolean),
    [catalog]
  )

  const searchResults = useMemo(() => {
    if (!query.trim()) return null
    const q = query.trim().toLowerCase()
    return catalog.filter((p) => p.name.toLowerCase().includes(q))
  }, [catalog, query])

  const visibleProducts = searchResults ?? topProducts

  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      <VoiceLogButton onConfirm={onVoiceConfirm} />

      <div className="relative">
        <Search
          size={16}
          strokeWidth={2}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)] lg:left-4 lg:h-[18px] lg:w-[18px]"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search products…"
          className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] py-2.5 pl-9 pr-3 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:border-[var(--color-stamp)] focus:outline-none lg:py-3.5 lg:pl-11 lg:pr-4 lg:text-base"
        />
      </div>

      {!query.trim() && (
        <p className="text-xs text-[var(--color-ink-muted)] lg:text-sm">Your most-made products</p>
      )}

      {visibleProducts.length === 0 ? (
        <p className="py-6 text-center text-sm text-[var(--color-ink-muted)] lg:py-8 lg:text-base">
          No products match "{query}"
        </p>
      ) : (
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
        </div>
      )}
    </div>
  )
}