// PATH: src/features/onboarding/hooks/useOnboardingWizard.js
import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext.jsx'
import { apiFetch } from '../../../lib/apiClient.js'

export const STEPS = [
  { id: 1, title: 'Company Info' },
  { id: 2, title: 'Mfg Type' },
  { id: 3, title: 'Workflow' },
  { id: 4, title: 'Data Migration' },
  { id: 5, title: 'Production' },
  { id: 6, title: 'Confirmation' },
]

export function useOnboardingWizard(onCompleteOverride) {
  const { user, updateUser } = useAuth()
  const navigate = useNavigate()

  const [currentStep, setCurrentStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [validationErrors, setValidationErrors] = useState({})

  const [config, setConfig] = useState({
    businessName: user?.business_name || user?.name ? `${user?.name?.split(' ')[0]}'s Manufacturing` : 'My Factory',
    country: user?.country || 'India',
    currency: user?.currency || '₹',
    timezone: user?.timezone || 'Asia/Kolkata',
    plantLocation: '',
    manufacturingType: 'discrete_assembly',
    manufacturingTypeLabel: 'Discrete Assembly & Machining',
    facilityScale: '1-10_workers',
    workflowType: 'paper_logs',
    workflowLabel: 'Manual Paper Logbooks & Physical Sheets',
    primaryBottleneck: 'material_stockouts',
    primaryBottleneckLabel: 'Unexpected Stockouts & Runway Surprises',
    migrationChoice: 'ocr_capture',
    migrationLabel: 'OCR Photo & Receipt Intake',
    shiftHours: 8,
    runwayThreshold: 3,
    scrapMargin: '2.5',
    alerts: {
      low_stock: true,
      payment_overdue: true,
      anomaly: true,
    },
  })

  const updateConfigField = useCallback((key, value) => {
    setConfig((prev) => ({ ...prev, [key]: value }))
    setValidationErrors((prev) => ({ ...prev, [key]: undefined }))
    setError(null)
  }, [])

  const validateStep = useCallback(
    (stepNum) => {
      const errs = {}
      if (stepNum === 1) {
        if (!config.businessName?.trim()) errs.businessName = 'Business name is required'
        if (!config.country?.trim()) errs.country = 'Country is required'
        if (!config.currency?.trim()) errs.currency = 'Currency is required'
      }
      setValidationErrors(errs)
      return Object.keys(errs).length === 0
    },
    [config]
  )

  const goToNextStep = useCallback(() => {
    if (!validateStep(currentStep)) return
    if (currentStep < STEPS.length) {
      setCurrentStep((prev) => prev + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [currentStep, validateStep])

  const goToPrevStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [currentStep])

  const skipCurrentStep = useCallback(() => {
    if (currentStep < STEPS.length) {
      setCurrentStep((prev) => prev + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [currentStep])

  const goToStep = useCallback((stepNum) => {
    if (stepNum >= 1 && stepNum <= STEPS.length) {
      setCurrentStep(stepNum)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [])

  // Final submit & launch workflow
  const finishOnboarding = useCallback(async () => {
    setSubmitting(true)
    setError(null)

    try {
      const onboardingPayload = {
        completed: true,
        completed_at: new Date().toISOString(),
        plant_location: config.plantLocation,
        manufacturing_type: config.manufacturingType,
        manufacturing_type_label: config.manufacturingTypeLabel,
        facility_scale: config.facilityScale,
        workflow_type: config.workflowType,
        workflow_label: config.workflowLabel,
        primary_bottleneck: config.primaryBottleneck,
        primary_bottleneck_label: config.primaryBottleneckLabel,
        migration_choice: config.migrationChoice,
        migration_label: config.migrationLabel,
        shift_hours: config.shiftHours,
        scrap_margin_percent: config.scrapMargin ? Number(config.scrapMargin) : 0,
      }

      // 1. Update business profile & onboarding config
      await apiFetch('/api/business', {
        method: 'PATCH',
        body: JSON.stringify({
          name: config.businessName,
          type: config.manufacturingType,
          timezone: config.timezone,
          currency: config.currency,
          country: config.country,
          onboarding_config: onboardingPayload,
        }),
      })

      // 2. Update alert settings
      await apiFetch('/api/business/alert-settings', {
        method: 'PATCH',
        body: JSON.stringify({
          runway_threshold_days: Number(config.runwayThreshold),
          types: config.alerts,
        }),
      })

      // Update AuthContext local state
      updateUser({
        business_name: config.businessName,
        currency: config.currency,
        country: config.country,
        timezone: config.timezone,
      })

      if (onCompleteOverride) {
        onCompleteOverride(config)
        return
      }

      // 3. Route directly into the factory setup/import workflow based on user migration choice
      switch (config.migrationChoice) {
        case 'ocr_capture':
          navigate('/production?action=ocr', { replace: true })
          break
        case 'excel_csv':
          navigate('/inventory?action=import', { replace: true })
          break
        case 'manual_staging':
          navigate('/inventory?action=add', { replace: true })
          break
        case 'demo_seed':
        default:
          navigate('/?onboarding=complete', { replace: true })
          break
      }
    } catch (err) {
      setError(err.message || 'Failed to complete onboarding setup.')
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
