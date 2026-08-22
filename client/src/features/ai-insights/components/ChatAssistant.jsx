// PATH: src/features/ai-insights/components/ChatAssistant.jsx

import { useEffect, useRef, useState } from 'react'
import { Send, Sparkles } from 'lucide-react'
import { useChatAssistant } from '../hooks/useChatAssistant.js'

const SUGGESTED_QUESTIONS = [
  "What's my profit this period?",
  "What's running low?",
  'Who owes me money?',
  "What's my best seller?",
]

export default function ChatAssistant({ period }) {
  const { messages, ask, isThinking } = useChatAssistant(period)
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
    <div className="flex flex-col gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] p-4">
      <div className="flex items-center gap-2">
        <Sparkles size={16} strokeWidth={2} className="text-[var(--color-ink-muted)]" />
        <h2 className="font-sans text-sm font-semibold text-[var(--color-ink)]">
          Ask about your business
        </h2>
      </div>

      {messages.length === 0 ? (
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_QUESTIONS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => handleSend(q)}
              className="rounded-full border border-[var(--color-border)] bg-[var(--color-paper)] px-3 py-1.5 text-xs text-[var(--color-ink-muted)] transition-colors hover:border-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
            >
              {q}
            </button>
          ))}
        </div>
      ) : (
        <div ref={scrollRef} className="flex max-h-80 flex-col gap-3 overflow-y-auto pr-1">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <p
                className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                  m.role === 'user'
                    ? 'bg-[var(--color-ink)] text-[var(--color-paper)]'
                    : 'border border-[var(--color-border)] bg-[var(--color-paper)] text-[var(--color-ink)]'
                }`}
              >
                {m.content}
              </p>
            </div>
          ))}
          {isThinking && (
            <div className="flex justify-start">
              <p className="rounded-xl border border-[var(--color-border)] bg-[var(--color-paper)] px-3 py-2 text-sm text-[var(--color-ink-muted)]">
                Thinking…
              </p>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-2">
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask a question about your numbers…"
        className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-paper)] px-4 py-3 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-ink-muted)]"
      />
      <button
        type="button"
        onClick={() => handleSend()}
        disabled={!input.trim() || isThinking}
        className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--color-ink)] text-[var(--color-paper)] transition-opacity disabled:opacity-40"
      >
        <Send size={14} strokeWidth={2} />
      </button>
      </div>

      <p className="text-[11px] text-[var(--color-ink-muted)]">
        Preview: answers come from simple rules over your current data, not a full AI assistant yet.
      </p>
    </div>
  )
}