// PATH: src/features/ai-insights/chatbot/messages/ProposalCard.jsx

import { AlertCircle, Check, Loader2 } from 'lucide-react'
import { describeLine, proposalTitle } from './proposalFormat.js'

const FINISHED = {
  confirmed: { text: 'Confirmed', tone: 'success' },
  cancelled: { text: 'Cancelled. Nothing was changed.', tone: 'muted' },
  expired: { text: 'This proposal expired. Ask again and I will prepare a new one.', tone: 'muted' },
  superseded: { text: 'Replaced by a newer proposal below.', tone: 'muted' },
}

// The confirm card for a proposal. Nothing runs until Confirm is tapped; the
// parent calls POST /confirm and moves `proposalStatus` through
// pending, confirming, then confirmed, failed, expired, cancelled or superseded.
export default function ProposalCard({ message, onConfirm, onCancel, cooldownSeconds = 0 }) {
  const { proposal, proposalStatus: status, proposalError: error } = message
  const rows = (Array.isArray(proposal.lines) ? proposal.lines : []).map(describeLine)
  const warnings = Array.isArray(proposal.warnings) ? proposal.warnings : []

  const showActions = status === 'pending' || status === 'confirming'
  const busy = status === 'confirming'
  const waiting = cooldownSeconds > 0
  const finished = FINISHED[status]

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] p-3 lg:p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ink-muted)] lg:text-xs">
        {proposalTitle(proposal)}
      </p>

      {proposal.summary && (
        <p className="text-sm font-medium text-[var(--color-ink)] lg:text-base">{proposal.summary}</p>
      )}

      {warnings.length > 0 && (
        <ul
          role="alert"
          className="flex flex-col gap-1.5 rounded-lg border border-[var(--color-warning)] bg-[var(--color-paper)] p-2.5 text-sm text-[var(--color-ink)]"
        >
          {warnings.map((warning, i) => (
            <li key={i} className="flex items-start gap-2">
              <AlertCircle size={16} strokeWidth={2} className="mt-0.5 flex-shrink-0 text-[var(--color-warning)]" aria-hidden="true" />
              <span>{warning}</span>
            </li>
          ))}
        </ul>
      )}

      {rows.length > 0 && (
        <dl className="flex flex-col divide-y divide-[var(--color-border)] text-sm lg:text-base">
          {rows.map((row, i) => (
            <div
              key={i}
              className={`flex items-baseline justify-between gap-3 py-1.5 ${
                row.emphasis ? 'font-semibold text-[var(--color-stamp)]' : ''
              }`}
            >
              <dt className="text-[var(--color-ink-muted)]">{row.label}</dt>
              <dd className="text-right text-[var(--color-ink)]">
                {row.value}
                {row.note && (
                  <span className="block text-xs font-normal text-[var(--color-ink-muted)]">{row.note}</span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {error && (
        <p role="alert" className="text-sm text-[var(--color-error)]">
          {error}
        </p>
      )}

      {showActions && (
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => onCancel?.(message.id)}
            disabled={busy}
            className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm font-medium text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm?.(message.id)}
            disabled={busy || waiting}
            className="flex items-center gap-2 rounded-lg bg-[var(--color-ink)] px-4 py-2 text-sm font-medium text-[var(--color-paper)] transition-opacity disabled:opacity-40"
          >
            {busy && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
            {busy ? 'Confirming…' : waiting ? `Wait ${cooldownSeconds}s` : 'Confirm'}
          </button>
        </div>
      )}

      {finished && (
        <p
          className={`flex items-center gap-1.5 text-sm font-medium ${
            finished.tone === 'success' ? 'text-[var(--color-success)]' : 'text-[var(--color-ink-muted)]'
          }`}
        >
          {finished.tone === 'success' && <Check size={16} strokeWidth={2.5} aria-hidden="true" />}
          {finished.text}
        </p>
      )}
    </div>
  )
}