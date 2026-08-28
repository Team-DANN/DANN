// PATH: src/features/home/HomePage.jsx

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

// `feature` only changes sizing (padding/type scale) at lg+ — below that
// breakpoint every card renders identically, matching the existing mobile
// layout exactly. Nothing about mobile/tablet changes here.
function Card({ icon: Icon, label, to, feature = false, children }) {
  const content = (
    <>
      <div
        className={`mb-2 flex items-center gap-2 text-[var(--color-ink-muted)] ${
          feature ? 'lg:mb-4 lg:gap-3' : 'lg:mb-2.5 lg:gap-2.5'
        }`}
      >
        <Icon size={16} strokeWidth={2} className={feature ? 'lg:h-6 lg:w-6' : 'lg:h-[18px] lg:w-[18px]'} />
        <span className={`text-sm font-medium ${feature ? 'lg:text-lg' : 'lg:text-base'}`}>{label}</span>
      </div>
      {children}
    </>
  )

  const className = `rounded-2xl border border-[var(--color-border)] bg-[var(--color-paper-light)] p-5 shadow-sm ${
    feature ? 'lg:p-8 xl:p-10' : 'lg:p-6'
  }`

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
    <div className="flex flex-col gap-6 lg:gap-8">
      <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-2">
        <h1 className="font-sans text-xl font-bold leading-snug text-[var(--color-ink)] sm:text-2xl lg:text-3xl xl:text-4xl">
          {greeting}, {firstName}
        </h1>
        <p className="text-sm text-[var(--color-ink-muted)] lg:text-base">{dateLabel}</p>
      </div>

      <Link
        to="/production"
        className="flex items-center justify-between rounded-xl bg-[var(--color-stamp)] px-5 py-4 font-sans text-base font-semibold text-[var(--color-paper-light)] hover:bg-[var(--color-stamp-dark)] lg:px-7 lg:py-5 lg:text-lg"
      >
        Log today's production
        <ArrowRight size={20} strokeWidth={2} className="lg:h-6 lg:w-6" />
      </Link>

      {/*
        Below lg: identical to before — grid-cols-1, then sm:grid-cols-2,
        every card the same size.
        At lg+: a 4-column bento. Material runway + Weekly margin are the
        two numbers worth acting on, so they get col-span-2 and the
        `feature` sizing (bigger padding/type). Receivables + Alerts stay
        col-span-2 as well (still wider than mobile, still readable at a
        glance) but keep compact sizing — they're a status check, not a
        decision point.
      */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
        <div className="lg:col-span-2">
          <Card icon={Package} label="Material runway" to="/inventory" feature>
            <p className="font-mono text-lg font-medium text-[var(--color-error)] lg:text-3xl xl:text-4xl">
              {mockRunway.material} {mockRunway.daysLeft} days left
            </p>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card icon={TrendIcon} label="This week's margin" to="/finance" feature>
            <p className="font-mono text-lg font-medium text-[var(--color-ink)] lg:text-3xl xl:text-4xl">
              ₹{mockWeeklyMargin.amount.toLocaleString('en-IN')}{' '}
              <span
                className={`text-sm lg:text-lg ${
                  isTrendDown ? 'text-[var(--color-error)]' : 'text-[var(--color-success)]'
                }`}
              >
                {trendLabel}
              </span>
            </p>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card icon={Wallet} label="Outstanding receivables" to="/orders">
            {hasReceivables ? (
              <>
                <p className="font-mono text-lg font-medium text-[var(--color-ink)] lg:text-xl">
                  ₹{mockReceivables.amount.toLocaleString('en-IN')}
                </p>
                <p className="text-xs text-[var(--color-warning)] lg:text-sm">
                  {mockReceivables.overdueCount} overdue
                </p>
              </>
            ) : (
              <p className="text-sm text-[var(--color-success)] lg:text-base">All retailers paid up</p>
            )}
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card icon={Bell} label="Alerts" to="alerts">
            <p className="font-mono text-lg font-medium text-[var(--color-ink)] lg:text-xl">
              {hasAlerts ? `${alerts.length} active` : 'None right now'}
            </p>
          </Card>
        </div>
      </div>

      <div>
        <h2 className="mb-2 font-sans text-sm font-semibold text-[var(--color-ink-muted)] lg:mb-3 lg:text-base">
          Recent alerts
        </h2>
        {hasAlerts ? (
          // Below lg: single column, same as before. At lg+, two columns
          // so a wide screen doesn't stretch each alert row into a mostly
          // empty bar — this is the "rows don't make sense" case.
          <div className="flex flex-col gap-2 lg:grid lg:grid-cols-2 lg:gap-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] px-4 py-3 shadow-sm lg:px-5 lg:py-4"
              >
                <span
                  className={`rounded px-2 py-0.5 font-mono text-xs font-semibold lg:px-2.5 lg:py-1 lg:text-sm ${
                    alert.type === 'LOW'
                      ? 'bg-[var(--color-warning)] text-[var(--color-paper-light)]'
                      : 'bg-[var(--color-error)] text-[var(--color-paper-light)]'
                  }`}
                >
                  {alert.type}
                </span>
                <span className="text-sm text-[var(--color-ink)] lg:text-base">{alert.message}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-xl border border-dashed border-[var(--color-border)] px-4 py-4 text-[var(--color-ink-muted)] lg:px-5 lg:py-5">
            <PartyPopper size={18} strokeWidth={2} className="lg:h-5 lg:w-5" />
            <span className="text-sm lg:text-base">All caught up — nothing needs your attention.</span>
          </div>
        )}
      </div>
    </div>
  )
}