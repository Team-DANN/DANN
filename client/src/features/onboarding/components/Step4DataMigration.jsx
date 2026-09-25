// PATH: src/features/onboarding/components/Step4DataMigration.jsx
import React from 'react'
import SelectionCard from './SelectionCard.jsx'
import { Camera, FileSpreadsheet, PlusCircle, Sparkles } from 'lucide-react'

export default function Step4DataMigration({ config, onChange }) {
  const choices = [
    {
      id: 'ocr_capture',
      label: 'OCR Photo & Receipt Intake',
      icon: Camera,
      badge: 'Fastest for Paper',
      description: 'Snap photos of paper receipts, invoices, or batch logs. DANN OCR parses text into structured materials and orders.',
    },
    {
      id: 'excel_csv',
      label: 'Excel / CSV File Upload',
      icon: FileSpreadsheet,
      badge: 'Bulk Import',
      description: 'Import existing spreadsheet files containing raw materials, product pricing catalog, and retailer accounts.',
    },
    {
      id: 'manual_staging',
      label: 'Manual Step-by-Step Setup',
      icon: PlusCircle,
      badge: 'Clean Slate',
      description: 'Start with a clean database and add raw materials, recipe BOMs, and product items one by one as you manufacture.',
    },
    {
      id: 'demo_seed',
      label: 'Demo Factory Seed Data',
      icon: Sparkles,
      badge: 'Instant Sandbox',
      description: 'Pre-fill DANN with realistic sample materials, recipes, and active dispatch orders to explore features right now.',
    },
  ]

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-sans text-lg font-bold text-[var(--color-ink)]">
          Data Migration & Intake Choice
        </h2>
        <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
          Choose how you want to load your initial factory inventory and catalog into DANN.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {choices.map((choice) => (
          <SelectionCard
            key={choice.id}
            icon={choice.icon}
            title={choice.label}
            badge={choice.badge}
            description={choice.description}
            selected={config.migrationChoice === choice.id}
            onSelect={() => {
              onChange('migrationChoice', choice.id)
              onChange('migrationLabel', choice.label)
            }}
          />
        ))}
      </div>

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] p-3.5 text-xs text-[var(--color-ink-muted)]">
        <span className="font-mono font-bold uppercase text-[var(--color-stamp)] block">
          Tip: You can change or combine import methods later
        </span>
        <p className="mt-1 leading-relaxed">
          Your choice determines where the wizard takes you after setup. You can always upload paper invoices, import spreadsheets, or add items manually at any time.
        </p>
      </div>
    </div>
  )
}
