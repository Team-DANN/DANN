import { useState } from 'react'
import { Loader2, UserPlus } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import { useStaff } from './hooks/useStaff.js'
import { removeStaff, resetStaffPin } from '../../lib/api/staff.js'
import StaffRow from './components/StaffRow.jsx'
import StaffFormDialog from './components/StaffFormDialog.jsx'
import PinRevealDialog from './components/PinRevealDialog.jsx'
import ConfirmDialog from './components/ConfirmDialog.jsx'
import { primaryButton, secondaryButton } from './components/Dialog.jsx'

// Staff management for the owner and managers (the route is adminOnly).
// `dialog` holds whichever dialog is open:
//   { type: 'add' }
//   { type: 'edit', person }
//   { type: 'reset', person }
//   { type: 'remove', person }
//   { type: 'pin', heading, person, pin, businessCode }
export default function TeamPage() {
  const { user, access } = useAuth()
  const { staff, businessCode, loading, error, refetch } = useStaff()
  const [dialog, setDialog] = useState(null)

  const people = staff.filter((p) => p.role !== 'owner')
  const active = people.filter((p) => p.status === 'active')
  const removed = people.filter((p) => p.status !== 'active')

  const closeDialog = () => setDialog(null)

  function handleAdded(result) {
    refetch()
    setDialog({
      type: 'pin',
      heading: 'Person added',
      person: result.staff,
      pin: result.pin,
      businessCode: result.business_code,
    })
  }

  function handleEdited() {
    refetch()
    closeDialog()
  }

  async function confirmReset(person) {
    const { pin } = await resetStaffPin(person.id)
    refetch()
    setDialog({ type: 'pin', heading: 'New PIN', person, pin, businessCode })
  }

  async function confirmRemove(person) {
    await removeStaff(person.id)
    await refetch()
    closeDialog()
  }

  const rowProps = {
    isOwner: access.isOwner,
    onEdit: (person) => setDialog({ type: 'edit', person }),
    onResetPin: (person) => setDialog({ type: 'reset', person }),
    onRemove: (person) => setDialog({ type: 'remove', person }),
  }

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-sans text-xl font-bold text-[var(--color-ink)] sm:text-2xl lg:text-3xl xl:text-4xl">
          Team
        </h1>
        <button type="button" onClick={() => setDialog({ type: 'add' })} className={primaryButton}>
          <UserPlus size={16} aria-hidden="true" />
          Add person
        </button>
      </div>

      {businessCode && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] p-4">
          <p className="text-sm text-[var(--color-ink-muted)]">Business code</p>
          <p className="font-mono text-2xl font-semibold tracking-[0.25em] text-[var(--color-ink)]">
            {businessCode}
          </p>
          <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
            Your team signs in at /dashboard/staff-login with this code, their username and their PIN.
          </p>
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-sm text-[var(--color-ink-muted)]">
          <Loader2 size={16} className="animate-spin" aria-hidden="true" />
          Loading your team
        </div>
      )}

      {!loading && error && (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-[var(--color-border)] p-4">
          <p role="alert" className="text-sm text-[var(--color-error)]">
            {error}
          </p>
          <button type="button" onClick={refetch} className={secondaryButton}>
            Try again
          </button>
        </div>
      )}

      {!loading && !error && active.length === 0 && (
        <div className="rounded-xl border border-dashed border-[var(--color-border)] p-8 text-center">
          <p className="font-semibold text-[var(--color-ink)]">No one on your team yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-[var(--color-ink-muted)]">
            Add a person to give them a PIN and choose which modules they can use.
          </p>
          <button
            type="button"
            onClick={() => setDialog({ type: 'add' })}
            className={`${primaryButton} mt-4`}
          >
            <UserPlus size={16} aria-hidden="true" />
            Add your first person
          </button>
        </div>
      )}

      {!loading && !error && active.length > 0 && (
        <ul className="flex flex-col gap-3">
          {active.map((person) => (
            <StaffRow key={person.id} person={person} isSelf={person.id === user?.user_id} {...rowProps} />
          ))}
        </ul>
      )}

      {!loading && !error && removed.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-base font-semibold text-[var(--color-ink-muted)]">Removed</h2>
          <ul className="flex flex-col gap-3">
            {removed.map((person) => (
              <StaffRow key={person.id} person={person} isSelf={false} {...rowProps} />
            ))}
          </ul>
        </section>
      )}

      {dialog?.type === 'add' && (
        <StaffFormDialog mode="add" isOwner={access.isOwner} onClose={closeDialog} onSaved={handleAdded} />
      )}

      {dialog?.type === 'edit' && (
        <StaffFormDialog
          mode="edit"
          person={dialog.person}
          isOwner={access.isOwner}
          onClose={closeDialog}
          onSaved={handleEdited}
        />
      )}

      {dialog?.type === 'reset' && (
        <ConfirmDialog
          title={`Reset PIN for ${dialog.person.name}?`}
          body="This makes a new PIN and the old one stops working. You can only do this until they sign in for the first time."
          confirmLabel="Generate new PIN"
          onConfirm={() => confirmReset(dialog.person)}
          onClose={closeDialog}
        />
      )}

      {dialog?.type === 'remove' && (
        <ConfirmDialog
          danger
          title={`Remove ${dialog.person.name}?`}
          body="They are signed out straight away and can't sign in again. Everything they logged stays in your business, and their username becomes free to use again. If they only forgot their PIN, remove them and add them again."
          confirmLabel="Remove access"
          onConfirm={() => confirmRemove(dialog.person)}
          onClose={closeDialog}
        />
      )}

      {dialog?.type === 'pin' && (
        <PinRevealDialog
          heading={dialog.heading}
          person={dialog.person}
          pin={dialog.pin}
          businessCode={dialog.businessCode}
          onDone={closeDialog}
        />
      )}
    </div>
  )
}