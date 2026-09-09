// PATH: src/features/finance/components/PeriodFilter.jsx

import { useState } from 'react'
import { Calendar } from 'lucide-react'
import { PERIOD_TYPES } from '../hooks/useFinanceSummary.js'

const PRESETS = [
  { type: PERIOD_TYPES.WEEK, label: 'Last 7 days' },
  { type: PERIOD_TYPES.MONTH, label: 'This month' },
  { type: PERIOD_TYPES.YEAR, label: 'This year' },
  { type: PERIOD_TYPES.ALL, label: 'All time' },
]

// Native <input type="month"/"date"> deliberately — no calendar-widget
// dependency, works the same for every age group, and matches the
// no-shadcn / minimal-dependency stance already set for this project.
export default function PeriodFilter({ period, onChange }) {
  const [customOpen, setCustomOpen] = useState(false)

  const isCustom = period.type === PERIOD_TYPES.PICK_MONTH || period.type === PERIOD_TYPES.RANGE

  function pickMonth(value) {
    if (!value) return
    const [year, month] = value.split('-').map(Number)
    onChange({ type: PERIOD_TYPES.PICK_MONTH, year, month: month - 1 })
  }

  function pickDate(field, value) {
    if (!value) return
    const next = { ...(period.type === PERIOD_TYPES.RANGE ? period : {}), type: PERIOD_TYPES.RANGE }
    next[field] = value
    if (!next.startDate) next.startDate = value
    if (!next.endDate) next.endDate = value
    onChange(next)
  }

  return (
    <div className="flex flex-col gap-2 lg:gap-3">
      <div className="flex flex-wrap gap-2 lg:gap-3">
        {PRESETS.map((p) => (
          <button
            key={p.type}
            type="button"
            onClick={() => {
              setCustomOpen(false)
              onChange({ type: p.type })
            }}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium lg:px-4 lg:py-2 lg:text-sm ${
              period.type === p.type
                ? 'border-[var(--color-stamp)] bg-[var(--color-stamp)] text-[var(--color-paper-light)]'
                : 'border-[var(--color-border)] text-[var(--color-ink-muted)]'
            }`}
          >
            {p.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setCustomOpen((v) => !v)}
          className={`flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium lg:gap-1.5 lg:px-4 lg:py-2 lg:text-sm ${
            isCustom
              ? 'border-[var(--color-stamp)] bg-[var(--color-stamp)] text-[var(--color-paper-light)]'
              : 'border-[var(--color-border)] text-[var(--color-ink-muted)]'
          }`}
        >
          <Calendar size={12} strokeWidth={2} className="lg:h-[14px] lg:w-[14px]" />
          Pick a date
        </button>
      </div>

      {customOpen && (
        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] p-3 lg:gap-4 lg:p-5">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-[var(--color-ink-muted)] lg:text-sm">A specific month</span>
            <input
              type="month"
              onChange={(e) => pickMonth(e.target.value)}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-paper)] px-3 py-2 text-sm text-[var(--color-ink)] focus:border-[var(--color-stamp)] focus:outline-none lg:px-4 lg:py-2.5 lg:text-base"
            />
          </label>

          <span className="pb-2 text-xs text-[var(--color-ink-muted)] lg:text-sm">or a date range</span>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-[var(--color-ink-muted)] lg:text-sm">From</span>
            <input
              type="date"
              onChange={(e) => pickDate('startDate', e.target.value)}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-paper)] px-3 py-2 text-sm text-[var(--color-ink)] focus:border-[var(--color-stamp)] focus:outline-none lg:px-4 lg:py-2.5 lg:text-base"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-[var(--color-ink-muted)] lg:text-sm">To</span>
            <input
              type="date"
              onChange={(e) => pickDate('endDate', e.target.value)}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-paper)] px-3 py-2 text-sm text-[var(--color-ink)] focus:border-[var(--color-stamp)] focus:outline-none lg:px-4 lg:py-2.5 lg:text-base"
            />
          </label>
        </div>
      )}
    </div>
  )
}