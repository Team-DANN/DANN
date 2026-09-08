import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../../../context/AuthContext.jsx'
import { clearHasAuthenticated } from '../../../lib/apiClient.js'
import { updateProfile, changePassword, deleteAccount } from '../../../lib/api/account.js'

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

export function AccountSection() {
  const { user, updateUser, logout } = useAuth()

  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [profileStatus, setProfileStatus] = useState('idle')
  const [profileError, setProfileError] = useState('')

  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [passwordStatus, setPasswordStatus] = useState('idle')
  const [passwordError, setPasswordError] = useState('')

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [showDeletePassword, setShowDeletePassword] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleteStatus, setDeleteStatus] = useState('idle')
  const [deleteError, setDeleteError] = useState('')

  const dirty = name !== user?.name || email !== user?.email

  async function handleSaveProfile() {
    setProfileStatus('saving')
    setProfileError('')
    try {
      const updated = await updateProfile({ name, email })
      updateUser(updated)
      setProfileStatus('saved')
      setTimeout(() => setProfileStatus('idle'), 1500)
    } catch (err) {
      setProfileStatus('error')
      setProfileError(err.message || 'Could not save changes')
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault()
    setPasswordStatus('saving')
    setPasswordError('')
    try {
      await changePassword({ current_password: currentPassword, new_password: newPassword })
      setPasswordStatus('saved')
      setCurrentPassword('')
      setNewPassword('')
      setShowCurrentPassword(false)
      setShowNewPassword(false)
      setTimeout(() => {
        setPasswordStatus('idle')
        setShowPasswordForm(false)
      }, 1200)
    } catch (err) {
      setPasswordStatus('error')
      setPasswordError(err.message || 'Could not change password')
    }
  }

  async function handleDeleteAccount() {
    setDeleteStatus('saving')
    setDeleteError('')
    try {
      await deleteAccount(deletePassword)
      logout()
      clearHasAuthenticated()
      window.location.href = '/'
    } catch (err) {
      setDeleteStatus('error')
      setDeleteError(err.message || 'Could not delete account')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="mb-3 font-[Roboto_Slab] text-sm font-semibold text-[var(--color-ink)]">
          Account
        </h3>
        <div className="flex flex-col gap-3">
          <Field label="Name">
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Email">
            <input
              type="email"
              className={inputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          {profileStatus === 'error' && (
            <p className="text-xs text-[var(--color-error)]">{profileError}</p>
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!dirty || profileStatus === 'saving'}
              onClick={handleSaveProfile}
              className="rounded-md bg-[var(--color-stamp)] px-3 py-2 text-sm font-medium text-[var(--color-paper-light)] shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              {profileStatus === 'saving' ? 'Saving…' : 'Save changes'}
            </button>
            {profileStatus === 'saved' && (
              <span className="text-xs text-[var(--color-ink-muted)]">Saved</span>
            )}
          </div>
        </div>
      </div>

      <div>
        <h3 className="mb-3 font-[Roboto_Slab] text-sm font-semibold text-[var(--color-ink)]">
          Password
        </h3>
        {!showPasswordForm ? (
          <button
            type="button"
            onClick={() => setShowPasswordForm(true)}
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-paper-light)] px-3 py-2 text-sm font-medium text-[var(--color-ink)] shadow-sm hover:bg-[var(--color-paper)]"
          >
            Change password
          </button>
        ) : (
          <form onSubmit={handleChangePassword} className="flex flex-col gap-3">
            <Field label="Current password">
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  required
                  className={`${inputClass} w-full pr-10`}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
                  aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
                >
                  {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </Field>

            <Field label="New password">
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  className={`${inputClass} w-full pr-10`}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
                  aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                >
                  {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </Field>

            {passwordStatus === 'error' && (
              <p className="text-xs text-[var(--color-error)]">{passwordError}</p>
            )}
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={passwordStatus === 'saving'}
                className="rounded-md bg-[var(--color-stamp)] px-3 py-2 text-sm font-medium text-[var(--color-paper-light)] shadow-sm disabled:opacity-50"
              >
                {passwordStatus === 'saving' ? 'Updating…' : 'Update password'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowPasswordForm(false)
                  setCurrentPassword('')
                  setNewPassword('')
                  setShowCurrentPassword(false)
                  setShowNewPassword(false)
                  setPasswordError('')
                }}
                className="text-sm font-medium text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
              >
                Cancel
              </button>
              {passwordStatus === 'saved' && (
                <span className="text-xs text-[var(--color-ink-muted)]">Updated</span>
              )}
            </div>
          </form>
        )}
      </div>

      <div className="rounded-lg border border-[var(--color-error)]/30 bg-[var(--color-error)]/5 p-4">
        <h3 className="mb-1 font-[Roboto_Slab] text-sm font-semibold text-[var(--color-error)]">
          Delete account
        </h3>
        <p className="mb-3 text-xs text-[var(--color-ink-muted)]">
          This deactivates your business and account. This can't be undone from the app contact
          support if you need it reversed.
        </p>
        {!showDeleteConfirm ? (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="rounded-md border border-[var(--color-error)]/40 px-3 py-2 text-sm font-medium text-[var(--color-error)] hover:bg-[var(--color-error)]/10"
          >
            Delete account
          </button>
        ) : (
          <div className="flex flex-col gap-3">
            <Field label="Confirm your password">
              <div className="relative">
                <input
                  type={showDeletePassword ? 'text' : 'password'}
                  className={`${inputClass} w-full pr-10`}
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowDeletePassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
                  aria-label={showDeletePassword ? 'Hide password' : 'Show password'}
                >
                  {showDeletePassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </Field>
            <Field label='Type "DELETE" to confirm'>
              <input
                className={inputClass}
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
              />
            </Field>
            {deleteStatus === 'error' && (
              <p className="text-xs text-[var(--color-error)]">{deleteError}</p>
            )}
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={
                  deleteConfirmText !== 'DELETE' || !deletePassword || deleteStatus === 'saving'
                }
                onClick={handleDeleteAccount}
                className="rounded-md bg-[var(--color-error)] px-3 py-2 text-sm font-medium text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleteStatus === 'saving' ? 'Deleting…' : 'Permanently delete'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setDeletePassword('')
                  setDeleteConfirmText('')
                  setDeleteError('')
                }}
                className="text-sm font-medium text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}