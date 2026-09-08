import { useState } from 'react'
import { Check, ChevronDown, Plus, UserPlus } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import { AddBusinessModal } from './AddBusinessModal.jsx'

export function BusinessSwitcher({ onNavigate }) {
  const { user, listBusinesses, switchBusiness } = useAuth()
  const [open, setOpen] = useState(false)
  const [businesses, setBusinesses] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [switching, setSwitching] = useState(false)

  async function handleToggle() {
    const next = !open
    setOpen(next)
    if (next && businesses === null) {
      setLoading(true)
      setError('')
      try {
        const data = await listBusinesses()
        setBusinesses(data)
      } catch (err) {
        setError(err.message || 'Could not load businesses')
      } finally {
        setLoading(false)
      }
    }
  }

  async function handleSelect(businessId) {
    if (businessId === user?.business_id || switching) return
    setSwitching(true)
    try {
      await switchBusiness(businessId)
      // switchBusiness reloads the page on success.
    } catch (err) {
      setSwitching(false)
      setError(err.message || 'Could not switch business')
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleToggle}
        className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm font-medium text-[var(--color-ink-muted)] hover:bg-[var(--color-paper)] hover:text-[var(--color-ink)] lg:px-4 lg:py-2.5 lg:text-base"
      >
        <span className="flex items-center gap-3">
          <UserPlus size={18} strokeWidth={2} className="lg:h-5 lg:w-5" />
          Workspace
        </span>
        <span className="flex items-center gap-1 text-xs text-[var(--color-ink-muted)] lg:text-sm">
          <span className="max-w-[7rem] truncate">{user?.business_name}</span>
          <ChevronDown size={14} strokeWidth={2} className="lg:h-4 lg:w-4" />
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-10 mt-1 max-h-64 w-56 overflow-y-auto rounded-md border border-[var(--color-border)] bg-[var(--color-paper-light)] p-1 shadow-lg">
          {loading && (
            <p className="px-2 py-1.5 text-sm text-[var(--color-ink-muted)]">Loading…</p>
          )}
          {error && <p className="px-2 py-1.5 text-xs text-[var(--color-error)]">{error}</p>}

          {businesses?.map((b) => (
            <button
              key={b.business_id}
              type="button"
              disabled={switching}
              onClick={() => handleSelect(b.business_id)}
              className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm disabled:cursor-not-allowed disabled:opacity-60 ${
                b.business_id === user?.business_id
                  ? 'bg-[var(--color-stamp)] text-[var(--color-paper-light)]'
                  : 'text-[var(--color-ink)] hover:bg-[var(--color-paper)]'
              }`}
            >
              <span className="truncate">{b.name}</span>
              {b.business_id === user?.business_id && <Check size={14} strokeWidth={2} />}
            </button>
          ))}

          <div className="my-1 border-t border-[var(--color-border)]" />

          <button
            type="button"
            onClick={() => {
              setOpen(false)
              setShowAddModal(true)
            }}
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-[var(--color-ink-muted)] hover:bg-[var(--color-paper)] hover:text-[var(--color-ink)]"
          >
            <Plus size={14} strokeWidth={2} />
            Add another business
          </button>
        </div>
      )}

      {showAddModal && (
        <AddBusinessModal
          onClose={() => {
            setShowAddModal(false)
            onNavigate?.()
          }}
        />
      )}
    </div>
  )
}
