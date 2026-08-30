import { Mic, RefreshCw, TrendingUp } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { EASE, slideUp, slideDown, staggerContainer } from "../lib/motion";

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
    <section
      id="how-it-works"
      className="scroll-mt-24 bg-paper px-6 py-24 sm:py-28 lg:py-32"
    >
      <div className="mx-auto max-w-6xl">
        <motion.div
          className="mx-auto max-w-2xl text-center"
          variants={staggerContainer(0.12)}
          initial={shouldReduceMotion ? false : "hidden"}
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
        >
          <motion.span
            variants={slideDown(20)}
            className="inline-flex rounded-full border border-ink/10 bg-white/60 px-4 py-1.5 text-xs font-medium uppercase tracking-wide text-ink-muted backdrop-blur"
          >
            How it works
          </motion.span>
          <motion.h2
            variants={slideUp(36)}
            className="mt-5 text-3xl font-semibold tracking-tight text-ink sm:text-4xl lg:text-5xl"
          >
            Three steps. No training needed.
          </motion.h2>
          <motion.p
            variants={slideUp(28)}
            className="mt-4 text-base leading-relaxed text-ink-muted sm:text-lg"
          >
            If you can talk and tap a screen, you already know how to use DANN.
          </motion.p>
        </motion.div>

        <motion.div
          className="relative mt-16 grid grid-cols-1 gap-10 lg:grid-cols-3 lg:gap-8"
          variants={staggerContainer(0.15)}
          initial={shouldReduceMotion ? false : "hidden"}
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          {/* Connecting line — desktop only, sits behind the step cards */}
          <div
            className="absolute left-0 right-0 top-[52px] hidden h-px bg-gradient-to-r from-transparent via-ink/10 to-transparent lg:block"
            aria-hidden="true"
          />

          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.id}
                variants={slideUp(32)}
                transition={{ duration: 0.3, ease: EASE }}
                className="relative flex flex-col items-center text-center lg:items-start lg:text-left"
              >
                <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-paper-light text-stamp shadow-sm">
                  <Icon size={22} strokeWidth={2} aria-hidden="true" />
                </div>

                <span className="mt-5 font-mono text-xs text-ink-muted/60">
                  {step.number}
                </span>
                <h3 className="mt-2 text-xl font-semibold text-ink">
                  {step.title}
                </h3>
                <p className="mt-3 max-w-xs text-sm leading-relaxed text-ink-muted sm:text-base">
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