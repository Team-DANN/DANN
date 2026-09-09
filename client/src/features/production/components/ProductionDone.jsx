import { PackageCheck, Repeat } from 'lucide-react'

// No auto-navigate-away timer — a mistaken entry (especially from voice)
// needs a real window to catch and undo, not a 1.5s redirect racing it.
// "Log another" stays on this screen's flow rather than forcing a trip
// back through Home — several interviewees make multiple varieties in
// one sitting (Deepak, Anita, Fatima).
export default function ProductionDone({ onUndo, onDone, onLogAnother }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center lg:gap-4 lg:py-24">
      <PackageCheck size={48} strokeWidth={1.5} className="text-[var(--color-success)] lg:h-16 lg:w-16" />
      <p className="font-sans text-lg font-semibold text-[var(--color-ink)] lg:text-2xl">
        Production logged
      </p>
      <p className="text-sm text-[var(--color-ink-muted)] lg:text-base">
        Materials deducted, finished stock updated.
      </p>

      <button
        type="button"
        onClick={onLogAnother}
        className="mt-3 flex items-center gap-2 rounded-xl bg-[var(--color-stamp)] px-5 py-3 font-sans text-sm font-semibold text-[var(--color-paper-light)] hover:bg-[var(--color-stamp-dark)] lg:mt-4 lg:gap-3 lg:px-7 lg:py-4 lg:text-base"
      >
        <Repeat size={16} strokeWidth={2} className="lg:h-5 lg:w-5" />
        Log another
      </button>

      <div className="mt-2 flex items-center gap-4 lg:mt-3 lg:gap-6">
        <button
          type="button"
          onClick={onUndo}
          className="text-sm font-medium text-[var(--color-error)] underline lg:text-base"
        >
          Undo this entry
        </button>
        <button
          type="button"
          onClick={onDone}
          className="text-sm font-medium text-[var(--color-ink-muted)] underline lg:text-base"
        >
          Back to Home
        </button>
      </div>
    </div>
  )
}