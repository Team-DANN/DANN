// PATH: src/features/onboarding/components/Step5ProductionSettings.jsx
import React from 'react'
import FormField from './FormField.jsx'
import { Bell, Clock, ShieldAlert, Percent } from 'lucide-react'

export default function Step5ProductionSettings({ config, onChange }) {
  const shiftOptions = [
    { label: 'Single Shift (8 Hours/Day)', value: 8 },
    { label: 'Double Shift (12 Hours/Day)', value: 12 },
    { label: '24-Hour Continuous Operations', value: 24 },
  ]

  const runwayOptions = [
    { label: '3 Days (Strict Buffer)', value: 3 },
    { label: '7 Days (Standard 1-Week Buffer)', value: 7 },
    { label: '14 Days (Conservative 2-Week Buffer)', value: 14 },
  ]

  const handleAlertToggle = (key) => {
    const currentAlerts = { ...config.alerts }
    currentAlerts[key] = !currentAlerts[key]
    onChange('alerts', currentAlerts)
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-sans text-lg font-bold text-[var(--color-ink)]">
          Basic Factory Production Settings
        </h2>
        <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
          Set your shift hours and material risk alert thresholds for automated command center monitoring.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Shift Hours */}
        <FormField label="Standard Daily Shift Duration">
          <select
            value={config.shiftHours}
            onChange={(e) => onChange('shiftHours', Number(e.target.value))}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-paper-light)] p-2.5 text-sm font-sans text-[var(--color-ink)] focus:border-[var(--color-stamp)] focus:outline-none"
          >
            {shiftOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </FormField>

        {/* Runway Alert Threshold */}
        <FormField label="Material Runway Warning Threshold">
          <select
            value={config.runwayThreshold}
            onChange={(e) => onChange('runwayThreshold', Number(e.target.value))}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-paper-light)] p-2.5 text-sm font-sans text-[var(--color-ink)] focus:border-[var(--color-stamp)] focus:outline-none"
          >
            {runwayOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      {/* Scrap Wastage Margin */}
      <FormField
        label="Expected Scrap / Wastage Buffer % (Optional)"
        hint="Default scrap variance added to material cost calculations"
      >
        <div className="relative">
          <input
            type="number"
            min="0"
            max="30"
            step="0.5"
            value={config.scrapMargin}
            onChange={(e) => onChange('scrapMargin', e.target.value)}
            placeholder="e.g. 2.5"
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-paper-light)] p-2.5 pr-8 text-sm font-mono text-[var(--color-ink)] focus:border-[var(--color-stamp)] focus:outline-none"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-mono text-xs font-bold text-[var(--color-ink-muted)]">
            %
          </span>
        </div>
      </FormField>

      {/* Alert Toggles */}
      <div className="flex flex-col gap-2 pt-1">
        <label className="font-mono text-xs font-bold uppercase tracking-wide text-[var(--color-ink-muted)]">
          Command Center Alert Monitors
        </label>
        <div className="flex flex-col gap-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] p-3">
          {[
            { key: 'low_stock', label: 'Low Raw Material Stockout Alerts', desc: 'Notify when stock falls below reorder threshold' },
            { key: 'payment_overdue', label: 'Overdue Retailer Payment Reminders', desc: 'Flag invoices past retailer credit due dates' },
            { key: 'anomaly', label: 'Material Consumption Anomaly Warnings', desc: 'Flag unexpected material burn rate spikes' },
          ].map((item) => {
            const isChecked = !!config.alerts?.[item.key]
            return (
              <label
                key={item.key}
                className="flex items-start justify-between gap-3 p-1 cursor-pointer select-none"
              >
                <div>
                  <span className="text-xs font-bold text-[var(--color-ink)] block">
                    {item.label}
                  </span>
                  <span className="text-[11px] text-[var(--color-ink-muted)] block">
                    {item.desc}
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => handleAlertToggle(item.key)}
                  className="mt-1 h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-stamp)] focus:ring-0 cursor-pointer accent-[var(--color-stamp)]"
                />
              </label>
            )
          })}
        </div>
      </div>
    </div>
  )
}
