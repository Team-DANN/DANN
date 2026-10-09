import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'

export default function CTASection() {
  const shouldReduceMotion = useReducedMotion()

  return (
    <section className="border-t border-border bg-paper py-20 sm:py-28">
      <div className="mx-auto max-w-5xl px-6">
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-3xl border border-stamp/20 bg-stamp/10 p-10 text-center sm:p-16 md:p-20 shadow-sm"
        >
          <h2 className="mx-auto max-w-3xl text-3xl font-semibold tracking-tight text-ink sm:text-4xl md:text-5xl">
            Run your entire workshop floor and ledger straight from your phone.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-ink-muted sm:text-lg">
            Start logging production, tracking stock runway, and seeing daily profit in minutes.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              to="/signup"
              className="inline-flex items-center gap-3 rounded-full bg-stamp px-8 py-4 text-base font-semibold text-white shadow-lg shadow-stamp/25 transition-all hover:-translate-y-0.5 hover:bg-stamp-dark active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stamp focus-visible:ring-offset-2"
            >
              Sign up free
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
                <ChevronRight size={16} aria-hidden="true" />
              </span>
            </Link>
          </div>

          <div className="mt-6">
            <Link
              to="/login"
              className="text-sm font-medium text-ink-muted transition-colors hover:text-ink hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stamp rounded-md px-2 py-1"
            >
              Already have an account? Log in
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
