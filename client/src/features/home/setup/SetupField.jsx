// PATH: src/features/home/setup/SetupField.jsx

export const inputClass =
  'w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] px-3 py-2.5 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:border-[var(--color-stamp)] focus:outline-none lg:py-3 lg:text-base'

// Label wraps its input so clicking the label focuses the field.
export default function SetupField({ label, hint, error, optional = false, children }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-baseline gap-1.5 text-xs font-medium text-[var(--color-ink-muted)] lg:text-sm">
        {label}
        {optional && <span className="font-normal opacity-70">(optional)</span>}
      </span>
      {children}
      {error ? (
        <span className="text-xs font-medium text-[var(--color-error)]">{error}</span>
      ) : hint ? (
        <span className="text-xs text-[var(--color-ink-muted)]">{hint}</span>
      ) : null}
    </label>
  )
}