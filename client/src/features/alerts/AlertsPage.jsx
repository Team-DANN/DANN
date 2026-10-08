// PATH: src/features/alerts/AlertsPage.jsx
import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, PartyPopper } from 'lucide-react'
import { useAlerts } from '../../context/useAlerts.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { getAlertBadgeLabel, getAlertBadgeClass } from '../../lib/alertDisplay.js'

function formatWhen(value) {
  return new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
}

// Reachable only via the bell icon in TopBar — deliberately not in
// navLinks.js, so no nav link (sidebar, bottom nav, or drawer) ever
// points here.
export default function AlertsPage() {
  const { alerts, markAllRead } = useAlerts()
  const { access } = useAuth()

  // Viewing this page is what "reads" the notifications — clears the
  // bell badge on arrival, same behavior as most notification centers.
  useEffect(() => {
    markAllRead()
  }, [markAllRead])

  const hasAlerts = alerts.length > 0

  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      <Link
        to="/"
        className="flex items-center gap-2 text-sm font-medium text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] lg:gap-2.5 lg:text-base"
      >
        <ArrowLeft size={16} strokeWidth={2} className="lg:h-5 lg:w-5" />
        Back to Home
      </Link>

      {hasAlerts ? (
        <div className="flex flex-col gap-2 lg:grid lg:grid-cols-2 lg:gap-3">
          {alerts.map((alert) => {
            const isSignIn = alert.type === 'staff_login'
            const badgeLabel = isSignIn ? 'Sign-in' : getAlertBadgeLabel(alert)
            const badgeClass = isSignIn
              ? 'bg-[var(--color-stamp)]/15 text-[var(--color-stamp)]'
              : getAlertBadgeClass(alert)

            return (
              <div
                key={alert.id}
                className="flex items-start gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] px-4 py-3 shadow-sm lg:px-5 lg:py-4"
              >
                <span
                  className={`shrink-0 rounded px-2 py-0.5 font-mono text-xs font-semibold lg:px-2.5 lg:py-1 lg:text-sm ${badgeClass}`}
                >
                  {badgeLabel}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-[var(--color-ink)] lg:text-base">{alert.message}</p>
                  {isSignIn && (
                    <p className="mt-1 text-xs text-[var(--color-ink-muted)] lg:text-sm">
                      {formatWhen(alert.created_at)}
                      {access.canManageStaff && (
                        <>
                          {' · '}
                          <Link to="/team" className="font-medium text-[var(--color-stamp)] underline">
                            Review in Team
                          </Link>
                        </>
                      )}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-xl border border-dashed border-[var(--color-border)] px-4 py-4 text-[var(--color-ink-muted)] lg:px-5 lg:py-5">
          <PartyPopper size={18} strokeWidth={2} className="lg:h-5 lg:w-5" />
          <span className="text-sm lg:text-base">All caught up nothing needs your attention.</span>
        </div>
      )}
    </div>
  )
}