import { mockUser } from '../../../lib/mockData.js'

export function PlanSection() {
  return (
    <div className="flex flex-col gap-5">
      <h3 className="font-[Roboto_Slab] text-sm font-semibold text-[var(--color-ink)]">Plan</h3>

      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-paper-light)] p-4 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-ink-muted)]">
          Current plan
        </p>
        <p className="mt-1 font-[Roboto_Slab] text-lg font-semibold text-[var(--color-ink)]">
          {mockUser.plan}
        </p>
        <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
          Free while we're validating DANN with early bakeries. Paid tiers are coming soon.
        </p>
      </div>

      <button
        type="button"
        disabled
        className="cursor-not-allowed rounded-md border border-[var(--color-border)] bg-[var(--color-paper-light)] px-3 py-2 text-sm font-medium text-[var(--color-ink-muted)] opacity-60"
      >
        Upgrade — coming soon
      </button>
    </div>
  )
}