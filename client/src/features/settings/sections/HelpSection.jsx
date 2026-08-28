import { useSettings } from '../../../context/SettingsContext.jsx'
import { useChatbot } from '../../ai-insights/chatbot/ChatbotContext.jsx'

const SUPPORT_EMAIL = 'infodannbusiness@gmail.com'

export function HelpSection() {
  const { close: closeSettings } = useSettings()
  const { openHelp } = useChatbot()

  function handleOpenHelp() {
    // Close the desktop Settings modal first — otherwise it'd sit on top
    // (z-50) of the chat panel (z-40) and hide it. Harmless on mobile,
    // where Settings isn't a modal in the first place.
    closeSettings()
    openHelp()
  }

  function handleContactSupport() {
    const subject = encodeURIComponent('DANN Support Request')
    const body = encodeURIComponent(
      `\n\n\nSent from DANN v0.1\n\nPlease describe your issue or question here...\n`
    )
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`
  }

  return (
    <div className="flex flex-col gap-5">
      <h3 className="font-[Roboto_Slab] text-sm font-semibold text-[var(--color-ink)]">Help</h3>
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={handleOpenHelp}
          className="rounded-md border border-[var(--color-border)] bg-[var(--color-paper-light)] px-3 py-2.5 text-left text-sm font-medium text-[var(--color-ink)] shadow-sm hover:bg-[var(--color-paper)]"
        >
          Visit help center
        </button>
        <button
          type="button"
          onClick={handleContactSupport}
          className="rounded-md border border-[var(--color-border)] bg-[var(--color-paper-light)] px-3 py-2.5 text-left text-sm font-medium text-[var(--color-ink)] shadow-sm hover:bg-[var(--color-paper)]"
        >
          Contact support
        </button>
      </div>
      <p className="text-xs text-[var(--color-ink-muted)]">DANN v0.1</p>
    </div>
  )
}