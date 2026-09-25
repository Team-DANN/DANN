// PATH: src/features/onboarding/components/Step2ManufacturingType.jsx
import React from 'react'
import SelectionCard from './SelectionCard.jsx'
import { Wrench, Cookie, Layers, Cpu, Scissors, Box, Factory, Users } from 'lucide-react'

export default function Step2ManufacturingType({ config, onChange }) {
  const mfgTypes = [
    {
      id: 'discrete_assembly',
      label: 'Discrete Assembly & Machining',
      icon: Wrench,
      description: 'Job shop machining, lathe assembly, hardware manufacturing, and part fabrication.',
    },
    {
      id: 'batch_process',
      label: 'Batch & Process Manufacturing',
      icon: Cookie,
      description: 'Bakeries, food processing, chemicals, cosmetics, and liquid mixing batches.',
    },
    {
      id: 'custom_fabrication',
      label: 'Custom Metalwork & Sheet Fabrication',
      icon: Layers,
      description: 'Custom welding, structural metal, enclosures, and made-to-order steelwork.',
    },
    {
      id: 'electronics_precision',
      label: 'Electronics & Precision Engineering',
      icon: Cpu,
      description: 'PCB assembly, electrical appliances, wire harnesses, and instrument assemblies.',
    },
    {
      id: 'textile_garments',
      label: 'Textiles & Garment Manufacturing',
      icon: Scissors,
      description: 'Stitching units, fabric weaving, apparel manufacturing, and industrial textiles.',
    },
    {
      id: 'plastics_molding',
      label: 'Plastics & Injection Molding',
      icon: Box,
      description: 'Plastic components, polymer extrusions, and blow molding operations.',
    },
    {
      id: 'other',
      label: 'General Light Manufacturing',
      icon: Factory,
      description: 'Other specialized small-to-medium factory and assembly floor operations.',
    },
  ]

  const facilityScales = [
    { id: '1-10_workers', label: '1 - 10 Shop Floor Workers', desc: 'Compact workshop / small family unit' },
    { id: '11-50_workers', label: '11 - 50 Workers', desc: 'Mid-sized dedicated factory line' },
    { id: '50+_workers', label: '50+ Workers', desc: 'Multi-shift manufacturing plant' },
  ]

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-sans text-lg font-bold text-[var(--color-ink)]">
          Manufacturing Type & Operational Scale
        </h2>
        <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
          Select your primary shop floor operations so DANN can tailor inventory units and material recipes.
        </p>
      </div>

      {/* Mfg Type Grid */}
      <div className="flex flex-col gap-2.5">
        <label className="font-mono text-xs font-bold uppercase tracking-wide text-[var(--color-ink-muted)]">
          Primary Production Mode
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {mfgTypes.map((type) => (
            <SelectionCard
              key={type.id}
              icon={type.icon}
              title={type.label}
              description={type.description}
              selected={config.manufacturingType === type.id}
              onSelect={() => {
                onChange('manufacturingType', type.id)
                onChange('manufacturingTypeLabel', type.label)
              }}
            />
          ))}
        </div>
      </div>

      {/* Facility Scale */}
      <div className="flex flex-col gap-2.5 pt-2">
        <label className="font-mono text-xs font-bold uppercase tracking-wide text-[var(--color-ink-muted)]">
          Facility Workforce Scale (Optional)
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {facilityScales.map((scale) => (
            <button
              key={scale.id}
              type="button"
              onClick={() => onChange('facilityScale', scale.id)}
              className={`flex flex-col justify-between rounded-xl border p-3 text-left transition-all cursor-pointer ${
                config.facilityScale === scale.id
                  ? 'border-[var(--color-stamp)] bg-[var(--color-stamp)]/5 text-[var(--color-ink)]'
                  : 'border-[var(--color-border)] bg-[var(--color-paper-light)] text-[var(--color-ink-muted)] hover:border-[var(--color-stamp)]/40'
              }`}
            >
              <span className="font-mono text-xs font-bold text-[var(--color-ink)]">
                {scale.label}
              </span>
              <span className="mt-1 text-[11px] text-[var(--color-ink-muted)]">
                {scale.desc}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
