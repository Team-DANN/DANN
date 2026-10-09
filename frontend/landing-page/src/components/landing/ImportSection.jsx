import { motion, useReducedMotion } from 'framer-motion'
import { ShieldCheck, Sparkles } from 'lucide-react'
import { LANDING_ASSETS } from '../../lib/landingAssets.js'
import MediaSlot from './MediaSlot.jsx'

export default function ImportSection() {
  const shouldReduceMotion = useReducedMotion()

  return (
    <section className="border-t border-border bg-paper py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5 }}
          className="overflow-hidden rounded-3xl border border-border bg-paper-light p-8 shadow-sm sm:p-12"
        >
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-12 items-center">
            {/* Left Info Column */}
            <div className="lg:col-span-5">
              <p className="font-mono text-xs font-bold tracking-wider text-stamp uppercase">
                MIGRATION & SETUP
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
                Bring your existing records into DANN
              </h2>
              <p className="mt-4 text-base leading-relaxed text-ink-muted">
                Upload the spreadsheet you already use — any column layout is fine. DANN detects what each sheet and column is, and only asks when it isn't sure.
              </p>

              {/* Security & safety notices */}
              <div className="mt-6 space-y-3">
                <div className="flex items-start gap-3">
                  <ShieldCheck size={18} className="mt-0.5 shrink-0 text-success" aria-hidden="true" />
                  <p className="text-sm text-ink-muted">
                    <span className="font-medium text-ink">Existing records are never overwritten</span> — DANN never replaces your saved stock or history.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <Sparkles size={18} className="mt-0.5 shrink-0 text-stamp" aria-hidden="true" />
                  <p className="text-sm text-ink-muted">
                    <span className="font-medium text-ink">Duplicates skipped automatically</span> — imports stay clean without double entries.
                  </p>
                </div>
              </div>

              {/* Supported format chips */}
              <div className="mt-8">
                <p className="font-mono text-xs font-semibold tracking-wider text-ink-muted uppercase">
                  SUPPORTED FILE FORMATS
                </p>
                <div className="mt-3 flex flex-wrap gap-2.5">
                  <span className="rounded-full border border-border bg-paper px-4 py-1.5 font-mono text-xs font-semibold text-ink">
                    .xlsx
                  </span>
                  <span className="rounded-full border border-border bg-paper px-4 py-1.5 font-mono text-xs font-semibold text-ink">
                    .xls
                  </span>
                  <span className="rounded-full border border-border bg-paper px-4 py-1.5 font-mono text-xs font-semibold text-ink">
                    .csv
                  </span>
                </div>
              </div>
            </div>

            {/* Right Media Placeholder Column */}
            <div className="lg:col-span-7">
              <MediaSlot asset={LANDING_ASSETS.importScreen} />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
