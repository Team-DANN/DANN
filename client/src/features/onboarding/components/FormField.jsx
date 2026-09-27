// PATH: src/features/onboarding/components/FormField.jsx
import React from 'react'

export default function FormField({
  label,
  required,
  error,
  hint,
  children,
  className = '',
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label className="flex items-center gap-1 font-mono text-xs font-bold uppercase tracking-wide text-[var(--color-ink-muted)]">
          <span>{label}</span>
          {required && <span className="text-[var(--color-stamp)]">*</span>}
        </label>
      )}

      {children}

      {hint && !error && (
        <p className="text-[11px] text-[var(--color-ink-muted)]">{hint}</p>
      )}

      {error && (
        <p className="font-mono text-xs font-semibold text-[var(--color-error)]">
          {error}
        </p>
      )}
    </div>
  )
}
