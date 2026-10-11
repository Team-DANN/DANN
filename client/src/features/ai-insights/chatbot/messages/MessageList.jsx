// PATH: src/features/ai-insights/chatbot/messages/MessageList.jsx

import MessageText from './MessageText.jsx'
import ProposalCard from './ProposalCard.jsx'

const BASE = 'max-w-[85%] rounded-xl px-3 py-2 text-sm lg:px-4 lg:py-2.5 lg:text-base'

function bubbleClass(message) {
  if (message.role === 'user') return `${BASE} bg-[var(--color-ink)] text-[var(--color-paper)]`
  if (message.kind === 'error') {
    return `${BASE} border border-[var(--color-error)] bg-[var(--color-paper)] text-[var(--color-error)]`
  }
  if (message.kind === 'result') {
    return `${BASE} border border-[var(--color-success)] bg-[var(--color-paper)] text-[var(--color-ink)]`
  }
  return `${BASE} border border-[var(--color-border)] bg-[var(--color-paper)] text-[var(--color-ink)]`
}

// The messages of a thread, shared by the floating widget and the DANN AI
// page. Render it inside the surface's own scroll container.
export default function MessageList({
  messages,
  isThinking,
  onConfirm,
  onCancel,
  confirmCooldownSeconds = 0,
}) {
  return (
    <>
      {messages.map((m) => {
        const isUser = m.role === 'user'
        return (
          <div key={m.id} className={`flex flex-col gap-2 ${isUser ? 'items-end' : 'items-start'}`}>
            <div className={bubbleClass(m)}>
              {isUser ? <p className="whitespace-pre-wrap break-words">{m.content}</p> : <MessageText text={m.content} />}
            </div>
            {m.kind === 'proposal' && m.proposal && (
              <div className="w-full max-w-[92%]">
                <ProposalCard
                  message={m}
                  onConfirm={onConfirm}
                  onCancel={onCancel}
                  cooldownSeconds={confirmCooldownSeconds}
                />
              </div>
            )}
          </div>
        )
      })}
      {isThinking && (
        <div className="flex justify-start">
          <p className="rounded-xl border border-[var(--color-border)] bg-[var(--color-paper)] px-3 py-2 text-sm text-[var(--color-ink-muted)] lg:px-4 lg:py-2.5 lg:text-base">
            Thinking…
          </p>
        </div>
      )}
    </>
  )
}