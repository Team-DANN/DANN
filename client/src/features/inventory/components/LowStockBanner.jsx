import { AlertTriangle } from 'lucide-react'

export default function LowStockBanner({ count, onViewAll }) {
  return (
    <button
      type="button"
      onClick={onViewAll}
      className="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-error)] bg-[var(--color-paper-light)] px-4 py-3 text-left"
    >
      <div className="flex items-center gap-2">
        <AlertTriangle size={18} strokeWidth={2} className="text-[var(--color-error)]" />
        <span className="text-sm font-medium text-[var(--color-ink)]">
          {count} {count === 1 ? 'material needs' : 'materials need'} attention
        </span>
      </div>
      <span className="text-xs font-medium text-[var(--color-error)] underline">View all</span>
    </button>
  )
}