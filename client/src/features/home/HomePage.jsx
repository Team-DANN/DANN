// PATH: src/features/home/HomePage.jsx

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Factory, Package, Truck, CircleDollarSign, ArrowUp, ArrowDown, AlertTriangle } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import { useAlerts } from '../../context/useAlerts.js'
import { useProducts } from '../production/hooks/useProducts.js'
import { useProductImage } from '../production/hooks/useProductImage.js'
import { useMaterials } from '../inventory/hooks/useMaterials.js'
import { getRunwayEstimate, RUNWAY_STATUS } from '../inventory/hooks/useRunwayEstimate.js'
import { useOrders } from '../orders/hooks/useOrders.js'
import { useRetailers } from '../orders/hooks/useRetailers.js'
import { getDispatchSummary, PAYMENT_STATUS } from '../orders/hooks/useReceivablesSummary.js'
import { useFinanceSummary, PERIOD_TYPES } from '../finance/hooks/useFinanceSummary.js'
import { formatCurrency } from '../../lib/formatCurrency.js'
import FirstSetupFlow from './setup/FirstSetupFlow.jsx'

function getGreeting(hour) {
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function Card({ icon: Icon, label, to, children }) {
  return (
    <Link
      to={to}
      className="flex min-h-[240px] flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-paper-light)] p-7 shadow-sm transition-colors hover:border-[var(--color-stamp)] active:bg-[var(--color-paper)] lg:min-h-[360px] lg:p-12"
    >
      <div className="mb-5 flex items-center gap-2.5 text-[var(--color-ink-muted)] lg:mb-7 lg:gap-3">
        <Icon size={20} strokeWidth={2} className="lg:h-7 lg:w-7" />
        <span className="text-base font-medium lg:text-xl">{label}</span>
      </div>
      <div className="flex flex-1 flex-col justify-center">{children}</div>
    </Link>
  )
}

function CardSkeleton() {
  return (
    <div className="min-h-[240px] animate-pulse rounded-2xl border border-[var(--color-border)] bg-[var(--color-paper-light)] p-7 shadow-sm lg:min-h-[360px] lg:p-12">
      <div className="mb-5 h-5 w-28 rounded bg-[var(--color-border)]" />
      <div className="h-24 w-full rounded bg-[var(--color-border)]" />
    </div>
  )
}

// A single row inside Inventory/Orders — own padding + a hairline divider
// beneath it, so the list reads as a small structured table rather than
// bare stacked lines with only `gap` between them.
function DataRow({ left, leftIcon: LeftIcon, right, rightClassName = 'text-[var(--color-ink-muted)]', isLast }) {
  return (
    <div
      className={`flex items-center justify-between gap-3 py-2.5 lg:py-3.5 ${
        !isLast ? 'border-b border-[var(--color-border)]' : ''
      }`}
    >
      <span className="flex min-w-0 items-center gap-1.5 truncate text-sm text-[var(--color-ink)] lg:text-base">
        {LeftIcon && <LeftIcon size={13} strokeWidth={2.5} className="flex-shrink-0 text-[var(--color-error)] lg:h-4 lg:w-4" />}
        <span className="truncate">{left}</span>
      </span>
      <span className={`flex-shrink-0 font-mono text-xs lg:text-sm ${rightClassName}`}>{right}</span>
    </div>
  )
}

// One Finance line — label left, value right, hairline divider beneath
// (except the last), so Revenue/Costs/Profit each sit on their own line.
function FinanceRow({ label, children, isLast }) {
  return (
    <div
      className={`flex items-baseline justify-between gap-3 py-3 lg:py-5 ${
        !isLast ? 'border-b border-[var(--color-border)]' : ''
      }`}
    >
      <span className="text-sm text-[var(--color-ink-muted)] lg:text-lg">{label}</span>
      {children}
    </div>
  )
}

// Same contract ProductTile.jsx already calls this hook with — reused
// as-is, not reimplemented, so Home's thumbnails behave identically to
// Production's (same image source, same loading/fallback states).
function ProductMiniThumb({ product }) {
  const { imageUrl, status } = useProductImage(product.name)
  return status === 'done' && imageUrl ? (
    <img src={imageUrl} alt={product.name} className="h-16 w-16 rounded-xl object-cover lg:h-24 lg:w-24" />
  ) : (
    <span className="flex h-16 w-16 items-center justify-center rounded-xl bg-[var(--color-paper)] text-[var(--color-ink-muted)] lg:h-24 lg:w-24">
      <Package size={22} strokeWidth={1.75} className="lg:h-8 lg:w-8" />
    </span>
  )
}

// Local worst-first ordering, same idea MaterialList.jsx's STATUS_RANK
// uses for its own sort — that map isn't exported from
// useRunwayEstimate.js, so this is a small local equivalent rather than
// a real import, kept only for picking which materials Home shows first.
const URGENCY_RANK = {
  [RUNWAY_STATUS.CRITICAL]: 0,
  [RUNWAY_STATUS.LOW]: 1,
  [RUNWAY_STATUS.UNKNOWN]: 2,
  [RUNWAY_STATUS.OK]: 3,
}

// Shared trend-arrow rendering — used for both the Profit row and the
// margin bar below it (see the margin-bar comment further down for why
// they currently share one number).
function TrendBadge({ percent }) {
  const hasTrend = percent !== null && percent !== undefined
  if (!hasTrend) return null
  const Arrow = percent < 0 ? ArrowDown : ArrowUp
  const cls = percent >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'
  return (
    <span className={`flex items-center gap-0.5 text-xs font-medium lg:text-sm ${cls}`}>
      <Arrow size={12} strokeWidth={2.5} className="lg:h-3.5 lg:w-3.5" />
      {Math.abs(percent)}%
    </span>
  )
}

export default function HomePage() {
  const [now, setNow] = useState(new Date())
  const { user } = useAuth()
  const currency = user?.currency || '₹'

  const { products, loading: productsLoading, refetch: refetchProducts } = useProducts()
  const { materials, loading: materialsLoading, refetch: refetchMaterials } = useMaterials()
  const { orders, loading: ordersLoading, refetch: refetchOrders } = useOrders()
  const { retailers, loading: retailersLoading, refetch: refetchRetailers } = useRetailers()
  const { refetch: refetchAlerts } = useAlerts()

  // WEEK, not MONTH — useFinanceSummary.js's getDateRange() already
  // handles PERIOD_TYPES.WEEK (last 7 days from today), same logic
  // PeriodFilter.jsx's "Last 7 days" preset uses on the Finance page
  // itself. defaultPeriod() always returns MONTH, so this is built
  // directly rather than through that helper.
  const { revenue, costs, profit, profitTrendPercent, loading: financeLoading } = useFinanceSummary({
    type: PERIOD_TYPES.WEEK,
  })

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  const firstName = user?.name ? user.name.split(' ')[0] : 'there'
  const greeting = getGreeting(now.getHours())
  const dateLabel = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })

  const sortedMaterials = [...materials].sort((a, b) => {
    const aEst = getRunwayEstimate(a)
    const bEst = getRunwayEstimate(b)
    const rankDiff = URGENCY_RANK[aEst.status] - URGENCY_RANK[bEst.status]
    if (rankDiff !== 0) return rankDiff
    if (aEst.runwayDays == null || bEst.runwayDays == null) return 0
    return aEst.runwayDays - bEst.runwayDays
  })
  const attentionMaterials = sortedMaterials.filter((m) => {
    const { status } = getRunwayEstimate(m)
    return status === RUNWAY_STATUS.LOW || status === RUNWAY_STATUS.CRITICAL
  })

  const retailerName = (id) => retailers.find((r) => r.id === id)?.name ?? 'Unknown retailer'

  // Overdue orders (past their credit window per getDispatchSummary's
  // isOverdue check) are pulled out and shown FIRST, ahead of everything
  // else that's merely unpaid/partial — those are the ones that won't
  // resolve on their own the way an in-window credit sale still might.
  // Remaining owing orders (still within credit terms) fill in after,
  // sorted by amount same as before. Both lists come from the same
  // owingOrders base, just partitioned.
  const owingOrders = orders.filter((o) => getDispatchSummary(o).status !== PAYMENT_STATUS.PAID)
  const overdueOrders = owingOrders
    .filter((o) => getDispatchSummary(o).overdue)
    .sort((a, b) => getDispatchSummary(b).remaining - getDispatchSummary(a).remaining)
  const inTermOwing = owingOrders
    .filter((o) => !getDispatchSummary(o).overdue)
    .sort((a, b) => getDispatchSummary(b).remaining - getDispatchSummary(a).remaining)
  const orderRows = [...overdueOrders, ...inTermOwing]

  const ready = !productsLoading && !materialsLoading && !ordersLoading && !retailersLoading

  // ---- First-run setup ----
  // "New account" = nothing created yet. Decided ONCE, then held: creating
  // the first product would otherwise flip this back to "not new" and
  // unmount the setup flow halfway through. Must sit below `ready` — the
  // effect reads it, and using it before its declaration throws.
  //
  // The key falls back through id/email so a user object without a
  // `user_id` field can't silently disable setup for everyone.
  const userKeyPart = user?.user_id ?? user?.id ?? user?.email ?? null
  const setupKey = userKeyPart ? `dann_first_setup_done_${userKeyPart}` : null
  const [setupState, setSetupState] = useState('unknown') // 'unknown' | 'active' | 'off'

  useEffect(() => {
    if (setupState !== 'unknown') return

    if (!setupKey) {
      // No usable ID on the user object — say so once, in dev only.
      if (import.meta.env.DEV && user) {
        console.warn('[first-setup] no id/email on user; fields present:', Object.keys(user))
      }
      return
    }
    if (!ready) return

    let alreadyDone = false
    try {
      alreadyDone = localStorage.getItem(setupKey) === '1'
    } catch {
      /* storage unavailable — treat as not done */
    }
    const isEmpty = products.length === 0 && materials.length === 0 && orders.length === 0
    const next = isEmpty && !alreadyDone ? 'active' : 'off'

    if (import.meta.env.DEV) {
      console.info('[first-setup] decision:', next, {
        setupKey,
        alreadyDone,
        products: products.length,
        materials: materials.length,
        orders: orders.length,
      })
    }
    setSetupState(next)
  }, [ready, setupKey, setupState, user, products.length, materials.length, orders.length])

  function markSetupDone() {
    try {
      if (setupKey) localStorage.setItem(setupKey, '1')
    } catch {
      /* ignore */
    }
  }

  function refreshAll() {
    refetchProducts()
    refetchMaterials()
    refetchOrders()
    refetchRetailers()
    refetchAlerts()
  }

  function handleSetupDone() {
    markSetupDone()
    refreshAll()
    setSetupState('off')
  }

  function handleSetupDismiss() {
    markSetupDone()
    setSetupState('off')
  }

  // While the decision is pending, show skeletons instead of the real
  // cards — otherwise a brand-new user sees the empty cards flash for a
  // frame before the setup flow replaces them.
  const deciding = setupState === 'unknown' && !!setupKey

  // Profit margin = profit as a % of revenue for the week — a new number,
  // not a restated one, since Revenue/Costs/Profit above already cover
  // the raw amounts. Guarded against revenue === 0 (no dispatches yet
  // this week) to avoid dividing by zero / showing NaN%.
  const hasMargin = revenue > 0
  const marginPercent = hasMargin ? Math.round((profit / revenue) * 100) : 0
  const marginBarWidth = Math.max(0, Math.min(100, marginPercent))

  // The margin bar's trend arrow reuses profitTrendPercent — there is no
  // separate margin-trend figure returned by useFinanceSummary (that
  // would need prior-period REVENUE too, which ReportService doesn't
  // currently return, only prior-period profit). So this shows "profit
  // trended up/down X%" again here, not a distinct margin calculation.

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-2">
        <h1 className="font-sans text-xl font-bold leading-snug text-[var(--color-ink)] sm:text-2xl lg:text-3xl xl:text-4xl">
          {greeting}, {firstName}
        </h1>
        <p className="text-sm text-[var(--color-ink-muted)] lg:text-base">{dateLabel}</p>
      </div>

      {setupState === 'active' ? (
        <FirstSetupFlow onDataChanged={refreshAll} onDone={handleSetupDone} onDismiss={handleSetupDismiss} />
      ) : deciding ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:gap-10">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:gap-10">
          {/* Production */}
          {!ready ? (
            <CardSkeleton />
          ) : (
            <Card icon={Factory} label="Production" to="/production">
              {products.length === 0 ? (
                <p className="text-sm text-[var(--color-ink-muted)] lg:text-lg">
                  No products yet — add your first one to start logging batches.
                </p>
              ) : (
                <>
                  <div className="mb-4 flex gap-3 lg:mb-6 lg:gap-5">
                    {products.slice(0, 4).map((p) => (
                      <ProductMiniThumb key={p.id} product={p} />
                    ))}
                  </div>
                  <p className="text-sm text-[var(--color-ink-muted)] lg:text-base">
                    {products.length} product{products.length === 1 ? '' : 's'}
                  </p>
                </>
              )}
            </Card>
          )}

          {/* Inventory */}
          {!ready ? (
            <CardSkeleton />
          ) : (
            <Card icon={Package} label="Inventory" to="/inventory">
              {materials.length === 0 ? (
                <p className="text-sm text-[var(--color-ink-muted)] lg:text-lg">
                  No materials tracked yet — add what you use to make your products.
                </p>
              ) : (
                <>
                  <p className="mb-3 text-sm text-[var(--color-ink-muted)] lg:mb-4 lg:text-base">
                    {materials.length} material{materials.length === 1 ? '' : 's'} tracked
                    {attentionMaterials.length > 0 && (
                      <span className="text-[var(--color-warning,#b45309)]"> · {attentionMaterials.length} need attention</span>
                    )}
                  </p>
                  <div className="flex flex-col">
                    {sortedMaterials.slice(0, 4).map((m, i, arr) => {
                      const est = getRunwayEstimate(m)
                      const isAttention = est.status === RUNWAY_STATUS.LOW || est.status === RUNWAY_STATUS.CRITICAL
                      return (
                        <DataRow
                          key={m.id}
                          left={m.name}
                          right={est.status === RUNWAY_STATUS.UNKNOWN ? `${m.qtyOnHand} ${m.unit}` : est.label}
                          rightClassName={isAttention ? 'text-[var(--color-warning,#b45309)]' : 'text-[var(--color-ink-muted)]'}
                          isLast={i === arr.length - 1}
                        />
                      )
                    })}
                  </div>
                </>
              )}
            </Card>
          )}

          {/* Orders — overdue (credit past due) shown first, flagged, ahead of in-term owing */}
          {!ready ? (
            <CardSkeleton />
          ) : (
            <Card icon={Truck} label="Orders" to="/orders">
              {orders.length === 0 ? (
                <p className="text-sm text-[var(--color-ink-muted)] lg:text-lg">
                  No dispatches yet — log one once you make a sale.
                </p>
              ) : (
                <>
                  <p className="mb-3 text-sm text-[var(--color-ink-muted)] lg:mb-4 lg:text-base">
                    {orders.length} dispatch{orders.length === 1 ? '' : 'es'} logged
                    {overdueOrders.length > 0 && (
                      <span className="text-[var(--color-error)]"> · {overdueOrders.length} overdue</span>
                    )}
                    {overdueOrders.length === 0 && owingOrders.length > 0 && (
                      <span className="text-[var(--color-warning,#b45309)]"> · {owingOrders.length} owe you</span>
                    )}
                  </p>
                  {orderRows.length === 0 ? (
                    <p className="text-sm text-[var(--color-success)] lg:text-base">All retailers paid up</p>
                  ) : (
                    <div className="flex flex-col">
                      {orderRows.slice(0, 4).map((o, i, arr) => {
                        const summary = getDispatchSummary(o)
                        return (
                          <DataRow
                            key={o.id}
                            left={retailerName(o.retailer_id)}
                            leftIcon={summary.overdue ? AlertTriangle : undefined}
                            right={`${formatCurrency(summary.remaining, currency)} due`}
                            rightClassName={summary.overdue ? 'text-[var(--color-error)]' : 'text-[var(--color-ink-muted)]'}
                            isLast={i === arr.length - 1}
                          />
                        )
                      })}
                    </div>
                  )}
                </>
              )}
            </Card>
          )}

          {/* Finance — Revenue/Costs/Profit for THIS WEEK + trend + margin bar w/ trend */}
          {financeLoading ? (
            <CardSkeleton />
          ) : (
            <Card icon={CircleDollarSign} label="Finance this week" to="/finance">
              <div className="flex flex-col">
                <FinanceRow label="Revenue">
                  <span className="font-mono text-lg font-semibold text-[var(--color-ink)] lg:text-3xl">
                    {formatCurrency(revenue, currency)}
                  </span>
                </FinanceRow>

                <FinanceRow label="Costs">
                  <span className="font-mono text-lg font-semibold text-[var(--color-ink)] lg:text-3xl">
                    {formatCurrency(costs, currency)}
                  </span>
                </FinanceRow>

                <FinanceRow label="Profit">
                  <span className="flex items-baseline gap-1.5">
                    <span
                      className={`font-mono text-lg font-semibold lg:text-3xl ${
                        profit >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'
                      }`}
                    >
                      {formatCurrency(profit, currency)}
                    </span>
                    <TrendBadge percent={profitTrendPercent} />
                  </span>
                </FinanceRow>

                <div className="pt-4 lg:pt-6">
                  <div className="mb-2 flex items-center justify-between lg:mb-3">
                    <span className="text-sm text-[var(--color-ink-muted)] lg:text-base">Profit margin</span>
                    <span className="flex items-baseline gap-1.5">
                      <span
                        className={`font-mono text-sm font-semibold lg:text-base ${
                          !hasMargin
                            ? 'text-[var(--color-ink-muted)]'
                            : marginPercent >= 0
                              ? 'text-[var(--color-success)]'
                              : 'text-[var(--color-error)]'
                        }`}
                      >
                        {hasMargin ? `${marginPercent}%` : 'No sales yet'}
                      </span>
                      {hasMargin && <TrendBadge percent={profitTrendPercent} />}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-paper)] lg:h-3">
                    <div
                      className={`h-full rounded-full ${marginPercent >= 0 ? 'bg-[var(--color-success)]' : 'bg-[var(--color-error)]'}`}
                      style={{ width: `${hasMargin ? marginBarWidth : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}