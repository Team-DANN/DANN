import { useEffect, useState } from 'react'
import { getBusinessProfile, updateBusinessProfile } from '../../../lib/api/business.js'
import { currencyOptions } from '../../../lib/constants/currencyOptions.js'
import { businessTypeOptions } from '../../../lib/constants/businessTypeOptions.js'
import { countryOptions } from '../../../lib/constants/countryOptions.js'
import { useAuth } from '../../../context/AuthContext.jsx'

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-[var(--color-ink-muted)]">{label}</label>
      {children}
    </div>
  )
}

const inputClass =
  'rounded-md border border-[var(--color-border)] bg-[var(--color-paper-light)] px-3 py-2.5 text-sm text-[var(--color-ink)] shadow-sm outline-none focus:border-[var(--color-verdigris-dark)] focus:ring-1 focus:ring-[var(--color-verdigris-dark)] disabled:opacity-60'

function formatBusinessType(type) {
  if (!type) return '—'
  const match = businessTypeOptions.find((t) => t.slug === type)
  if (match) return match.label
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatTimezone(timezone) {
  if (!timezone) return '—'
  return timezone.replace(/_/g, ' ').replace(/\//g, ' / ')
}

export function BusinessProfileSection() {
  const { updateUser } = useAuth()
  const [business, setBusiness] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [saveStatus, setSaveStatus] = useState('idle')
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setLoadError('')
      try {
        const data = await getBusinessProfile()
        if (!cancelled) setBusiness(data)
      } catch (err) {
        if (!cancelled) setLoadError(err.message || 'Could not load business profile')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  function update(key) {
    return (e) => setBusiness((b) => ({ ...b, [key]: e.target.value }))
  }

  function handleCountryChange(e) {
    const name = e.target.value
    const match = countryOptions.find((c) => c.name === name)
    setBusiness((b) => ({
      ...b,
      country: name,
      currency: match?.currency ?? b.currency,
      timezone: match?.timezone ?? b.timezone,
    }))
  }

  async function handleSave() {
    setSaveStatus('saving')
    setSaveError('')
    try {
      const updated = await updateBusinessProfile({
        name: business.name,
        country: business.country,
        currency: business.currency,
        timezone: business.timezone,
      })
      setBusiness(updated)
      // Business profile has its own local state above, but AuthContext's
      // `user` object (read by HomePage and anywhere else via useAuth())
      // is a separate cache set at login/hydrate. Without this patch,
      // currency changes here would only show up after a full reload —
      // same pattern AccountSection.jsx uses after its own saves.
      updateUser({ currency: updated.currency })
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 1500)
    } catch (err) {
      setSaveStatus('error')
      setSaveError(err.message || 'Could not save business profile')
    }
  }

  if (loading) {
    return <p className="text-sm text-[var(--color-ink-muted)]">Loading business profile…</p>
  }

  if (loadError) {
    return <p className="text-sm text-[var(--color-error)]">{loadError}</p>
  }

  return (
    <div className="flex flex-col gap-5">
      <h3 className="font-[Roboto_Slab] text-sm font-semibold text-[var(--color-ink)]">
        Business profile
      </h3>
      <div className="flex flex-col gap-3">
        <Field label="Business name">
          <input className={inputClass} value={business.name || ''} onChange={update('name')} />
        </Field>
        <Field label="Business type">
          <p className={`${inputClass} cursor-default select-text`}>
            {formatBusinessType(business.type)}
          </p>
          <p className="text-xs text-[var(--color-ink-muted)]">
            Set at signup and can't be changed here contact support if this needs to change.
          </p>
        </Field>
        <Field label="Country">
          <select
            className={inputClass}
            value={business.country || ''}
            onChange={handleCountryChange}
          >
            {!business.country && <option value="">Select a country</option>}
            {countryOptions.map((c) => (
              <option key={c.code} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-[var(--color-ink-muted)]">
            Changing this updates your default currency and timezone below.
          </p>
        </Field>
        <Field label="Timezone">
          <p className={`${inputClass} cursor-default select-text`}>
            {formatTimezone(business.timezone)}
          </p>
          <p className="text-xs text-[var(--color-ink-muted)]">
            Follows your country automatically change country above to update it.
          </p>
        </Field>
        <Field label="Currency">
          <select
            className={inputClass}
            value={business.currency || ''}
            onChange={update('currency')}
          >
            {currencyOptions.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-[var(--color-ink-muted)]">
            Set automatically from your country change it here any time.
          </p>
        </Field>
      </div>

      {saveStatus === 'error' && <p className="text-xs text-[var(--color-error)]">{saveError}</p>}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saveStatus === 'saving'}
          className="rounded-md bg-[var(--color-stamp)] px-3 py-2 text-sm font-medium text-[var(--color-paper-light)] shadow-sm disabled:opacity-50"
        >
          {saveStatus === 'saving' ? 'Saving…' : 'Save changes'}
        </button>
        {saveStatus === 'saved' && (
          <span className="text-xs text-[var(--color-ink-muted)]">Saved</span>
        )}
      </div>
    </div>
  )
}