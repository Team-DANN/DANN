import { useEffect, useState } from 'react'
import { getAlertSettings, updateAlertSettings } from '../../../lib/api/business.js'

const ALERT_TYPES = [
  { id: 'low_stock', label: 'Low stock' },
  { id: 'payment_overdue', label: 'Payment overdue' },
  { id: 'anomaly', label: 'Anomalies' },
]

function Toggle({ enabled, onToggle, disabled }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
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
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [saveStatus, setSaveStatus] = useState('idle')
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setLoadError('')
      try {
        const data = await getAlertSettings()
        if (!cancelled) setSettings(data)
      } catch (err) {
        if (!cancelled) setLoadError(err.message || 'Could not load alert settings')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  async function persist(next) {
    setSettings(next)
    setSaveStatus('saving')
    setSaveError('')
    try {
      const saved = await updateAlertSettings(next)
      setSettings(saved)
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 1200)
    } catch (err) {
      setSaveStatus('error')
      setSaveError(err.message || 'Could not save alert settings')
    }
  }

  if (loading) {
    return <p className="text-sm text-[var(--color-ink-muted)]">Loading alert settings…</p>
  }
  if (loadError) {
    return <p className="text-sm text-[var(--color-error)]">{loadError}</p>
  }

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
            value={settings.runway_threshold_days}
            onChange={(e) =>
              setSettings((s) => ({ ...s, runway_threshold_days: Number(e.target.value) }))
            }
            onBlur={() => persist(settings)}
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
                enabled={!!settings.types?.[type.id]}
                disabled={saveStatus === 'saving'}
                onToggle={() =>
                  persist({
                    ...settings,
                    types: { ...settings.types, [type.id]: !settings.types?.[type.id] },
                  })
                }
              />
            </div>
          ))}
        </div>
      </div>

      {saveStatus === 'error' && <p className="text-xs text-[var(--color-error)]">{saveError}</p>}
    </div>
  )
}