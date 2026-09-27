// PATH: src/features/onboarding/components/Step1CompanyInfo.jsx
import React from 'react'
import FormField from './FormField.jsx'
import { countryOptions } from '../../../lib/constants/countryOptions.js'

const timezoneOptions = [...new Set(countryOptions.map((country) => country.timezone))].sort()

export default function Step1CompanyInfo({ config, onChange, errors }) {
  const handleCountryChange = (event) => {
    const country = countryOptions.find((option) => option.name === event.target.value)
    if (!country) return

    onChange('country', country.name)
    onChange('currency', country.currency)
    onChange('timezone', country.timezone)
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="font-sans text-lg font-bold text-[var(--color-ink)]">Tell us about your company</h2>
        <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
          Start with the details DANN needs for your workspace.
        </p>
      </div>

      <FormField label="Company name" required error={errors.businessName}>
        <input
          type="text"
          value={config.businessName}
          onChange={(event) => onChange('businessName', event.target.value)}
          placeholder="e.g. Apex Precision Metals"
          autoComplete="organization"
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-paper-light)] p-2.5 text-sm font-sans text-[var(--color-ink)] focus:border-[var(--color-stamp)] focus:outline-none"
        />
      </FormField>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormField label="Country" required error={errors.country}>
          <select
            value={config.country}
            onChange={handleCountryChange}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-paper-light)] p-2.5 text-sm font-sans text-[var(--color-ink)] focus:border-[var(--color-stamp)] focus:outline-none"
          >
            {countryOptions.map((country) => (
              <option key={country.code} value={country.name}>
                {country.name}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Timezone">
          <select
            value={config.timezone}
            onChange={(event) => onChange('timezone', event.target.value)}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-paper-light)] p-2.5 text-sm font-mono text-[var(--color-ink)] focus:border-[var(--color-stamp)] focus:outline-none"
          >
            {timezoneOptions.map((timezone) => (
              <option key={timezone} value={timezone}>
                {timezone}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      <p className="rounded-lg border border-[var(--color-border)] bg-[var(--color-paper)]/40 px-3 py-2 text-xs text-[var(--color-ink-muted)]">
        Currency: <span className="font-mono font-semibold text-[var(--color-ink)]">{config.currency}</span>
      </p>

      <FormField label="Factory location" hint="Optional — add this later if you prefer.">
        <input
          type="text"
          value={config.plantLocation}
          onChange={(event) => onChange('plantLocation', event.target.value)}
          placeholder="e.g. Unit 4, Industrial Zone"
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-paper-light)] p-2.5 text-sm font-sans text-[var(--color-ink)] focus:border-[var(--color-stamp)] focus:outline-none"
        />
      </FormField>
    </div>
  )
}
