import { Wheat, Shirt, Box, Sparkles, Factory } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { EASE, staggerContainer, slideUp } from "../lib/motion";

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
    <section className="bg-ink px-6 py-20 sm:py-24">
      <div className="mx-auto max-w-5xl">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            If you make it in batches, DANN fits.
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-white/60">
            Any small manufacturer tracking raw materials, production runs,
            and orders not built around one industry's workflow.
          </p>
        </div>

        <motion.div
          className="mt-10 flex flex-wrap gap-3"
          variants={staggerContainer(0.06)}
          initial={shouldReduceMotion ? false : "hidden"}
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
        >
          {industries.map((industry) => {
            const Icon = industry.icon;
            return (
              <motion.span
                key={industry.id}
                variants={slideUp(12)}
                transition={{ ease: EASE, duration: 0.4 }}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm text-white/85"
              >
                <Icon size={15} strokeWidth={1.75} className="text-stamp" aria-hidden="true" />
                {industry.label}
              </motion.span>
            );
          })}
        </motion.div>

        <p className="mt-8 text-sm text-white/45">
          Don't see your line of work listed? If you're running production on
          a small floor, chances are DANN still fits.
        </p>
      </div>
    </section>
  );
}
