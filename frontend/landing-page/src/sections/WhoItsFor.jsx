import { Wheat, Shirt, Box, Sparkles, Factory } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { EASE, slideUp, slideDown, slideLeft, slideRight, staggerContainer } from "../lib/motion";

const industries = [
  { id: "food", icon: Wheat, label: "Food & packaged goods" },
  { id: "textiles", icon: Shirt, label: "Textiles & garments" },
  { id: "packaging", icon: Box, label: "Packaging & printing" },
  { id: "personal-care", icon: Sparkles, label: "Personal & home care" },
  { id: "general", icon: Factory, label: "General small-batch manufacturing" },
];

export default function WhoItsFor() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="bg-ink px-6 py-24 sm:py-28 lg:py-32">
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
            className="inline-flex rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-medium uppercase tracking-wide text-white/60 backdrop-blur"
          >
            Who it's for
          </motion.span>
          <motion.h2
            variants={slideUp(36)}
            className="mt-5 text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl"
          >
            If you make it in batches, DANN fits.
          </motion.h2>
          <motion.p
            variants={slideUp(28)}
            className="mt-4 text-base leading-relaxed text-white/60 sm:text-lg"
          >
            Any small manufacturer tracking raw materials, production runs,
            and orders not built around one industry's workflow.
          </motion.p>
        </motion.div>

        <motion.div
          className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5"
          variants={staggerContainer(0.09)}
          initial={shouldReduceMotion ? false : "hidden"}
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          {industries.map((industry, index) => {
            const Icon = industry.icon;
            return (
              <motion.div
                key={industry.id}
                variants={index % 2 === 0 ? slideLeft(40) : slideRight(40)}
                whileHover={shouldReduceMotion ? undefined : { y: -4 }}
                transition={{ duration: 0.3, ease: EASE }}
                className="flex flex-col items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-center backdrop-blur-sm sm:items-start sm:text-left"
              >
                <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-stamp/15 text-stamp">
                  <Icon size={20} strokeWidth={2} aria-hidden="true" />
                </span>
                <span className="text-sm font-medium leading-snug text-white/90 sm:text-base">
                  {industry.label}
                </span>
              </motion.div>
            );
          })}
        </motion.div>

        <motion.p
          initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="mt-10 text-center text-sm text-white/50"
        >
          Don't see your line of work listed? If you're running production
          on a small floor, chances are DANN still fits.
        </motion.p>
      </div>
    </section>
  );
}