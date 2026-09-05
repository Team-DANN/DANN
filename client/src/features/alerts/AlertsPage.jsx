// PATH: src/features/alerts/AlertsPage.jsx
import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, PartyPopper } from 'lucide-react'
import { useAlerts } from '../../context/useAlerts.js'
import { getAlertBadgeLabel, getAlertBadgeClass } from '../../lib/alertDisplay.js'

// Reachable only via the bell icon in TopBar — deliberately not in
// navLinks.js, so no nav link (sidebar, bottom nav, or drawer) ever
// points here.
export default function AlertsPage() {
  const { alerts, markAllRead } = useAlerts()

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

      <h1 className="font-sans text-xl font-bold text-[var(--color-ink)] sm:text-2xl lg:text-3xl xl:text-4xl">
        Alerts
      </h1>

      {hasAlerts ? (
        <div className="flex flex-col gap-2 lg:grid lg:grid-cols-2 lg:gap-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] px-4 py-3 shadow-sm lg:px-5 lg:py-4"
            >
              <span
                className={`rounded px-2 py-0.5 font-mono text-xs font-semibold lg:px-2.5 lg:py-1 lg:text-sm ${getAlertBadgeClass(alert)}`}
              >
                {getAlertBadgeLabel(alert)}
              </span>
              <span className="text-sm text-[var(--color-ink)] lg:text-base">{alert.message}</span>
            </div>
          ))}
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