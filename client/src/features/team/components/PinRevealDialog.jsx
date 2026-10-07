import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import Dialog, { primaryButton, secondaryButton } from './Dialog.jsx'

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

function CopyButton({ text, label }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    if (await copyText(text)) {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={`Copy ${label}`}
      className="rounded-md p-1.5 text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
    >
      {copied ? <Check size={16} /> : <Copy size={16} />}
    </button>
  )
}

function Detail({ label, value, large = false }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-paper)] px-3 py-2">
      <div className="min-w-0">
        <p className="text-xs text-[var(--color-ink-muted)]">{label}</p>
        <p
          className={`truncate font-mono text-[var(--color-ink)] ${
            large ? 'text-2xl font-semibold tracking-[0.3em]' : 'text-base'
          }`}
        >
          {value}
        </p>
      </div>
      <CopyButton text={value} label={label} />
    </div>
  )
}

// Shows the sign-in details once. Not dismissible except through "Done", so
// a stray click can't lose a PIN that can never be shown again.
export default function PinRevealDialog({ heading, person, pin, businessCode, onDone }) {
  const [copiedAll, setCopiedAll] = useState(false)

  const shareText = [
    'Sign in to DANN',
    `Business code: ${businessCode}`,
    `Username: ${person.username}`,
    `PIN: ${pin}`,
    `${window.location.origin}/dashboard/staff-login`,
  ].join('\n')

  async function handleCopyAll() {
    if (await copyText(shareText)) {
      setCopiedAll(true)
      setTimeout(() => setCopiedAll(false), 1500)
    }
  }

  return (
    <Dialog title={heading} onClose={onDone} dismissible={false}>
      <p className="text-sm text-[var(--color-ink-muted)]">
        Give {person.name} these details. The PIN is shown only once: DANN keeps a scrambled copy,
        so it cannot be shown again.
      </p>

      <div className="mt-4 flex flex-col gap-2">
        <Detail label="Business code" value={businessCode} />
        <Detail label="Username" value={person.username} />
        <Detail label="PIN" value={pin} large />
      </div>

      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={handleCopyAll} className={secondaryButton}>
          {copiedAll ? <Check size={16} /> : <Copy size={16} />}
          {copiedAll ? 'Copied' : 'Copy all details'}
        </button>
        <button type="button" onClick={onDone} className={primaryButton}>
          Done
        </button>
      </div>
    </Dialog>
  )
}