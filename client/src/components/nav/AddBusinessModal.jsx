import { useState } from 'react'
import { X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import { businessTypeOptions } from '../../lib/constants/businessTypeOptions.js'
import { countryOptions } from '../../lib/constants/countryOptions.js'
import { currencyOptions } from '../../lib/constants/currencyOptions.js'

const inputClass =
  'rounded-md border border-[var(--color-border)] bg-[var(--color-paper-light)] px-3 py-2.5 text-sm text-[var(--color-ink)] shadow-sm outline-none focus:border-[var(--color-verdigris-dark)] focus:ring-1 focus:ring-[var(--color-verdigris-dark)] disabled:opacity-60'

export function AddBusinessModal({ onClose }) {
  const { createBusiness } = useAuth()
  const [name, setName] = useState('')
  const [type, setType] = useState(businessTypeOptions[0].slug)
  const [customType, setCustomType] = useState('')
  const [country, setCountry] = useState('India')
  const [currency, setCurrency] = useState('₹')
  const [currencyTouched, setCurrencyTouched] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  function handleCountryChange(e) {
    const selected = e.target.value
    setCountry(selected)
    if (!currencyTouched) {
      const match = countryOptions.find((c) => c.name === selected)
      if (match) setCurrency(match.currency)
    }
  }

  function handleCurrencyChange(e) {
    setCurrencyTouched(true)
    setCurrency(e.target.value)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) {
      setError('Business name is required')
      return
    }
    if (type === 'other' && !customType.trim()) {
      setError('Please describe your business type')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await createBusiness({
        business_name: name.trim(),
        type: type === 'other' ? customType.trim() : type,
        country,
        currency,
      })
      // createBusiness reloads the page on success — nothing else to do.
    } catch (err) {
      setSubmitting(false)
      setError(err.message || 'Could not create business')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-[var(--color-paper-light)] p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-[Roboto_Slab] text-base font-semibold text-[var(--color-ink)]">
            Add a business
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-[var(--color-ink-muted)] hover:bg-[var(--color-paper)]"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[var(--color-ink-muted)]">
              Business name
            </label>
            <input
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[var(--color-ink-muted)]">
              Business type
            </label>
            <select className={inputClass} value={type} onChange={(e) => setType(e.target.value)}>
              {businessTypeOptions.map((t) => (
                <option key={t.slug} value={t.slug}>
                  {t.label}
                </option>
              ))}
            </select>
            {type === 'other' && (
              <input
                className={inputClass}
                placeholder="Describe your business type"
                value={customType}
                onChange={(e) => setCustomType(e.target.value)}
              />
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[var(--color-ink-muted)]">Country</label>
            <select className={inputClass} value={country} onChange={handleCountryChange}>
              {countryOptions.map((c) => (
                <option key={c.code} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[var(--color-ink-muted)]">Currency</label>
            <select className={inputClass} value={currency} onChange={handleCurrencyChange}>
              {currencyOptions.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {error && <p className="text-xs text-[var(--color-error)]">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="mt-1 rounded-md bg-[var(--color-stamp)] px-3 py-2.5 text-sm font-medium text-[var(--color-paper-light)] shadow-sm disabled:opacity-50"
          >
            {submitting ? 'Creating…' : 'Create business'}
          </button>
        </form>
      </div>
    </div>
  )
}
