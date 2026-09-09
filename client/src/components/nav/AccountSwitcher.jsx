import { useState } from 'react'
import { Check, ChevronDown, Plus, Users } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import { getInitials } from '../../lib/utils/getInitials.js'

// Cross-app handoff: signup lives in frontend/ (separate Vite app,
// shared localStorage via the dev proxy / production rewrites — same
// trick AppShell.jsx relies on for its own /login redirect). The
// ?mode=add-account flag tells that app's SignupPage to call
// apiClient's addSession(token) + rememberAccount(user) after a
// successful registration instead of the normal setToken(token), so
// this account is added alongside whatever's already stored rather than
// replacing it, then redirect back here. EXACT PATH NOT YET CONFIRMED —
// needs frontend/'s router file to know the real signup route.
const ADD_ACCOUNT_URL = '/signup?mode=add-account'

// Same cross-app note applies here: a known account with no live session
// needs to sign in again. ?email= pre-fills the field once frontend/'s
// login page reads it — NOT CONFIRMED, needs that file too.
function loginUrlFor(email) {
  return `/login?email=${encodeURIComponent(email)}`
}

function AccountAvatar({ label }) {
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-stamp)] font-mono text-xs font-semibold text-[var(--color-paper-light)]">
      {getInitials(label)}
    </div>
  )
}

export function AccountSwitcher({ onNavigate }) {
  const { user, listAccounts, activeAccountId, hasLiveSession, switchAccount } = useAuth()
  const [open, setOpen] = useState(false)
  const [switching, setSwitching] = useState(false)

  const accounts = open ? listAccounts() : []
  const activeId = activeAccountId()

  function handleSelect(acc) {
    if (acc.user_id === activeId || switching) return
    if (hasLiveSession(acc.user_id)) {
      setSwitching(true)
      switchAccount(acc.user_id)
    } else {
      // Known but signed out — send to login with email ready, not a
      // silent switch, since there's no valid token to switch to.
      onNavigate?.()
      window.location.href = loginUrlFor(acc.email)
    }
  }

  function handleAddAccount() {
    onNavigate?.()
    window.location.href = ADD_ACCOUNT_URL
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm font-medium text-[var(--color-ink-muted)] hover:bg-[var(--color-paper)] hover:text-[var(--color-ink)] lg:px-4 lg:py-2.5 lg:text-base"
      >
        <span className="flex shrink-0 items-center gap-3">
          <Users size={18} strokeWidth={2} className="lg:h-5 lg:w-5" />
          Accounts
        </span>
        <span className="flex min-w-0 items-center gap-1.5 text-xs text-[var(--color-ink-muted)] lg:text-sm">
          <span className="max-w-[6rem] truncate lg:max-w-[8rem]">{user?.business_name}</span>
          <ChevronDown size={14} strokeWidth={2} className="shrink-0 lg:h-4 lg:w-4" />
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-10 mt-1.5 w-64 overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-paper-light)] shadow-lg">
          <div className="max-h-64 overflow-y-auto p-1.5">
            {accounts.map((acc) => {
              const isActive = acc.user_id === activeId
              const signedIn = hasLiveSession(acc.user_id)
              return (
                <button
                  key={acc.user_id}
                  type="button"
                  disabled={switching}
                  onClick={() => handleSelect(acc)}
                  className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2.5 text-left text-sm disabled:cursor-not-allowed disabled:opacity-60 ${
                    isActive
                      ? 'bg-[var(--color-stamp)] text-[var(--color-paper-light)]'
                      : 'text-[var(--color-ink)] hover:bg-[var(--color-paper)]'
                  }`}
                >
                  <AccountAvatar label={acc.business_name || acc.name} />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate font-medium">
                      {acc.business_name || acc.name || acc.email}
                    </span>
                    <span
                      className={`truncate text-xs ${isActive ? 'opacity-80' : 'opacity-60'}`}
                    >
                      {signedIn ? acc.email : `${acc.email} · Sign in again`}
                    </span>
                  </span>
                  {isActive && <Check size={16} strokeWidth={2} className="shrink-0" />}
                </button>
              )
            })}
          </div>

          <div className="border-t border-[var(--color-border)] p-1.5">
            <button
              type="button"
              onClick={handleAddAccount}
              className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm text-[var(--color-ink-muted)] hover:bg-[var(--color-paper)] hover:text-[var(--color-ink)]"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-dashed border-[var(--color-border)]">
                <Plus size={14} strokeWidth={2} />
              </span>
              Add account
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
