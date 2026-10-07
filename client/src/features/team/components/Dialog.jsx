import { useEffect } from 'react'
import { X } from 'lucide-react'

// Shared look for the Team screen's buttons and inputs.
export const primaryButton =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--color-stamp)] px-4 py-2 text-sm font-semibold text-[var(--color-paper-light)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50'

export const secondaryButton =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-paper)] px-4 py-2 text-sm font-medium text-[var(--color-ink)] transition-colors hover:bg-[var(--color-paper-light)] disabled:cursor-not-allowed disabled:opacity-50'

export const dangerButton =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--color-error)] px-4 py-2 text-sm font-semibold text-[var(--color-paper-light)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50'

export const inputClass =
  'w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-paper)] px-3 py-2 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:border-[var(--color-stamp)] focus:outline-none'

// A bottom sheet on phones, a centred card from `sm` up. Pass
// dismissible={false} for dialogs that must not be closed by accident
// (the one-time PIN).
export default function Dialog({ title, onClose, dismissible = true, children }) {
  useEffect(() => {
    if (!dismissible) return
    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [dismissible, onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (dismissible && event.target === event.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl border border-[var(--color-border)] bg-[var(--color-paper-light)] p-5 shadow-xl sm:max-w-md sm:rounded-2xl"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold text-[var(--color-ink)]">{title}</h2>
          {dismissible && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-md p-1 text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
            >
              <X size={18} />
            </button>
          )}
        </div>
        {children}
      </div>
    </div>
  )
}