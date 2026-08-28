// PATH: src/features/inventory/components/MaterialList.jsx

import { useMemo, useState } from 'react'
import { Search, SlidersHorizontal, Plus } from 'lucide-react'
import MaterialRow from './MaterialRow.jsx'
import LowStockBanner from './LowStockBanner.jsx'
import { getRunwayEstimate, RUNWAY_STATUS } from '../hooks/useRunwayEstimate.js'

const DEFAULT_VISIBLE_COUNT = 6

const STATUS_RANK = {
  [RUNWAY_STATUS.CRITICAL]: 0,
  [RUNWAY_STATUS.LOW]: 1,
  [RUNWAY_STATUS.UNKNOWN]: 2,
  [RUNWAY_STATUS.OK]: 3,
}

const SORT_OPTIONS = [
  { id: 'urgency', label: 'Most urgent' },
  { id: 'name', label: 'A–Z' },
  { id: 'qty', label: 'Quantity on hand' },
]

function sortMaterials(list, sortBy) {
  const copy = [...list]
  if (sortBy === 'name') return copy.sort((a, b) => a.name.localeCompare(b.name))
  if (sortBy === 'qty') return copy.sort((a, b) => b.qtyOnHand - a.qtyOnHand)
  // 'urgency' (default) — worst runway first, same ranking Home/Alerts use.
  return copy.sort((a, b) => {
    const aEst = getRunwayEstimate(a)
    const bEst = getRunwayEstimate(b)
    const rankDiff = STATUS_RANK[aEst.status] - STATUS_RANK[bEst.status]
    if (rankDiff !== 0) return rankDiff
    if (aEst.runwayDays == null || bEst.runwayDays == null) return 0
    return aEst.runwayDays - bEst.runwayDays
  })
}

// No "All" chip — the unfiltered list already IS "all". "Needs attention"
// is a standalone toggle (on/off), not one of a mutually-exclusive pair,
// so it reads as "narrow this down" rather than "pick a category."
export default function MaterialList({ materials, onSelectMaterial, onAddMaterial }) {
  const [query, setQuery] = useState('')
  const [needsAttentionOnly, setNeedsAttentionOnly] = useState(false)
  const [sortBy, setSortBy] = useState('urgency')
  const [sortOpen, setSortOpen] = useState(false)
  const [showAll, setShowAll] = useState(false)

  const attentionMaterials = useMemo(
    () =>
      materials.filter((m) => {
        const { status } = getRunwayEstimate(m)
        return status === RUNWAY_STATUS.LOW || status === RUNWAY_STATUS.CRITICAL
      }),
    [materials]
  )

  const filtered = useMemo(() => {
    let list = materials
    if (needsAttentionOnly) {
      const attentionIds = new Set(attentionMaterials.map((m) => m.id))
      list = list.filter((m) => attentionIds.has(m.id))
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      list = list.filter((m) => m.name.toLowerCase().includes(q))
    }
    return sortMaterials(list, sortBy)
  }, [materials, needsAttentionOnly, query, attentionMaterials, sortBy])

  // Cap only applies to the default browsing view — search or the
  // needs-attention toggle both mean the person is already narrowing
  // things down, so show everything that matches instead of hiding more.
  const isCapped = !needsAttentionOnly && !query.trim() && !showAll
  const visible = isCapped ? filtered.slice(0, DEFAULT_VISIBLE_COUNT) : filtered
  const hiddenCount = filtered.length - visible.length

  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      {attentionMaterials.length > 0 && !needsAttentionOnly && (
        <LowStockBanner
          count={attentionMaterials.length}
          onViewAll={() => setNeedsAttentionOnly(true)}
        />
      )}

      <div className="flex items-center gap-2 lg:gap-3">
        <div className="relative flex-1">
          <Search
            size={16}
            strokeWidth={2}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)] lg:left-4 lg:h-[18px] lg:w-[18px]"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setShowAll(false)
            }}
            placeholder="Search materials…"
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] py-2.5 pl-9 pr-3 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:border-[var(--color-stamp)] focus:outline-none lg:py-3.5 lg:pl-11 lg:pr-4 lg:text-base"
          />
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setSortOpen((v) => !v)}
            aria-label="Sort materials"
            className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border lg:h-12 lg:w-12 ${
              sortOpen
                ? 'border-[var(--color-stamp)] text-[var(--color-stamp)]'
                : 'border-[var(--color-border)] text-[var(--color-ink-muted)]'
            }`}
          >
            <SlidersHorizontal size={16} strokeWidth={2} className="lg:h-[18px] lg:w-[18px]" />
          </button>

          {sortOpen && (
            <div className="absolute right-0 top-full z-10 mt-1 w-40 rounded-lg border border-[var(--color-border)] bg-[var(--color-paper-light)] p-1 shadow-lg lg:w-48">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setSortBy(opt.id)
                    setSortOpen(false)
                  }}
                  className={`block w-full rounded px-2 py-1.5 text-left text-sm lg:px-3 lg:py-2 lg:text-base ${
                    sortBy === opt.id
                      ? 'bg-[var(--color-stamp)] text-[var(--color-paper-light)]'
                      : 'text-[var(--color-ink)] hover:bg-[var(--color-paper)]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={() => {
          setNeedsAttentionOnly((v) => !v)
          setShowAll(false)
        }}
        className={`self-start rounded-full border px-3 py-1.5 text-xs font-medium lg:px-4 lg:py-2 lg:text-sm ${
          needsAttentionOnly
            ? 'border-[var(--color-stamp)] bg-[var(--color-stamp)] text-[var(--color-paper-light)]'
            : 'border-[var(--color-border)] text-[var(--color-ink-muted)]'
        }`}
      >
        Needs attention{attentionMaterials.length ? ` (${attentionMaterials.length})` : ''}
      </button>

      {filtered.length === 0 ? (
        <p className="py-6 text-center text-sm text-[var(--color-ink-muted)] lg:py-8 lg:text-base">
          {query.trim() ? `No materials match "${query}"` : 'Nothing here.'}
        </p>
      ) : (
        <div className="flex flex-col gap-2 lg:gap-3">
          {visible.map((m) => (
            <MaterialRow key={m.id} material={m} onClick={() => onSelectMaterial(m)} />
          ))}
        </div>
      )}

      {isCapped && hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="text-center text-sm font-medium text-[var(--color-stamp)] lg:text-base"
        >
          Show all ({hiddenCount} more)
        </button>
      )}

      <button
        type="button"
        onClick={onAddMaterial}
        className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--color-border)] py-3 text-sm font-medium text-[var(--color-ink-muted)] hover:border-[var(--color-stamp)] hover:text-[var(--color-stamp)] lg:gap-3 lg:py-4 lg:text-base"
      >
        <Plus size={18} strokeWidth={2} className="lg:h-5 lg:w-5" />
        Add material
      </button>
    </div>
  )
}