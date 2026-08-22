import { useState } from 'react'

const ALERT_TYPES = [
  { id: 'low_stock', label: 'Low stock' },
  { id: 'payment_overdue', label: 'Payment overdue' },
  { id: 'anomaly', label: 'Anomalies' },
]

function Toggle({ enabled, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
        enabled ? 'bg-[var(--color-stamp)]' : 'bg-[var(--color-border)]'
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-[var(--color-paper-light)] shadow transition-transform ${
          enabled ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}

export function AlertsThresholdsSection() {
  const [runwayDays, setRunwayDays] = useState(3)
  const [enabled, setEnabled] = useState({
    low_stock: true,
    payment_overdue: true,
    anomaly: false,
  })

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h3 className="mb-1 font-[Roboto_Slab] text-sm font-semibold text-[var(--color-ink)]">
          Default runway threshold
        </h3>
        <p className="mb-3 text-xs text-[var(--color-ink-muted)]">
          Flag materials with fewer days of stock remaining than this. Per-material overrides
          still live in Inventory.
        </p>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            value={runwayDays}
            onChange={(e) => setRunwayDays(Number(e.target.value))}
            className="w-20 rounded-md border border-[var(--color-border)] bg-[var(--color-paper)] px-3 py-2 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-verdigris-dark)]"
          />
          <span className="text-sm text-[var(--color-ink-muted)]">days</span>
        </div>
      </div>

      <div>
        <h3 className="mb-3 font-[Roboto_Slab] text-sm font-semibold text-[var(--color-ink)]">
          Alert types
        </h3>
        <div className="flex flex-col gap-2">
          {ALERT_TYPES.map((type) => (
            <div
              key={type.id}
              className="flex items-center justify-between rounded-md border border-[var(--color-border)] px-3 py-2"
            >
              <span className="text-sm text-[var(--color-ink)]">{type.label}</span>
              <Toggle
                enabled={enabled[type.id]}
                onToggle={() =>
                  setEnabled((prev) => ({ ...prev, [type.id]: !prev[type.id] }))
                }
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}