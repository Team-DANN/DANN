import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import Dialog, { dangerButton, primaryButton, secondaryButton } from './Dialog.jsx'

// Used for "Remove" and "Reset PIN". `onConfirm` may throw; the message is
// shown inside the dialog. On success the caller closes or replaces it.
export default function ConfirmDialog({ title, body, confirmLabel, danger = false, onConfirm, onClose }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleConfirm() {
    setBusy(true)
    setError('')
    try {
      await onConfirm()
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <Dialog title={title} onClose={busy ? () => {} : onClose}>
      <p className="text-sm text-[var(--color-ink-muted)]">{body}</p>

      {error && (
        <p role="alert" className="mt-3 text-sm text-[var(--color-error)]">
          {error}
        </p>
      )}

      <div className="mt-5 flex justify-end gap-2">
        <button type="button" onClick={onClose} disabled={busy} className={secondaryButton}>
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={busy}
          className={danger ? dangerButton : primaryButton}
        >
          {busy && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
          {confirmLabel}
        </button>
      </div>
    </Dialog>
  )
}