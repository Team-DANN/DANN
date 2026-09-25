// PATH: src/features/onboarding/CompanyOnboardingWizard.jsx
import React from 'react'
import { ArrowLeft, ArrowRight, SkipForward } from 'lucide-react'
import { useOnboardingWizard } from './hooks/useOnboardingWizard.js'
import OnboardingProgress from './components/OnboardingProgress.jsx'
import Step1CompanyInfo from './components/Step1CompanyInfo.jsx'
import Step2ManufacturingType from './components/Step2ManufacturingType.jsx'
import Step3CurrentWorkflow from './components/Step3CurrentWorkflow.jsx'
import Step4DataMigration from './components/Step4DataMigration.jsx'
import Step5ProductionSettings from './components/Step5ProductionSettings.jsx'
import Step6Confirmation from './components/Step6Confirmation.jsx'

export default function CompanyOnboardingWizard({ onComplete }) {
  const {
    steps,
    currentStep,
    config,
    updateConfigField,
    validationErrors,
    error,
    submitting,
    goToNextStep,
    goToPrevStep,
    skipCurrentStep,
    goToStep,
    finishOnboarding,
  } = useOnboardingWizard(onComplete)

  const isFirstStep = currentStep === 1
  const isLastStep = currentStep === steps.length
  const isOptionalStep = currentStep >= 2 && currentStep <= 5

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:py-12">
      {/* Container Card */}
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-paper-light)] p-6 sm:p-8 lg:p-10 shadow-sm">
        {/* Top Header & Progress Bar */}
        <div className="border-b border-[var(--color-border)]/60 pb-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-[var(--color-stamp)]">
                DANN FACTORY ONBOARDING
              </span>
              <h1 className="font-sans text-xl font-bold text-[var(--color-ink)] sm:text-2xl">
                Setup Your Operational Command Center
              </h1>
            </div>
          </div>

          <OnboardingProgress
            steps={steps}
            currentStep={currentStep}
            onStepClick={goToStep}
          />
        </div>

        {/* Step Content */}
        <div className="min-h-[380px]">
          {currentStep === 1 && (
            <Step1CompanyInfo
              config={config}
              onChange={updateConfigField}
              errors={validationErrors}
            />
          )}

          {currentStep === 2 && (
            <Step2ManufacturingType
              config={config}
              onChange={updateConfigField}
            />
          )}

          {currentStep === 3 && (
            <Step3CurrentWorkflow
              config={config}
              onChange={updateConfigField}
            />
          )}

          {currentStep === 4 && (
            <Step4DataMigration
              config={config}
              onChange={updateConfigField}
            />
          )}

          {currentStep === 5 && (
            <Step5ProductionSettings
              config={config}
              onChange={updateConfigField}
            />
          )}

          {currentStep === 6 && (
            <Step6Confirmation
              config={config}
              onEditStep={goToStep}
              onFinish={finishOnboarding}
              submitting={submitting}
              error={error}
            />
          )}
        </div>

        {/* Wizard Footer Controls */}
        {!isLastStep && (
          <div className="mt-8 flex items-center justify-between border-t border-[var(--color-border)]/60 pt-6">
            <div>
              {!isFirstStep && (
                <button
                  type="button"
                  onClick={goToPrevStep}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-4 py-2 text-xs sm:text-sm font-semibold text-[var(--color-ink-muted)] hover:bg-[var(--color-paper)] hover:text-[var(--color-ink)] cursor-pointer"
                >
                  <ArrowLeft size={16} />
                  <span>Back</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              {isOptionalStep && (
                <button
                  type="button"
                  onClick={skipCurrentStep}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-ink-muted)] hover:text-[var(--color-stamp)] hover:underline cursor-pointer px-2 py-1"
                >
                  <span>Skip optional setup</span>
                  <SkipForward size={14} />
                </button>
              )}

              <button
                type="button"
                onClick={goToNextStep}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-stamp)] px-5 py-2.5 text-xs sm:text-sm font-bold text-[var(--color-paper-light)] hover:bg-[var(--color-stamp-dark)] transition-all shadow-xs cursor-pointer"
              >
                <span>Continue</span>
                <ArrowRight size={16} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
