// PATH: src/features/production/components/VoiceLogButton.jsx
import { Mic } from 'lucide-react'

// Not wired up yet — STT + intent parsing come later. Deliberately inert:
// no mock transcripts, no fake results, no hook. Just a disabled affordance
// so the layout stays put once the real thing lands. Swap the `disabled`
// button body for the old listening/parsing/result states when there's a
// real provider behind it.
export default function VoiceLogButton() {
  return (
    <button
      type="button"
      disabled
      className="flex items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] px-4 py-3 text-sm font-medium text-[var(--color-ink-muted)] opacity-60 lg:gap-3 lg:px-6 lg:py-4 lg:text-base"
    >
      <Mic size={18} strokeWidth={2} className="lg:h-5 lg:w-5" />
      Log by voice (coming soon)
    </button>
  )
}