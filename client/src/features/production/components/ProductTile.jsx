import { Package } from 'lucide-react'
import { useProductImage } from '../hooks/useProductImage.js'

export default function ProductTile({ product, onClick, accent = false }) {
  const { imageUrl, status } = useProductImage(product.name)

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-2 rounded-2xl border p-5 shadow-sm active:bg-[var(--color-paper)] lg:gap-3 lg:p-7 ${
        accent
          ? 'border-[var(--color-stamp)] bg-[var(--color-paper-light)]'
          : 'border-[var(--color-border)] bg-[var(--color-paper-light)]'
      }`}
    >
      {status === 'done' && imageUrl ? (
        <img src={imageUrl} alt={product.name} className="h-16 w-16 rounded-xl object-cover lg:h-24 lg:w-24" />
      ) : (
        // No key configured, request failed, or still loading — a neutral
        // icon placeholder, not an emoji stand-in for the actual product.
        <span className="flex h-16 w-16 items-center justify-center rounded-xl bg-[var(--color-paper)] text-[var(--color-ink-muted)] lg:h-24 lg:w-24">
          <Package size={26} strokeWidth={1.75} className="lg:h-9 lg:w-9" />
        </span>
      )}
      <span className="text-center text-sm font-medium text-[var(--color-ink)] lg:text-base">
        {product.name}
      </span>
    </button>
  )
}