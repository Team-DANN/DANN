import { Mic, Package, Truck, TrendingUp, Sparkles } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { EASE, slideUp, slideDown, slideLeft, slideRight, staggerContainer } from "../lib/motion";

const features = [
  {
    id: "production",
    icon: Mic,
    title: "Log a batch by talking to it",
    body: "No forms, no typing with messy hands. Say what you made and how much — DANN logs it.",
    span: "lg:col-span-2",
    glass: true,
  },
  {
    id: "inventory",
    icon: Package,
    title: "Know your runway before you run out",
    body: "See exactly how many days of raw material you have left, not just what's in stock.",
    span: "lg:col-span-1",
  },
  {
    id: "orders",
    icon: Truck,
    title: "See what's shipped, what's pending",
    body: "Every dispatch and every rupee owed by each retailer, in one list.",
    span: "lg:col-span-1",
  },
  {
    id: "profit",
    icon: TrendingUp,
    title: "Real numbers, not guesswork",
    body: "Revenue by product, receivables, and trend — pulled straight from your orders and inventory.",
    span: "lg:col-span-2",
  },
  {
    id: "insights",
    icon: Sparkles,
    title: "Insights that tell you what to do next",
    body: "DANN flags what needs action, what to watch, and what's working — in plain words, not dashboards.",
    span: "lg:col-span-2",
  },
];

export default function FeaturesSection() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section
      id="features"
      className="scroll-mt-24 bg-paper px-6 pb-24 pt-[16rem] sm:pt-[20rem] lg:pt-[26rem] xl:pt-[28rem]"
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
            What's inside
          </motion.span>
          <motion.h2
            variants={slideUp(36)}
            className="mt-5 text-3xl font-semibold tracking-tight text-ink sm:text-4xl lg:text-5xl"
          >
            Everything the floor and the ledger need, in one place.
          </motion.h2>
          <motion.p
            variants={slideUp(28)}
            className="mt-4 text-base leading-relaxed text-ink-muted sm:text-lg"
          >
            One place for production, stock, orders, and profit — built for
            how small manufacturers actually work, not how spreadsheets want
            them to.
          </motion.p>
        </motion.div>

        <motion.div
          className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"
          variants={staggerContainer(0.1)}
          initial={shouldReduceMotion ? false : "hidden"}
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
        >
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.id}
                variants={index % 2 === 0 ? slideLeft(56) : slideRight(56)}
                whileHover={shouldReduceMotion ? undefined : { y: -4 }}
                transition={{ duration: 0.3, ease: EASE }}
                className={`group relative overflow-hidden rounded-3xl border border-border bg-paper-light p-8 ${feature.span}`}
              >
                {feature.glass && (
                  <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-stamp/10 blur-2xl" />
                )}

                <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-stamp/10 text-stamp">
                  <Icon size={20} strokeWidth={2} aria-hidden="true" />
                </div>

                <h3 className="relative mt-6 text-xl font-semibold text-ink">
                  {feature.title}
                </h3>
                <p className="relative mt-3 text-sm leading-relaxed text-ink-muted sm:text-base">
                  {feature.body}
                </p>

                {feature.glass && (
                  <div className="relative mt-6 flex items-center gap-3 rounded-2xl border border-white/40 bg-white/30 px-4 py-3 backdrop-blur-xl">
                    <span className="flex h-2 w-2 flex-none animate-pulse rounded-full bg-stamp" />
                    <span className="font-mono text-xs text-ink-muted sm:text-sm">
                      "200 units, batch #14" — logged
                    </span>
                  </div>
                )}
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}