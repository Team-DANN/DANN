import { useState } from 'react'
import { Plus } from 'lucide-react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'

const faqs = [
  {
    id: 'voice-typing',
    question: 'Do I have to type everything in?',
    answer:
      'No. You can log daily production, raw material usage, and dispatches using voice commands or quick taps. DANN also includes an Excel/CSV spreadsheet import tool to bring existing records in.',
  },
  {
    id: 'staff-accounts',
    question: 'Can my staff log in with their own accounts?',
    answer:
      'Yes. You can set up staff accounts with PIN-based login and specific module permissions so floor workers only see what they need to log, keeping financial ledgers private.',
  },
  {
    id: 'excel-migration',
    question: 'What if I already keep my records in Excel?',
    answer:
      'DANN includes a built-in data migration tool that reads your .xlsx, .xls, or .csv files, automatically matches your columns, and imports your starting stock and products without overwriting existing data.',
  },
  {
    id: 'mobile-access',
    question: 'Does it work on my phone?',
    answer:
      'Yes. DANN is built mobile-first and works smoothly on smartphones, tablets, and desktop browsers right on the workshop floor.',
  },
  {
    id: 'data-privacy',
    question: 'Is my data private?',
    answer:
      'Yes. Your production figures, raw material stock, customer details, and financial reports belong entirely to your business and are kept private and secure.',
  },
  {
    id: 'pricing-plans',
    question: 'Is DANN free?',
    answer:
      'DANN offers early access features free of charge. Any future paid plans are designed to be simple and accessible for small manufacturer budgets, not enterprise pricing.',
  },
]

function FaqAccordionItem({ faq, isOpen, onToggle }) {
  const shouldReduceMotion = useReducedMotion()
  const answerId = `faq-answer-${faq.id}`

  return (
    <div className="px-6 py-5 sm:px-8">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={answerId}
        className="flex w-full items-center justify-between gap-6 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stamp focus-visible:ring-offset-2 focus-visible:ring-offset-paper-light rounded-lg"
      >
        <span className="text-lg font-semibold text-ink sm:text-xl">
          {faq.question}
        </span>
        <motion.span
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-paper text-ink-muted"
        >
          <Plus size={16} aria-hidden="true" />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            id={answerId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.25 }}
            className="overflow-hidden"
          >
            <p className="mt-3 text-base leading-relaxed text-ink-muted sm:text-lg max-w-3xl pr-6">
              {faq.answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function FAQSection() {
  const [openId, setOpenId] = useState(faqs[0].id)

  const toggle = (id) => {
    setOpenId((current) => (current === id ? null : id))
  }

  return (
    <section id="faq" className="scroll-mt-20 border-t border-border bg-paper-light py-20 sm:py-28">
      <div className="mx-auto max-w-4xl px-6">
        <div className="text-center">
          <p className="font-mono text-xs font-bold tracking-wider text-stamp uppercase">
            FAQ
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-4xl md:text-5xl">
            Questions owners actually ask.
          </h2>
          <p className="mt-4 text-base text-ink-muted sm:text-lg">
            Straight answers about how DANN works on your floor.
          </p>
        </div>

        <div className="mt-12 overflow-hidden rounded-2xl border border-border bg-paper-light divide-y divide-border shadow-sm">
          {faqs.map((faq) => (
            <FaqAccordionItem
              key={faq.id}
              faq={faq}
              isOpen={openId === faq.id}
              onToggle={() => toggle(faq.id)}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
