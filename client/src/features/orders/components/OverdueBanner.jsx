import { AlertTriangle } from 'lucide-react'
import { useAuth } from '../../../context/AuthContext.jsx'

export default function OverdueBanner({ count, amount, onViewAll }) {
  const { user } = useAuth()
  const currency = user?.currency || '₹'

  return (
    <button
      type="button"
      onClick={onViewAll}
      className="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-error)] bg-[var(--color-paper-light)] px-4 py-3 text-left lg:px-6 lg:py-4"
    >
      <div className="flex items-center gap-2 lg:gap-3">
        <AlertTriangle size={18} strokeWidth={2} className="text-[var(--color-error)] lg:h-5 lg:w-5" />
        <span className="text-sm font-medium text-[var(--color-ink)] lg:text-base">
          {currency}{amount} overdue from {count} {count === 1 ? 'retailer' : 'retailers'}
        </span>
      </div>
      <span className="text-xs font-medium text-[var(--color-error)] underline lg:text-sm">View all</span>
    </button>
  )
}