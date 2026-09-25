// PATH: src/features/onboarding/components/CompletionState.jsx
import React from 'react'
import { CheckCircle2, ArrowRight, Building2, Wrench, FileSpreadsheet, Database, Sliders } from 'lucide-react'

export default function CompletionState({ config, onEditStep, onFinish, submitting }) {
  const summaryRows = [
    {
      step: 1,
      icon: Building2,
      label: 'Company & Facility',
      value: `${config.businessName || 'Manufacturing Co.'} (${config.country || 'India'}, ${config.currency || '₹'})`,
      detail: config.plantLocation ? `Location: ${config.plantLocation}` : 'Standard Plant Location',
    },
    {
      step: 2,
      icon: Wrench,
      label: 'Manufacturing Type',
      value: config.manufacturingTypeLabel || 'Discrete Assembly',
      detail: config.facilityScale ? `Scale: ${config.facilityScale}` : 'Small Manufacturing Unit',
    },
    {
      step: 3,
      icon: FileSpreadsheet,
      label: 'Current Workflow',
      value: config.workflowLabel || 'Paper / Manual Logs',
      detail: config.primaryBottleneckLabel ? `Bottleneck: ${config.primaryBottleneckLabel}` : 'Operational Stockouts',
    },
    {
      step: 4,
      icon: Database,
      label: 'Data Strategy',
      value: config.migrationLabel || 'OCR Photo Capture',
      detail: 'Factory Setup & Intake Path Configured',
    },
    {
      step: 5,
      icon: Sliders,
      label: 'Production Controls',
      value: `${config.shiftHours || 8} Hours/Shift`,
      detail: `Runway Alert: ${config.runwayThreshold || 3} days • Scrap Margin: ${config.scrapMargin || 0}%`,
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* Header Banner */}
      <div className="flex flex-col items-center justify-center rounded-2xl border border-[var(--color-stamp)]/30 bg-[var(--color-stamp)]/5 p-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-stamp)] text-white shadow-sm mb-3">
          <CheckCircle2 size={28} strokeWidth={2.5} />
        </div>
        <h3 className="font-sans text-xl font-bold text-[var(--color-ink)]">
          Factory Configuration Ready
        </h3>
        <p className="mt-1 text-xs sm:text-sm text-[var(--color-ink-muted)] max-w-md">
          Your company profile, operational preferences, and alert parameters are validated and ready to launch.
        </p>
      </div>

      {/* Summary Table Grid */}
      <div className="flex flex-col divide-y divide-[var(--color-border)]/60 rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] p-2">
        {summaryRows.map((row) => {
          const RowIcon = row.icon
          return (
            <div key={row.step} className="flex items-center justify-between p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-paper)] text-[var(--color-stamp)] border border-[var(--color-border)]/50">
                  <RowIcon size={18} />
                </div>
                <div>
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--color-ink-muted)] block">
                    {row.label}
                  </span>
                  <span className="text-xs font-bold text-[var(--color-ink)]">
                    {row.value}
                  </span>
                  <span className="text-[11px] text-[var(--color-ink-muted)] block">
                    {row.detail}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onEditStep(row.step)}
                className="font-mono text-xs font-semibold text-[var(--color-stamp)] hover:underline cursor-pointer px-2 py-1"
              >
                Edit
              </button>
            </div>
          )
        })}
      </div>

      {/* Primary Launch Action Button */}
      <div className="mt-2 flex flex-col gap-2">
        <button
          type="button"
          onClick={onFinish}
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-stamp)] py-3.5 px-6 font-sans text-sm font-bold text-[var(--color-paper-light)] hover:bg-[var(--color-stamp-dark)] transition-all shadow-md active:scale-[0.99] disabled:opacity-60 cursor-pointer"
        >
          <span>{submitting ? 'Initializing Factory Setup...' : 'Launch Factory Setup'}</span>
          <ArrowRight size={18} strokeWidth={2.5} />
        </button>
        <p className="text-center font-mono text-[11px] text-[var(--color-ink-muted)]">
          You can edit these preferences anytime under Settings &gt; Business Profile.
        </p>
      </div>
    </div>
  )
}
