// PATH: src/features/onboarding/components/OnboardingProgress.jsx
import React from 'react'
import { Check } from 'lucide-react'

export default function OnboardingProgress({ steps, currentStep, onStepClick }) {
  const progressPercent = Math.round((currentStep / steps.length) * 100)

  return (
    <div className="w-full">
      {/* Top Header info */}
      <div className="mb-2 flex items-center justify-between font-mono text-xs font-semibold text-[var(--color-ink-muted)]">
        <span>STEP {currentStep} OF {steps.length}</span>
        <span className="text-[var(--color-stamp)]">{progressPercent}% COMPLETED</span>
      </div>

      {/* Progress Bar */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-border)]/60">
        <div className="h-full bg-[var(--color-stamp)]" style={{ width: `${progressPercent}%` }} />
      </div>

      {/* Step Indicators */}
      <div className="mt-4 hidden grid-cols-6 gap-2 sm:grid">
        {steps.map((step, idx) => {
          const stepNum = idx + 1
          const isCompleted = stepNum < currentStep
          const isCurrent = stepNum === currentStep
          const isClickable = isCompleted || stepNum === currentStep

          return (
            <button
              key={step.id}
              type="button"
              disabled={!isClickable}
              onClick={() => isClickable && onStepClick?.(stepNum)}
              className={`group flex flex-col items-start rounded-lg p-2 text-left transition-all ${
                isCurrent
                  ? 'bg-[var(--color-paper-light)] border border-[var(--color-stamp)]/40 shadow-2xs'
                  : 'hover:bg-[var(--color-paper-light)]/50'
              } ${!isClickable ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="flex items-center gap-1.5">
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full font-mono text-[11px] font-bold ${
                    isCompleted
                      ? 'bg-[var(--color-stamp)] text-white'
                      : isCurrent
                      ? 'bg-[var(--color-stamp)]/15 text-[var(--color-stamp)] border border-[var(--color-stamp)]'
                      : 'bg-[var(--color-paper)] text-[var(--color-ink-muted)] border border-[var(--color-border)]'
                  }`}
                >
                  {isCompleted ? <Check size={12} strokeWidth={3} /> : stepNum}
                </span>
                <span
                  className={`text-xs font-medium truncate ${
                    isCurrent
                      ? 'font-bold text-[var(--color-ink)]'
                      : isCompleted
                      ? 'text-[var(--color-ink)]'
                      : 'text-[var(--color-ink-muted)]'
                  }`}
                >
                  {step.title}
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
