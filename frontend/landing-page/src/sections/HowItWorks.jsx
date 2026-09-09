import { Mic, RefreshCw, TrendingUp } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { EASE, staggerContainer, slideUp } from "../lib/motion";

const steps = [
  {
    id: "log",
    number: "01",
    icon: Mic,
    title: "Log your day, out loud",
    body: "Say what you made, what you used, what went out the door. No forms, no typing between batches.",
  },
  {
    id: "track",
    number: "02",
    icon: RefreshCw,
    title: "DANN keeps track for you",
    body: "Stock, orders, and dispatches update on their own no separate spreadsheet to remember to fill in.",
  },
  {
    id: "see",
    number: "03",
    icon: TrendingUp,
    title: "See what's actually working",
    body: "Open the app and know your runway, your margins, and what's owed to you in plain numbers.",
  },
];

export default function HowItWorks() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section id="how-it-works" className="scroll-mt-20 bg-paper-light px-6 py-20 sm:py-24">
      <div className="mx-auto max-w-5xl">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            Three steps. No training needed.
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-ink-muted">
            If you can talk and tap a screen, you already know how to use
            DANN.
          </p>
        </div>

        <motion.div
          className="relative mt-16 grid grid-cols-1 gap-12 sm:grid-cols-3 sm:gap-8"
          variants={staggerContainer(0.15)}
          initial={shouldReduceMotion ? false : "hidden"}
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
        >
          <div
            className="absolute left-0 right-0 top-0 hidden h-px bg-border sm:block"
            aria-hidden="true"
          />

          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <motion.div key={step.id} variants={slideUp(20)} transition={{ ease: EASE }}>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-stamp">{step.number}</span>
                  <div className="h-px flex-1 bg-border sm:h-2 sm:w-2 sm:flex-none sm:rounded-full sm:bg-stamp" />
                </div>
                <div className="mt-4 flex items-center gap-2.5">
                  <Icon size={18} strokeWidth={1.75} className="text-stamp" aria-hidden="true" />
                  <h3 className="text-lg font-semibold text-ink">{step.title}</h3>
                </div>
                <p className="mt-2.5 text-base leading-relaxed text-ink-muted">
                  {step.body}
                </p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
