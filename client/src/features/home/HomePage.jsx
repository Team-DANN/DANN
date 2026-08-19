import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Package, TrendingUp, TrendingDown, Wallet, Bell, ArrowRight, PartyPopper } from 'lucide-react'
import { mockUser, mockRunway, mockWeeklyMargin, mockReceivables } from '../../lib/mockData.js'
import { useAlerts } from '../../context/useAlerts.js'

function getGreeting(hour) {
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function Card({ icon: Icon, label, to, children }) {
  const content = (
    <>
      <div className="mb-2 flex items-center gap-2 text-[var(--color-ink-muted)]">
        <Icon size={16} strokeWidth={2} />
        <span className="text-sm font-medium">{label}</span>
      </div>
      {children}
    </>
  )

  const className =
    'rounded-2xl border border-[var(--color-border)] bg-[var(--color-paper-light)] p-5 shadow-sm'

  if (!to) return <div className={className}>{content}</div>

  return (
    <Link
      to={to}
      className={`${className} block transition-colors hover:border-[var(--color-stamp)] active:bg-[var(--color-paper)]`}
    >
      {content}
    </Link>
  )
}

export default function HomePage() {
  const [now, setNow] = useState(new Date())
  const { alerts } = useAlerts()

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  const firstName = mockUser.name.split(' ')[0]
  const greeting = getGreeting(now.getHours())
  const dateLabel = now.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  const hasReceivables = mockReceivables.amount > 0
  const hasAlerts = alerts.length > 0

  // Trend direction and color are both derived from the raw number —
  // no string parsing, so the sign/color/icon can never drift out of sync.
  const isTrendDown = mockWeeklyMargin.trend < 0
  const TrendIcon = isTrendDown ? TrendingDown : TrendingUp
  const trendLabel = `${mockWeeklyMargin.trend > 0 ? '+' : ''}${mockWeeklyMargin.trend}%`

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-2">
        <h1 className="font-sans text-xl font-bold leading-snug text-[var(--color-ink)] sm:text-2xl">
          {greeting}, {firstName}
        </h1>
        <p className="text-sm text-[var(--color-ink-muted)]">{dateLabel}</p>
      </div>

      <Link
        to="/production"
        className="flex items-center justify-between rounded-xl bg-[var(--color-stamp)] px-5 py-4 font-sans text-base font-semibold text-[var(--color-paper-light)] hover:bg-[var(--color-stamp-dark)]"
      >
        Log today's production
        <ArrowRight size={20} strokeWidth={2} />
      </Link>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card icon={Package} label="Material runway" to="/inventory">
          <p className="font-mono text-lg font-medium text-[var(--color-error)]">
            {mockRunway.material},{mockRunway.daysLeft} days left
          </p>
        </Card>

        <Card icon={TrendIcon} label="This week's margin" to="/finance">
          <p className="font-mono text-lg font-medium text-[var(--color-ink)]">
            ₹{mockWeeklyMargin.amount.toLocaleString('en-IN')}{' '}
            <span
              className={`text-sm ${
                isTrendDown ? 'text-[var(--color-error)]' : 'text-[var(--color-success)]'
              }`}
            >
              {trendLabel}
            </span>
          </p>
        </Card>

        <Card icon={Wallet} label="Outstanding receivables" to="/orders">
          {hasReceivables ? (
            <>
              <p className="font-mono text-lg font-medium text-[var(--color-ink)]">
                ₹{mockReceivables.amount.toLocaleString('en-IN')}
              </p>
              <p className="text-xs text-[var(--color-warning)]">
                {mockReceivables.overdueCount} overdue
              </p>
            </>
          ) : (
            <p className="text-sm text-[var(--color-success)]">All retailers paid up</p>
          )}
        </Card>

        <Card icon={Bell} label="Alerts">
          <p className="font-mono text-lg font-medium text-[var(--color-ink)]">
            {hasAlerts ? `${alerts.length} active` : 'None right now'}
          </p>
        </Card>
      </div>

      <div>
        <h2 className="mb-2 font-sans text-sm font-semibold text-[var(--color-ink-muted)]">
          Recent alerts
        </h2>
        {hasAlerts ? (
          <div className="flex flex-col gap-2">
            {alerts.map((alert) => (
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
    </div>
  )
}
