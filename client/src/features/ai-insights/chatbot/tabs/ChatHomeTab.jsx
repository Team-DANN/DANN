import { useEffect, useRef, useState } from 'react'
import { Send, SquarePen } from 'lucide-react'

const SUGGESTED_QUESTIONS = [
  "What's my profit this period?",
  "What's running low?",
  'Who owes me money?',
  "What's my best seller?",
]

// Controlled by ChatbotWidget — messages/ask/isThinking come from
// useChatConversations at the widget level, so each thread survives
// switching to Messages/Help and back, and across page navigation, since
// the widget itself never unmounts.
export default function ChatHomeTab({ messages, ask, isThinking, onNewConversation }) {
  const [input, setInput] = useState('')
  const scrollRef = useRef(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, isThinking])

  function handleSend(question = input) {
    const trimmed = question.trim()
    if (!trimmed || isThinking) return
    ask(trimmed)
    setInput('')
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex h-full flex-col gap-3 p-4 lg:gap-4 lg:p-5">
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={onNewConversation}
          className="flex items-center gap-1.5 rounded-full border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium text-[var(--color-ink-muted)] hover:border-[var(--color-stamp)] hover:text-[var(--color-stamp)] lg:text-sm"
        >
          <SquarePen size={14} strokeWidth={2} />
          New conversation
        </button>
      </div>

      <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1 lg:gap-4">
        {messages.length === 0 ? (
          <>
            <p className="text-sm text-[var(--color-ink-muted)] lg:text-base">
              Hi! Ask me anything about your production, inventory, or numbers.
            </p>
            <div className="flex flex-wrap gap-2 lg:gap-2.5">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => handleSend(q)}
                  className="rounded-full border border-[var(--color-border)] bg-[var(--color-paper)] px-3 py-1.5 text-xs text-[var(--color-ink-muted)] transition-colors hover:border-[var(--color-ink-muted)] hover:text-[var(--color-ink)] lg:px-4 lg:py-2 lg:text-sm"
                >
                  {q}
                </button>
              ))}
            </div>
          </>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <p
                className={`max-w-[85%] rounded-xl px-3 py-2 text-sm lg:px-4 lg:py-2.5 lg:text-base ${
                  m.role === 'user'
                    ? 'bg-[var(--color-ink)] text-[var(--color-paper)]'
                    : 'border border-[var(--color-border)] bg-[var(--color-paper)] text-[var(--color-ink)]'
                }`}
              >
                {m.content}
              </p>
            </div>
          ))
        )}
        {isThinking && (
          <div className="flex justify-start">
            <p className="rounded-xl border border-[var(--color-border)] bg-[var(--color-paper)] px-3 py-2 text-sm text-[var(--color-ink-muted)] lg:px-4 lg:py-2.5 lg:text-base">
              Thinking…
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 lg:gap-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question…"
          className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-paper)] px-4 py-2.5 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-ink-muted)] lg:px-5 lg:py-3 lg:text-base"
        />
        <button
          type="button"
          onClick={() => handleSend()}
          disabled={!input.trim() || isThinking}
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--color-ink)] text-[var(--color-paper)] transition-opacity disabled:opacity-40 lg:h-11 lg:w-11"
        >
          <Send size={14} strokeWidth={2} className="lg:h-4 lg:w-4" />
        </button>
      </div>

      <p className="text-[11px] text-[var(--color-ink-muted)] lg:text-xs">
        Preview: answers come from simple rules over your current data.
      </p>
    </div>
  )
}