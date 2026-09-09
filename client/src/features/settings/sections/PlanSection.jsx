import { useAuth } from '../../../context/AuthContext.jsx'

const PLAN_DETAILS = {
  Free: {
    priceLabel: 'Free',
    description:
      "Free while we're validating DANN with early bakeries. Paid tiers are coming soon.",
    features: ['Unlimited materials & products', 'Runway & payment alerts', 'Production logging'],
  },
}

export function PlanSection() {
  const { user } = useAuth()
  const tier = user?.plan_tier || 'Free'
  const plan = PLAN_DETAILS[tier] || PLAN_DETAILS.Free

  return (
    <div className="flex flex-col gap-5">
      <h3 className="font-[Roboto_Slab] text-sm font-semibold text-[var(--color-ink)]">Plan</h3>

      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-paper-light)] p-4 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-ink-muted)]">
          Current plan
        </p>
        <p className="mt-1 font-[Roboto_Slab] text-lg font-semibold text-[var(--color-ink)]">
          {tier} — {plan.priceLabel}
        </p>
        <p className="mt-1 text-xs text-[var(--color-ink-muted)]">{plan.description}</p>
        <ul className="mt-3 flex flex-col gap-1">
          {plan.features.map((f) => (
            <li key={f} className="text-xs text-[var(--color-ink-muted)]">
              • {f}
            </li>
          ))}
        </ul>
      </div>

      <button
        type="button"
        disabled
        className="cursor-not-allowed rounded-md border border-[var(--color-border)] bg-[var(--color-paper-light)] px-3 py-2 text-sm font-medium text-[var(--color-ink-muted)] opacity-60"
      >
        Upgrade coming soon
      </button>
    </div>
  )
}