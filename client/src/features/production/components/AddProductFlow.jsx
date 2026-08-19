import { useState } from 'react'
import { ArrowLeft, Sparkles } from 'lucide-react'
import ProductTile from './ProductTile.jsx'
import { verticalOptions, suggestedProductsByVertical } from '../data/productionMock.js'

// AI-suggests, user just picks & confirms — no BOM editing here by design.
// Real version: suggestions come from an LLM call through agents/, scoped to
// materials the owner already stocks. Editing a recipe afterward is a
// separate, later flow (BOMEditor), not a gate in front of adding a product.
export default function AddProductFlow({ knownVertical, onBack, onAdd }) {
  const [vertical, setVertical] = useState(knownVertical ?? null)

  if (!vertical) {
    return (
      <div className="flex flex-col gap-6">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-medium text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
        >
          <ArrowLeft size={16} strokeWidth={2} />
          Back
        </button>

        <div>
          <h2 className="font-sans text-lg font-semibold text-[var(--color-ink)]">
            What kind of products do you make?
          </h2>
          <p className="text-sm text-[var(--color-ink-muted)]">
            We'll suggest products to add based on this.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {verticalOptions.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setVertical(v.id)}
              className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-paper-light)] p-5 text-sm font-medium text-[var(--color-ink)] shadow-sm active:bg-[var(--color-paper)]"
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>
    )
  }

  const suggestions = suggestedProductsByVertical[vertical] ?? []

  return (
    <div className="flex flex-col gap-6">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-2 text-sm font-medium text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
      >
        <ArrowLeft size={16} strokeWidth={2} />
        Back
      </button>

      <div className="flex items-center gap-2">
        <Sparkles size={18} strokeWidth={2} className="text-[var(--color-stamp)]" />
        <h2 className="font-sans text-lg font-semibold text-[var(--color-ink)]">
          Suggested for your business
        </h2>
      </div>

      {suggestions.length === 0 ? (
        <p className="text-sm text-[var(--color-ink-muted)]">
          No suggestions yet for this type — you can still add products manually from Settings.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {suggestions.map((product) => (
            <ProductTile
              key={product.name}
              product={product}
              accent
              onClick={() => onAdd({ ...product, id: product.name.toLowerCase().replace(/\s+/g, '-') })}
            />
          ))}
        </div>
      )}

      <p className="text-xs text-[var(--color-ink-muted)]">
        Tap a product to add it with a starting recipe — you can fine-tune quantities later in Settings.
      </p>
    </div>
  )
}
