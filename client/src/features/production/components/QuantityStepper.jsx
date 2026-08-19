import { Minus, Plus } from 'lucide-react'

// Replaces the custom on-screen keypad — the device's own numeric keyboard
// already does this better. Stepper covers the common "tap a few times"
// case; tapping the number itself opens the native keyboard for bigger jumps.
// Voice fills the same value in, no separate path.
export default function QuantityStepper({ value, onChange, step = 1 }) {
  const num = parseFloat(value) || 0

  function set(next) {
    onChange(Math.max(0, next).toString())
  }

  return (
    <div className="flex items-center justify-center gap-4">
      <button
        type="button"
        onClick={() => set(num - step)}
        aria-label="Decrease quantity"
        className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-paper-light)] text-[var(--color-ink)] active:bg-[var(--color-paper)]"
      >
        <Minus size={20} strokeWidth={2} />
      </button>

      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => {
          const next = e.target.value
          if (next === '' || /^\d*\.?\d*$/.test(next)) onChange(next)
        }}
        className="w-28 bg-transparent text-center font-mono text-5xl font-bold text-[var(--color-ink)] focus:outline-none"
      />

      <button
        type="button"
        onClick={() => set(num + step)}
        aria-label="Increase quantity"
        className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-paper-light)] text-[var(--color-ink)] active:bg-[var(--color-paper)]"
      >
        <Plus size={20} strokeWidth={2} />
      </button>
    </div>
  )
}
