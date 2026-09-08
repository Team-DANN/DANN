import { useEffect, useState } from 'react'
import { getBusinessProfile, updateBusinessProfile } from '../../../lib/api/business.js'
import { currencyOptions } from '../../../lib/constants/currencyOptions.js'

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

const BUSINESS_TYPES = ['Bakery', 'Confectionery', 'Cloud kitchen', 'Cafe', 'Other']

export function BusinessProfileSection() {
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

  async function handleSave() {
    setSaveStatus('saving')
    setSaveError('')
    try {
      const updated = await updateBusinessProfile({
        name: business.name,
        type: business.type,
        timezone: business.timezone,
        currency: business.currency,
      })
      setBusiness(updated)
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
          <select className={inputClass} value={business.type || ''} onChange={update('type')}>
            {BUSINESS_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Timezone">
          <input
            className={inputClass}
            value={business.timezone || ''}
            onChange={update('timezone')}
          />
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
            Set automatically from your country at signup change it here any time.
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