import { MessageCircle, SquarePen } from 'lucide-react'

// Lists every conversation thread, newest first. Tapping one switches the
// widget to it and jumps to Home; "New conversation" starts a fresh
// thread (or reuses the current one if it's already empty).
export default function ChatMessagesTab({ conversations, activeId, onSelectConversation, onNewConversation }) {
  return (
    <div className="flex flex-col gap-2 lg:gap-3">
      <button
        type="button"
        onClick={onNewConversation}
        className="flex items-center gap-2 rounded-xl border border-dashed border-[var(--color-border)] px-4 py-3 text-sm font-medium text-[var(--color-ink-muted)] hover:border-[var(--color-stamp)] hover:text-[var(--color-stamp)] lg:px-5 lg:py-3.5 lg:text-base"
      >
        <SquarePen size={16} strokeWidth={2} />
        New conversation
      </button>

      {conversations.map((c) => {
        const lastMessage = c.messages[c.messages.length - 1]
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelectConversation(c.id)}
            className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left lg:gap-4 lg:px-5 lg:py-4 ${
              c.id === activeId
                ? 'border-[var(--color-stamp)] bg-[var(--color-stamp)]/5'
                : 'border-[var(--color-border)] bg-[var(--color-paper)] hover:border-[var(--color-stamp)]'
            }`}
          >
            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-stamp)] text-[var(--color-paper-light)] lg:h-11 lg:w-11">
              <MessageCircle size={16} strokeWidth={2} className="lg:h-5 lg:w-5" />
            </span>
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-medium text-[var(--color-ink)] lg:text-base">{c.title}</span>
              <span className="truncate text-xs text-[var(--color-ink-muted)] lg:text-sm">
                {lastMessage ? lastMessage.content : 'No messages yet'}
              </span>
            </div>
          </button>
        )
      })}
    </div>
  )
}