// PATH: src/features/onboarding/components/Step1CompanyInfo.jsx
import React from 'react'
import FormField from './FormField.jsx'
import { countryOptions } from '../../../lib/constants/countryOptions.js'

export default function Step1CompanyInfo({ config, onChange, errors }) {
  const currencyOptions = [
    { label: '₹ - INR (Indian Rupee)', value: '₹' },
    { label: '$ - USD (US Dollar)', value: '$' },
    { label: '€ - EUR (Euro)', value: '€' },
    { label: '£ - GBP (British Pound)', value: '£' },
    { label: 'AED - UAE Dirham', value: 'AED' },
  ]

  const timezoneOptions = [
    { label: 'Asia/Kolkata (IST)', value: 'Asia/Kolkata' },
    { label: 'America/New_York (EST)', value: 'America/New_York' },
    { label: 'Europe/London (GMT/BST)', value: 'Europe/London' },
    { label: 'Asia/Dubai (GST)', value: 'Asia/Dubai' },
    { label: 'Asia/Singapore (SGT)', value: 'Asia/Singapore' },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="font-sans text-lg font-bold text-[var(--color-ink)]">
          Company & Facility Information
        </h2>
        <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
          Enter your manufacturing company details to establish your shop floor tenant parameters.
        </p>
      </div>

      <FormField label="Company / Business Name" required error={errors.businessName}>
        <input
          type="text"
          value={config.businessName}
          onChange={(e) => onChange('businessName', e.target.value)}
          placeholder="e.g. Apex Precision Metals Ltd."
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-paper-light)] p-2.5 text-sm font-sans text-[var(--color-ink)] focus:border-[var(--color-stamp)] focus:outline-none"
        />
      </FormField>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <FormField label="Country / Location" required error={errors.country}>
          <select
            value={config.country}
            onChange={(e) => onChange('country', e.target.value)}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-paper-light)] p-2.5 text-sm font-sans text-[var(--color-ink)] focus:border-[var(--color-stamp)] focus:outline-none"
          >
            {countryOptions.map((c) => (
              <option key={c.country} value={c.country}>
                {c.country} ({c.currency})
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Currency Symbol" required error={errors.currency}>
          <select
            value={config.currency}
            onChange={(e) => onChange('currency', e.target.value)}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-paper-light)] p-2.5 text-sm font-mono text-[var(--color-ink)] focus:border-[var(--color-stamp)] focus:outline-none"
          >
            {currencyOptions.map((curr) => (
              <option key={curr.value} value={curr.value}>
                {curr.label}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      <FormField label="Timezone" error={errors.timezone}>
        <select
          value={config.timezone}
          onChange={(e) => onChange('timezone', e.target.value)}
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-paper-light)] p-2.5 text-sm font-mono text-[var(--color-ink)] focus:border-[var(--color-stamp)] focus:outline-none"
        >
          {timezoneOptions.map((tz) => (
            <option key={tz.value} value={tz.value}>
              {tz.label}
            </option>
          ))}
        </select>
      </FormField>

      <FormField
        label="Plant / Factory Location (Optional)"
        hint="Optional facility address or industrial area location for dispatch notes"
      >
        <input
          type="text"
          value={config.plantLocation}
          onChange={(e) => onChange('plantLocation', e.target.value)}
          placeholder="e.g. Unit 4, Industrial Zone, Phase II"
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-paper-light)] p-2.5 text-sm font-sans text-[var(--color-ink)] focus:border-[var(--color-stamp)] focus:outline-none"
        />
      </FormField>
    </div>
  )
}
