import { KeyRound, Pencil, UserMinus } from 'lucide-react'
import { secondaryButton } from './Dialog.jsx'

function Tag({ children, tone = 'plain' }) {
  const tones = {
    plain: 'border-[var(--color-border)] text-[var(--color-ink-muted)]',
    accent: 'border-[var(--color-stamp)]/40 bg-[var(--color-stamp)]/10 text-[var(--color-stamp)]',
  }
  return (
    <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  )
}

const actionButton = `${secondaryButton} !px-3 !py-1.5`

// One person. Which buttons show follows the backend's rules:
//   Edit        owner, or manager for staff (a manager can't change a manager)
//   Reset PIN   same, and only until the person's first sign-in
//   Remove      owner only
export default function StaffRow({ person, isSelf, isOwner, onEdit, onResetPin, onRemove }) {
  const removed = person.status !== 'active'
  const canAct = !removed && !isSelf && (isOwner || person.role !== 'manager')

  let statusText = 'Has not signed in yet'
  if (removed) {
    statusText = person.terminated_at
      ? `Removed on ${new Date(person.terminated_at).toLocaleDateString()}`
      : 'Removed'
  } else if (person.has_signed_in) {
    statusText = 'Has signed in'
  }

  return (
    <li
      className={`flex flex-col gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] p-4 sm:flex-row sm:items-center sm:justify-between ${
        removed ? 'opacity-60' : ''
      }`}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate font-semibold text-[var(--color-ink)]">{person.name}</span>
          {isSelf && <Tag>You</Tag>}
          <Tag tone={person.role === 'manager' ? 'accent' : 'plain'}>{person.label}</Tag>
        </div>
        <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
          <span className="font-mono">{person.username}</span>
        </p>
        <p className="text-xs text-[var(--color-ink-muted)]">{statusText}</p>
      </div>

      {canAct && (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => onEdit(person)} className={actionButton}>
            <Pencil size={14} aria-hidden="true" />
            Edit
          </button>

          {!person.has_signed_in && (
            <button type="button" onClick={() => onResetPin(person)} className={actionButton}>
              <KeyRound size={14} aria-hidden="true" />
              Reset PIN
            </button>
          )}

          {isOwner && (
            <button
              type="button"
              onClick={() => onRemove(person)}
              className={`${actionButton} hover:!text-[var(--color-error)]`}
            >
              <UserMinus size={14} aria-hidden="true" />
              Remove
            </button>
          )}
        </div>
      )}
    </li>
  )
}