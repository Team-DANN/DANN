import { motion, useReducedMotion } from 'framer-motion'
import {
  Mic,
  Package,
  Truck,
  Users,
  TrendingUp,
  FileSpreadsheet,
  AlertTriangle,
  ShieldCheck,
} from 'lucide-react'
import { LANDING_ASSETS } from '../../lib/landingAssets.js'
import MediaSlot from './MediaSlot.jsx'

export default function BentoGridSection() {
  const shouldReduceMotion = useReducedMotion()

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.1 },
    },
  }

  const cardVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 },
    },
  }

  return (
    <section id="features" className="scroll-mt-20 border-t border-border bg-paper-light py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-2xl">
          <p className="font-mono text-xs font-bold tracking-wider text-stamp uppercase">
            FEATURES
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-4xl md:text-5xl">
            Everything your workshop needs.
          </h2>
          <p className="mt-4 text-base text-ink-muted sm:text-lg">
            One simple platform for floor operations, stock runway, dispatches, and profitability.
          </p>
        </div>

        <motion.div
          className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3"
          variants={containerVariants}
          initial={shouldReduceMotion ? false : 'hidden'}
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
        >
          {/* Card 1: Voice-powered floor logging (Large - 2 cols) */}
          <motion.div
            variants={cardVariants}
            className="flex flex-col justify-between rounded-2xl border border-border bg-paper p-6 sm:p-8 md:col-span-2 shadow-sm hover:border-stamp/30 transition-colors"
          >
            <div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-stamp/20 bg-stamp/10 text-stamp">
                <Mic size={20} strokeWidth={1.75} aria-hidden="true" />
              </div>
              <h3 className="mt-5 text-xl font-semibold tracking-tight text-ink sm:text-2xl">
                Voice-powered floor logging
              </h3>
              <p className="mt-2 text-base text-ink-muted leading-relaxed max-w-xl">
                Speak your output and raw material usage directly from the floor. No forms, no stopping the line to write things down.
              </p>
            </div>
            <div className="mt-6 overflow-hidden rounded-xl">
              <MediaSlot asset={LANDING_ASSETS.bentoVoice} />
            </div>
          </motion.div>

          {/* Card 2: Real material runway warnings */}
          <motion.div
            variants={cardVariants}
            className="flex flex-col justify-between rounded-2xl border border-border bg-paper p-6 sm:p-8 shadow-sm hover:border-stamp/30 transition-colors"
          >
            <div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-warning/20 bg-warning/10 text-warning">
                <AlertTriangle size={20} strokeWidth={1.75} aria-hidden="true" />
              </div>
              <h3 className="mt-5 text-xl font-semibold tracking-tight text-ink">
                Real material runway warnings
              </h3>
              <p className="mt-2 text-base text-ink-muted leading-relaxed">
                Know exactly how many days of flour, sugar, or packaging you have left before it turns into a bottleneck.
              </p>
            </div>
            <div className="mt-8 flex items-center gap-3 rounded-xl border border-border bg-paper-light p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-stamp/10 text-stamp">
                <Package size={18} aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs font-mono font-semibold text-stamp uppercase">Runway Warning</p>
                <p className="text-xs font-medium text-ink">Wheat Flour: 3 days remaining</p>
              </div>
            </div>
          </motion.div>

          {/* Card 3: Retailer dispatch and payment tracking (Large - 2 cols) */}
          <motion.div
            variants={cardVariants}
            className="flex flex-col justify-between rounded-2xl border border-border bg-paper p-6 sm:p-8 md:col-span-2 shadow-sm hover:border-stamp/30 transition-colors"
          >
            <div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-stamp/20 bg-stamp/10 text-stamp">
                <Truck size={20} strokeWidth={1.75} aria-hidden="true" />
              </div>
              <h3 className="mt-5 text-xl font-semibold tracking-tight text-ink sm:text-2xl">
                Retailer dispatch & payment tracking
              </h3>
              <p className="mt-2 text-base text-ink-muted leading-relaxed max-w-xl">
                Track crates sent to shops, invoice totals, partial payments, and pending balances in one clean view.
              </p>
            </div>
            <div className="mt-6 overflow-hidden rounded-xl">
              <MediaSlot asset={LANDING_ASSETS.bentoDispatches} />
            </div>
          </motion.div>

          {/* Card 4: Staff accounts with PINs and roles */}
          <motion.div
            variants={cardVariants}
            className="flex flex-col justify-between rounded-2xl border border-border bg-paper p-6 sm:p-8 shadow-sm hover:border-stamp/30 transition-colors"
          >
            <div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-stamp/20 bg-stamp/10 text-stamp">
                <ShieldCheck size={20} strokeWidth={1.75} aria-hidden="true" />
              </div>
              <h3 className="mt-5 text-xl font-semibold tracking-tight text-ink">
                Staff accounts with PINs & roles
              </h3>
              <p className="mt-2 text-base text-ink-muted leading-relaxed">
                Give floor workers quick PIN access to log batches without exposing financial ledgers or owner settings.
              </p>
            </div>
            <div className="mt-8 flex items-center gap-3 rounded-xl border border-border bg-paper-light p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-stamp/10 text-stamp">
                <Users size={18} aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs font-mono font-semibold text-ink-muted uppercase">Role Scoping</p>
                <p className="text-xs font-medium text-ink">Production & Dispatch access only</p>
              </div>
            </div>
          </motion.div>

          {/* Card 5: Production cost and profit by product */}
          <motion.div
            variants={cardVariants}
            className="flex flex-col justify-between rounded-2xl border border-border bg-paper p-6 sm:p-8 shadow-sm hover:border-stamp/30 transition-colors"
          >
            <div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-success/20 bg-success/10 text-success">
                <TrendingUp size={20} strokeWidth={1.75} aria-hidden="true" />
              </div>
              <h3 className="mt-5 text-xl font-semibold tracking-tight text-ink">
                Production cost & profit by product
              </h3>
              <p className="mt-2 text-base text-ink-muted leading-relaxed">
                See real profit margins per item factoring in raw material consumption and labor costs.
              </p>
            </div>
            <div className="mt-6 overflow-hidden rounded-xl">
              <MediaSlot asset={LANDING_ASSETS.bentoProfit} />
            </div>
          </motion.div>

          {/* Card 6: Import from Excel or CSV */}
          <motion.div
            variants={cardVariants}
            className="flex flex-col justify-between rounded-2xl border border-border bg-paper p-6 sm:p-8 shadow-sm hover:border-stamp/30 transition-colors"
          >
            <div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-stamp/20 bg-stamp/10 text-stamp">
                <FileSpreadsheet size={20} strokeWidth={1.75} aria-hidden="true" />
              </div>
              <h3 className="mt-5 text-xl font-semibold tracking-tight text-ink">
                Import from Excel or CSV
              </h3>
              <p className="mt-2 text-base text-ink-muted leading-relaxed">
                Bring your existing products, suppliers, customers, and starting stock into DANN in seconds.
              </p>
            </div>
            <div className="mt-8 flex flex-wrap gap-2">
              <span className="rounded-full border border-border bg-paper-light px-3 py-1 font-mono text-xs font-medium text-ink">
                .xlsx
              </span>
              <span className="rounded-full border border-border bg-paper-light px-3 py-1 font-mono text-xs font-medium text-ink">
                .xls
              </span>
              <span className="rounded-full border border-border bg-paper-light px-3 py-1 font-mono text-xs font-medium text-ink">
                .csv
              </span>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
