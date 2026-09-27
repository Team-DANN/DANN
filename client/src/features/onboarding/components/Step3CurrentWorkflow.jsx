// PATH: src/features/onboarding/components/Step3CurrentWorkflow.jsx
import React from 'react'
import SelectionCard from './SelectionCard.jsx'
import { FileText, FileSpreadsheet, Monitor, MessageSquare, AlertTriangle, Clock, TrendingDown, Wallet } from 'lucide-react'

export default function Step3CurrentWorkflow({ config, onChange }) {
  const workflows = [
    {
      id: 'paper_logs',
      label: 'Manual Paper Logbooks & Physical Sheets',
      icon: FileText,
      description: 'Factory floor operators log batch quantities, scrap, and hours on physical paper clipboards.',
    },
    {
      id: 'excel_spreadsheets',
      label: 'Excel / Google Spreadsheets',
      icon: FileSpreadsheet,
      description: 'Inventory levels, order ledgers, and costs are tracked across multiple manual spreadsheets.',
    },
    {
      id: 'legacy_software',
      label: 'Legacy Desktop Software / Tally',
      icon: Monitor,
      description: 'Using legacy desktop accounting software that lacks real-time floor batch & material tracking.',
    },
    {
      id: 'none_whatsapp',
      label: 'Informal Notes & WhatsApp',
      icon: MessageSquare,
      description: 'Floor requests and dispatch notes sent via instant messaging with minimal formal logs.',
    },
  ]

  const bottlenecks = [
    {
      id: 'material_stockouts',
      label: 'Unexpected Stockouts & Runway Surprises',
      icon: AlertTriangle,
      description: 'Raw materials run out in the middle of active batch production runs.',
    },
    {
      id: 'delivery_delays',
      label: 'Missed Delivery Deadlines & Order SLA Risks',
      icon: Clock,
      description: 'Floor delays make it hard to guarantee delivery dates to key retailers.',
    },
    {
      id: 'cost_opacity',
      label: 'Inaccurate Batch Costs & Low Profit Margins',
      icon: TrendingDown,
      description: 'Unclear material wastage and labor costs erode product margins.',
    },
    {
      id: 'payment_collection',
      label: 'Overdue Retailer Payments & Receivable Delays',
      icon: Wallet,
      description: 'Outstanding retailer balances constrain weekly material purchasing power.',
    },
  ]

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-sans text-lg font-bold text-[var(--color-ink)]">
          Current Factory Workflow & Operational Pain Points
        </h2>
        <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
          Help DANN prioritize which command center alerts and automation triggers to surface first.
        </p>
      </div>

      {/* Workflow Options */}
      <div className="flex flex-col gap-2.5">
        <label className="font-mono text-xs font-bold uppercase tracking-wide text-[var(--color-ink-muted)]">
          How do you currently track factory operations?
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {workflows.map((wf) => (
            <SelectionCard
              key={wf.id}
              icon={wf.icon}
              title={wf.label}
              description={wf.description}
              selected={config.workflowType === wf.id}
              onSelect={() => {
                onChange('workflowType', wf.id)
                onChange('workflowLabel', wf.label)
              }}
            />
          ))}
        </div>
      </div>

      {/* Primary Bottleneck */}
      <div className="flex flex-col gap-2.5 pt-2">
        <label className="font-mono text-xs font-bold uppercase tracking-wide text-[var(--color-ink-muted)]">
          What is your #1 operational bottleneck right now?
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {bottlenecks.map((bn) => (
            <SelectionCard
              key={bn.id}
              icon={bn.icon}
              title={bn.label}
              description={bn.description}
              selected={config.primaryBottleneck === bn.id}
              onSelect={() => {
                onChange('primaryBottleneck', bn.id)
                onChange('primaryBottleneckLabel', bn.label)
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
