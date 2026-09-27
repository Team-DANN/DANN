// PATH: src/features/onboarding/components/Step6Confirmation.jsx
import React from 'react'
import CompletionState from './CompletionState.jsx'
import ValidationAlert from './ValidationAlert.jsx'

export default function Step6Confirmation({ config, onEditStep, onFinish, submitting, error }) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="font-sans text-lg font-bold text-[var(--color-ink)]">Review your setup</h2>
        <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
          Only your company details are required. Everything else can be changed later.
        </p>
      </div>

      {error && <ValidationAlert message={error} title="Setup Error" />}

      <CompletionState
        config={config}
        onEditStep={onEditStep}
        onFinish={onFinish}
        submitting={submitting}
      />
    </div>
  )
}
