// PATH: src/features/finance/components/ProfitTrendChart.jsx

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { useAuth } from '../../../context/AuthContext.jsx'
import { formatCurrency } from '../../../lib/formatCurrency.js'

function CustomTooltip({ active, payload, label, currency }) {
  if (!active || !payload?.length) return null
  const revenue = payload.find((p) => p.dataKey === 'revenue')?.value ?? 0
  const costs = payload.find((p) => p.dataKey === 'costs')?.value ?? 0
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-paper-light)] px-3 py-2 text-xs shadow-lg lg:px-4 lg:py-3 lg:text-sm">
      <p className="mb-1 font-medium text-[var(--color-ink)]">{label}</p>
      <p className="text-[var(--color-success)]">Revenue: {formatCurrency(revenue, currency)}</p>
      <p className="text-[var(--color-error)]">Costs: {formatCurrency(costs, currency)}</p>
      <p className="font-medium text-[var(--color-ink)]">Profit: {formatCurrency(revenue - costs, currency)}</p>
    </div>
  )
}

// A one-point period has nothing to draw a trend between — a flat message
// beats an empty/misleading chart.
export default function ProfitTrendChart({ trend }) {
  const { user } = useAuth()
  const currency = user?.currency || '₹'

  if (trend.length < 2) {
    return (
      <p className="rounded-xl border border-dashed border-[var(--color-border)] py-8 text-center text-sm text-[var(--color-ink-muted)] lg:py-12 lg:text-base">
        Not enough activity in this period to draw a trend.
      </p>
    )
  }

  return (
    <div className="h-56 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] p-3 lg:h-72 lg:p-5">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={trend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-stamp)" stopOpacity={0.35} />
              <stop offset="95%" stopColor="var(--color-stamp)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: 'var(--color-ink-muted)' }}
            axisLine={{ stroke: 'var(--color-border)' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'var(--color-ink-muted)' }}
            axisLine={false}
            tickLine={false}
            width={40}
            tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)}
          />
          <Tooltip content={<CustomTooltip currency={currency} />} />
          <Area type="monotone" dataKey="revenue" stroke="var(--color-stamp)" fill="url(#revenueFill)" strokeWidth={2} />
          <Area
            type="monotone"
            dataKey="costs"
            stroke="var(--color-error)"
            fill="transparent"
            strokeWidth={2}
            strokeDasharray="4 3"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}