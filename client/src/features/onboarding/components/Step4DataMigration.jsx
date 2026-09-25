// PATH: src/features/onboarding/components/Step4DataMigration.jsx
import React from 'react'
import SelectionCard from './SelectionCard.jsx'
import { Camera, FileSpreadsheet, PlusCircle, Clock3 } from 'lucide-react'

export default function Step4DataMigration({ config, onChange }) {
  const choices = [
    {
      id: 'ocr_capture',
      label: 'Capture a batch sheet',
      icon: Camera,
      badge: 'Photo intake',
      description: 'Start with a photo of a production sheet and review the data before saving it.',
    },
    {
      id: 'excel_csv',
      label: 'Import an Excel or CSV file',
      icon: FileSpreadsheet,
      badge: 'Guided import',
      description: 'Bring in products, customers, materials, inventory, orders, suppliers, and BOMs with a review before anything is saved.',
    },
    {
      id: 'manual_staging',
      label: 'Add a material manually',
      icon: PlusCircle,
      badge: 'Start small',
      description: 'Add your first raw material now and build the rest of your catalog over time.',
    },
    {
      id: 'set_up_later',
      label: 'Set up data later',
      icon: Clock3,
      badge: 'Optional',
      description: 'Open your workspace now. Import and setup tools stay available whenever you need them.',
    },
  ]

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-sans text-lg font-bold text-[var(--color-ink)]">How would you like to start?</h2>
        <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
          This only chooses your next screen. You can add or import more data later.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
    </div>
  )
}
