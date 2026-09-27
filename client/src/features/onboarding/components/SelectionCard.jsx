// PATH: src/features/onboarding/components/SelectionCard.jsx
import React from 'react'
import { Check } from 'lucide-react'

export default function SelectionCard({
  icon: Icon,
  title,
  description,
  badge,
  selected,
  onSelect,
  className = '',
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group relative flex w-full cursor-pointer items-start gap-3.5 rounded-xl border p-4 text-left ${
        selected
          ? 'border-[var(--color-stamp)] bg-[var(--color-stamp)]/5 shadow-2xs'
          : 'border-[var(--color-border)] bg-[var(--color-paper-light)] hover:border-[var(--color-stamp)]/50 hover:bg-[var(--color-paper)]/40'
      } ${className}`}
    >
      {/* Icon or check indicator */}
      {Icon && (
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border transition-colors ${
            selected
              ? 'border-[var(--color-stamp)] bg-[var(--color-stamp)] text-white'
              : 'border-[var(--color-border)] bg-[var(--color-paper)] text-[var(--color-ink-muted)] group-hover:text-[var(--color-ink)]'
          }`}
        >
          <Icon size={20} strokeWidth={2} />
        </div>
      )}

      {/* Main card text */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="font-sans text-sm font-bold text-[var(--color-ink)]">
            {title}
          </span>
          {badge && (
            <span className="rounded-full bg-[var(--color-stamp)]/10 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide text-[var(--color-stamp)] border border-[var(--color-stamp)]/20">
              {badge}
            </span>
          )}
        </div>
        {description && (
          <p className="mt-1 text-xs text-[var(--color-ink-muted)] leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {/* Checkmark radio indicator */}
      <div
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
          selected
            ? 'border-[var(--color-stamp)] bg-[var(--color-stamp)] text-white'
            : 'border-[var(--color-border)] bg-transparent'
        }`}
      >
        {selected && <Check size={12} strokeWidth={3} />}
      </div>
    </button>
  )
}
