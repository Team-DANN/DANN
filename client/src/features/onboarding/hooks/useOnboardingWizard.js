// PATH: src/features/onboarding/hooks/useOnboardingWizard.js
import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext.jsx'
import { apiFetch } from '../../../lib/apiClient.js'

export const STEPS = [
  { id: 1, title: 'Company' },
  { id: 2, title: 'Manufacturing' },
  { id: 3, title: 'Workflow' },
  { id: 4, title: 'Data' },
  { id: 5, title: 'Production' },
  { id: 6, title: 'Confirm' },
]

const productionSettingKeys = new Set(['shiftHours', 'runwayThreshold', 'scrapMargin', 'alerts'])

const skippedStepValues = {
  2: { manufacturingType: '', manufacturingTypeLabel: '', facilityScale: '' },
  3: { workflowType: '', workflowLabel: '', primaryBottleneck: '', primaryBottleneckLabel: '' },
  4: { migrationChoice: 'set_up_later', migrationLabel: 'Set up data later' },
  5: { productionSettingsConfigured: false },
}

export function useOnboardingWizard(onCompleteOverride) {
  const { user, updateUser } = useAuth()
  const navigate = useNavigate()

  const [currentStep, setCurrentStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [validationErrors, setValidationErrors] = useState({})

  const [config, setConfig] = useState({
    businessName: user?.business_name || (user?.name ? `${user.name.split(' ')[0]}'s Manufacturing` : ''),
    country: user?.country || 'India',
    currency: user?.currency || '₹',
    timezone: user?.timezone || 'Asia/Kolkata',
    plantLocation: '',
    manufacturingType: '',
    manufacturingTypeLabel: '',
    facilityScale: '',
    workflowType: '',
    workflowLabel: '',
    primaryBottleneck: '',
    primaryBottleneckLabel: '',
    migrationChoice: 'set_up_later',
    migrationLabel: 'Set up data later',
    shiftHours: 8,
    runwayThreshold: 3,
    scrapMargin: '',
    alerts: {
      low_stock: true,
      payment_overdue: true,
      anomaly: true,
    },
    productionSettingsConfigured: false,
  })

  const updateConfigField = useCallback((key, value) => {
    setConfig((prev) => ({
      ...prev,
      [key]: value,
      ...(productionSettingKeys.has(key) ? { productionSettingsConfigured: true } : {}),
    }))
    setValidationErrors((prev) => ({ ...prev, [key]: undefined }))
    setError(null)
  }, [])

  const validateStep = useCallback(
    (stepNum) => {
      const errs = {}
      if (stepNum === 1 && !config.businessName?.trim()) {
        errs.businessName = 'Enter your company name to continue'
      }
      setValidationErrors(errs)
      return Object.keys(errs).length === 0
    },
    [config.businessName]
  )

  const moveToStep = useCallback((step) => {
    setCurrentStep(step)
    window.scrollTo({ top: 0 })
  }, [])

  const goToNextStep = useCallback(() => {
    if (!validateStep(currentStep)) return
    if (currentStep < STEPS.length) moveToStep(currentStep + 1)
  }, [currentStep, moveToStep, validateStep])

  const goToPrevStep = useCallback(() => {
    if (currentStep > 1) moveToStep(currentStep - 1)
  }, [currentStep, moveToStep])

  const skipCurrentStep = useCallback(() => {
    if (currentStep >= STEPS.length) return
    setConfig((prev) => ({ ...prev, ...skippedStepValues[currentStep] }))
    moveToStep(currentStep + 1)
  }, [currentStep, moveToStep])

  const goToStep = useCallback((stepNum) => {
    if (stepNum >= 1 && stepNum <= STEPS.length) moveToStep(stepNum)
  }, [moveToStep])

  const finishOnboarding = useCallback(async () => {
    setSubmitting(true)
    setError(null)

    try {
      const onboardingPayload = {
        completed: true,
        completed_at: new Date().toISOString(),
        plant_location: config.plantLocation || null,
        manufacturing_type: config.manufacturingType || null,
        manufacturing_type_label: config.manufacturingTypeLabel || null,
        facility_scale: config.facilityScale || null,
        workflow_type: config.workflowType || null,
        workflow_label: config.workflowLabel || null,
        primary_bottleneck: config.primaryBottleneck || null,
        primary_bottleneck_label: config.primaryBottleneckLabel || null,
        migration_choice: config.migrationChoice,
        migration_label: config.migrationLabel,
        production_settings_configured: config.productionSettingsConfigured,
        shift_hours: config.productionSettingsConfigured ? config.shiftHours : null,
        scrap_margin_percent: config.productionSettingsConfigured && config.scrapMargin ? Number(config.scrapMargin) : null,
      }

      await apiFetch('/api/business', {
        method: 'PATCH',
        body: JSON.stringify({
          name: config.businessName.trim(),
          type: config.manufacturingType || undefined,
          timezone: config.timezone,
          currency: config.currency,
          country: config.country,
          onboarding_config: onboardingPayload,
        }),
      })

      if (config.productionSettingsConfigured) {
        await apiFetch('/api/business/alert-settings', {
          method: 'PATCH',
          body: JSON.stringify({
            runway_threshold_days: Number(config.runwayThreshold),
            types: config.alerts,
          }),
        })
      }

      updateUser({
        business_name: config.businessName.trim(),
        currency: config.currency,
        country: config.country,
        timezone: config.timezone,
      })

      if (onCompleteOverride) {
        onCompleteOverride(config)
        return
      }

      switch (config.migrationChoice) {
        case 'ocr_capture':
          navigate('/production?action=ocr', { replace: true })
          break
        case 'excel_csv':
          navigate('/migration', { replace: true })
          break
        case 'manual_staging':
          navigate('/inventory?action=add', { replace: true })
          break
        default:
          navigate('/', { replace: true })
      }
    } catch (err) {
      setError(err.message || 'We could not save your setup. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }, [config, navigate, onCompleteOverride, updateUser])

  return {
    steps: STEPS,
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
  }
}
