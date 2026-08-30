import { useMemo, useState } from 'react'
import { Search, ChevronDown } from 'lucide-react'

const FAQS = [
  {
    q: 'How do I log a production batch?',
    a: 'Go to Production, pick a product (or search for it), enter the quantity, and confirm. Material stock updates automatically based on the recipe.',
  },
  {
    q: 'Why does a material show "No data"?',
    a: "Runway needs a few days of production history to estimate usage. It'll show a real estimate once you've logged a few batches with that material.",
  },
  {
    q: 'How do I mark a dispatch as paid?',
    a: 'Open the dispatch from Orders, then tap "Mark as paid" and confirm. Partial payments update the remaining balance automatically.',
  },
  {
    q: 'Can I change my low-stock alert threshold?',
    a: 'Yes — in Settings, under Alerts & Thresholds, you can set a default runway threshold that applies across materials.',
  },
  {
    q: 'Where do I add a new retailer or product?',
    a: 'You can add either inline: a retailer while logging a dispatch in Orders, or a product while logging production. Both take a few seconds.',
  },
]

export default function ChatHelpTab() {
  const [query, setQuery] = useState('')
  const [openIndex, setOpenIndex] = useState(null)

  const filtered = useMemo(() => {
    if (!query.trim()) return FAQS
    const q = query.trim().toLowerCase()
    return FAQS.filter((f) => f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q))
  }, [query])

  return (
    <div className="flex flex-col gap-3 lg:gap-4">
      <div className="relative">
        <Search
          size={16}
          strokeWidth={2}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)]"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for help…"
          className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-paper)] py-2.5 pl-9 pr-3 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:border-[var(--color-stamp)] focus:outline-none lg:py-3 lg:pl-10 lg:text-base"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="py-6 text-center text-sm text-[var(--color-ink-muted)] lg:text-base">
          No help articles match "{query}"
        </p>
      ) : (
        <div className="flex flex-col divide-y divide-[var(--color-border)] rounded-xl border border-[var(--color-border)] bg-[var(--color-paper)]">
          {filtered.map((faq, i) => {
            const open = openIndex === i
            return (
              <div key={faq.q}>
                <button
                  type="button"
                  onClick={() => setOpenIndex(open ? null : i)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left lg:px-5 lg:py-4"
                >
                  <span className="text-sm font-medium text-[var(--color-ink)] lg:text-base">{faq.q}</span>
                  <ChevronDown
                    size={16}
                    strokeWidth={2}
                    className={`flex-shrink-0 text-[var(--color-ink-muted)] transition-transform ${
                      open ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {open && (
                  <p className="px-4 pb-3 text-sm text-[var(--color-ink-muted)] lg:px-5 lg:pb-4 lg:text-base">
                    {faq.a}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}