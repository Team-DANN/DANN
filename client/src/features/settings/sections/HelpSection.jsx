export function HelpSection() {
  return (
    <div className="flex flex-col gap-5">
      <h3 className="font-[Roboto_Slab] text-sm font-semibold text-[var(--color-ink)]">Help</h3>
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => console.log('open help center')}
          className="rounded-md border border-[var(--color-border)] bg-[var(--color-paper-light)] px-3 py-2.5 text-left text-sm font-medium text-[var(--color-ink)] shadow-sm hover:bg-[var(--color-paper)]"
        >
          Visit help center
        </button>
        <button
          type="button"
          onClick={() => console.log('contact support')}
          className="rounded-md border border-[var(--color-border)] bg-[var(--color-paper-light)] px-3 py-2.5 text-left text-sm font-medium text-[var(--color-ink)] shadow-sm hover:bg-[var(--color-paper)]"
        >
          Contact support
        </button>
      </div>
      <p className="text-xs text-[var(--color-ink-muted)]">DANN v0.1 — early access</p>
    </div>
  )
}