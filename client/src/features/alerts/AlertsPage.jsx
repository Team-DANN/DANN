import { Link } from 'react-router-dom'
import { ArrowLeft, PartyPopper } from 'lucide-react'
import { mockAlerts } from '../../lib/mockData.js'

// Reachable only via the bell icon in TopBar — deliberately not in
// navLinks.js, so no nav link (sidebar, bottom nav, or drawer) ever
// points here.
export default function AlertsPage() {
  const hasAlerts = mockAlerts.length > 0

  return (
    <div className="flex flex-col gap-4">
      <Link
        to="/"
        className="flex items-center gap-2 text-sm font-medium text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
      >
        <ArrowLeft size={16} strokeWidth={2} />
        Back to Home
      </Link>

      <h1 className="font-sans text-xl font-bold text-[var(--color-ink)]">Alerts</h1>

      {hasAlerts ? (
        <div className="flex flex-col gap-2">
          {mockAlerts.map((alert) => (
            <div
              key={alert.id}
              className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] px-4 py-3 shadow-sm"
            >
              <span
                className={`rounded px-2 py-0.5 font-mono text-xs font-semibold ${
                  alert.type === 'LOW'
                    ? 'bg-[var(--color-warning)] text-[var(--color-paper-light)]'
                    : 'bg-[var(--color-error)] text-[var(--color-paper-light)]'
                }`}
              >
                {alert.type}
              </span>
              <span className="text-sm text-[var(--color-ink)]">{alert.message}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-xl border border-dashed border-[var(--color-border)] px-4 py-4 text-[var(--color-ink-muted)]">
          <PartyPopper size={18} strokeWidth={2} />
          <span className="text-sm">All caught up — nothing needs your attention.</span>
        </div>
      )}
    </div>
  )
}