// PATH: src/features/onboarding/components/CompletionState.jsx
import React from 'react'
import { CheckCircle2, ArrowRight, Building2, Wrench, FileSpreadsheet, Database, Sliders } from 'lucide-react'

function getFinishLabel(migrationChoice) {
  if (migrationChoice === 'ocr_capture') return 'Continue to photo intake'
  if (migrationChoice === 'excel_csv') return 'Continue to CSV import'
  if (migrationChoice === 'manual_staging') return 'Add your first material'
  return 'Open workspace'
}

export default function CompletionState({ config, onEditStep, onFinish, submitting }) {
  const summaryRows = [
    {
      step: 1,
      icon: Building2,
      label: 'Company',
      value: `${config.businessName} · ${config.country}`,
      detail: config.plantLocation || `Currency: ${config.currency}`,
    },
    {
      step: 2,
      icon: Wrench,
      label: 'Manufacturing type',
      value: config.manufacturingTypeLabel || 'Set up later',
      detail: config.facilityScale ? `Scale: ${config.facilityScale}` : 'Optional configuration',
    },
    {
      step: 3,
      icon: FileSpreadsheet,
      label: 'Current workflow',
      value: config.workflowLabel || 'Set up later',
      detail: config.primaryBottleneckLabel || 'Optional configuration',
    },
    {
      step: 4,
      icon: Database,
      label: 'Starting data',
      value: config.migrationLabel,
      detail: config.migrationChoice === 'set_up_later' ? 'You can import at any time.' : 'Your next screen is ready.',
    },
    {
      step: 5,
      icon: Sliders,
      label: 'Production settings',
      value: config.productionSettingsConfigured ? `${config.shiftHours} hours per shift` : 'Set up later',
      detail: config.productionSettingsConfigured
        ? `Runway alert: ${config.runwayThreshold} days${config.scrapMargin ? ` · Scrap: ${config.scrapMargin}%` : ''}`
        : 'Optional configuration',
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center justify-center rounded-2xl border border-[var(--color-stamp)]/30 bg-[var(--color-stamp)]/5 p-6 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-stamp)] text-white shadow-sm">
          <CheckCircle2 size={28} strokeWidth={2.5} />
        </div>
        <h3 className="font-sans text-xl font-bold text-[var(--color-ink)]">Your workspace is ready</h3>
        <p className="mt-1 max-w-md text-sm text-[var(--color-ink-muted)]">
          Review the essentials, then continue to the setup path you chose.
        </p>
      </div>

      <div className="flex flex-col divide-y divide-[var(--color-border)]/60 rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] p-2">
        {summaryRows.map((row) => {
          const RowIcon = row.icon
          return (
            <div key={row.step} className="flex items-center justify-between gap-3 p-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--color-border)]/50 bg-[var(--color-paper)] text-[var(--color-stamp)]">
                  <RowIcon size={18} />
                </div>
                <div className="min-w-0">
                  <span className="block font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--color-ink-muted)]">
                    {row.label}
                  </span>
                  <span className="block truncate text-xs font-bold text-[var(--color-ink)]">{row.value}</span>
                  <span className="block text-[11px] text-[var(--color-ink-muted)]">{row.detail}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onEditStep(row.step)}
                className="shrink-0 px-2 py-1 font-mono text-xs font-semibold text-[var(--color-stamp)] hover:underline"
              >
                Edit
              </button>
            </div>
          )
        })}
      </div>

      <div className="mt-2 flex flex-col gap-2">
        <button
          type="button"
          onClick={onFinish}
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-stamp)] px-6 py-3.5 font-sans text-sm font-bold text-[var(--color-paper-light)] hover:bg-[var(--color-stamp-dark)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span>{submitting ? 'Saving setup…' : getFinishLabel(config.migrationChoice)}</span>
          <ArrowRight size={18} strokeWidth={2.5} />
        </button>
        <p className="text-center font-mono text-[11px] text-[var(--color-ink-muted)]">
          You can update these preferences later in Settings.
        </p>
      </div>
    </div>
  )
}
