import { motion, useReducedMotion } from 'framer-motion'
import { LANDING_ASSETS } from '../../lib/landingAssets.js'
import MediaSlot from './MediaSlot.jsx'

const steps = [
  {
    id: 'voice-log',
    number: '01',
    title: 'Log production by voice or photo, right on the shop floor.',
    body: 'Speak your output or snap a photo of your production sheet. DANN calculates raw material usage automatically without stopping the line to write things down.',
    asset: LANDING_ASSETS.howStep1,
  },
  {
    id: 'stock-runway',
    number: '02',
    title: 'Stock updates automatically, with early warnings before materials run out.',
    body: 'Every logged batch deducts raw ingredients from inventory. Get clear runway alerts days before any critical ingredient hits zero.',
    asset: LANDING_ASSETS.howStep2,
  },
  {
    id: 'dispatches-ledger',
    number: '03',
    title: 'Dispatch to retailers and track who has paid and who still owes.',
    body: 'Record daily shipments to shops, track partial payments, and see outstanding balances instantly without chasing down paper receipts.',
    asset: LANDING_ASSETS.howStep3,
  },
]

function StepRow({ step, index }) {
  const shouldReduceMotion = useReducedMotion()
  const isReversed = index % 2 === 1

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5 }}
      className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16"
    >
      <div className={isReversed ? 'lg:order-2' : 'lg:order-1'}>
        <div className="inline-flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full border border-stamp/20 bg-stamp/10 font-mono text-xs font-bold text-stamp">
            {step.number}
          </span>
          <span className="font-mono text-xs font-semibold tracking-wider text-ink-muted uppercase">
            STEP {step.number}
          </span>
        </div>
        <h3 className="mt-4 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          {step.title}
        </h3>
        <p className="mt-3 text-base leading-relaxed text-ink-muted sm:text-lg">
          {step.body}
        </p>
      </div>

      <div className={isReversed ? 'lg:order-1' : 'lg:order-2'}>
        <MediaSlot asset={step.asset} />
      </div>
    </motion.div>
  )
}

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="scroll-mt-20 border-t border-border bg-paper py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-2xl">
          <p className="font-mono text-xs font-bold tracking-wider text-stamp uppercase">
            HOW IT WORKS
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-4xl md:text-5xl">
            Run your entire workshop floor and ledger from one place.
          </h2>
          <p className="mt-4 text-base text-ink-muted sm:text-lg">
            Built for the way small manufacturers actually work — speak, tap, and stay updated in real time.
          </p>
        </div>

        <div className="mt-16 space-y-20 sm:space-y-24">
          {steps.map((step, index) => (
            <StepRow key={step.id} step={step} index={index} />
          ))}
        </div>
      </div>
    </section>
  )
}
