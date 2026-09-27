// PATH: src/features/onboarding/components/ValidationAlert.jsx
import React from 'react'
import { AlertCircle } from 'lucide-react'

export default function ValidationAlert({ message, title = 'Validation Issue' }) {
  if (!message) return null

  return (
    <div className="flex items-start gap-3 rounded-xl border border-[var(--color-error)] bg-[var(--color-error)]/10 p-3.5 text-xs text-[var(--color-error)]">
      <AlertCircle size={18} className="shrink-0 mt-0.5 text-[var(--color-error)]" />
      <div>
        <span className="font-mono font-bold uppercase tracking-wider block">
          {title}
        </span>
        <p className="mt-0.5 text-xs text-[var(--color-error)] font-medium">
          {message}
        </p>
      </div>
    </div>
  )
}
