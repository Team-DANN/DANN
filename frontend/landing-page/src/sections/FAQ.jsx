import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { EASE, slideUp, slideDown, staggerContainer } from "../lib/motion";

const faqs = [
  {
    id: "computer",
    question: "Do I need a computer to use this?",
    answer:
      "No. DANN runs on a phone. Most of what you'll do logging production, checking stock, seeing what's owed to you works fine from a regular smartphone on the floor.",
  },
  {
    id: "data-safety",
    question: "Is my business data safe?",
    answer:
      "Your production numbers, stock levels, and order details belong to you and aren't shared with anyone else using DANN. You can request your data or ask us to remove it at any time.",
  },
  {
    id: "existing-records",
    question: "I already track things in a notebook or Excel. What happens to that?",
    answer:
      "You keep using them until you're ready to switch. DANN doesn't require you to throw anything out most owners run both side by side for a week or two before fully moving over.",
  },
  {
    id: "voice-accuracy",
    question: "What if the voice logging gets something wrong?",
    answer:
      "Every voice log shows you what it understood before saving it, so you can correct it in a tap. It gets more accurate the more you use it for your specific products and terms.",
  },
  {
    id: "team-access",
    question: "Can more than one person on my team use it?",
    answer:
      "Yes. Owners, floor staff, and anyone handling dispatch can each log in and use their part of the app, so production, orders, and stock stay updated by whoever's actually doing the work.",
  },
  {
    id: "cost",
    question: "What does it cost?",
    answer:
      "DANN is free to start with, no card required. If you outgrow the free tier, paid plans are simple and built for small manufacturers' budgets, not enterprise pricing.",
  },
];

function FaqItem({ faq, isOpen, onToggle }) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between gap-4 py-5 text-left sm:py-6"
      >
        <span className="text-base font-medium text-ink sm:text-lg">
          {faq.question}
        </span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.25, ease: EASE }}
          className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-paper text-ink-muted"
        >
          <ChevronDown size={16} aria-hidden="true" />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.3, ease: EASE }}
            className="overflow-hidden"
          >
            <p className="pb-5 pr-10 text-sm leading-relaxed text-ink-muted sm:pb-6 sm:text-base">
              {faq.answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FAQ() {
  const shouldReduceMotion = useReducedMotion();
  const [openId, setOpenId] = useState(faqs[0].id);

  const toggle = (id) => {
    setOpenId((current) => (current === id ? null : id));
  };

  return (
    <section
      id="faq"
      className="scroll-mt-24 bg-paper px-6 py-24 sm:py-28 lg:py-32"
    >
      <div className="mx-auto max-w-3xl">
        <motion.div
          className="text-center"
          variants={staggerContainer(0.12)}
          initial={shouldReduceMotion ? false : "hidden"}
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
        >
          <motion.span
            variants={slideDown(20)}
            className="inline-flex rounded-full border border-ink/10 bg-white/60 px-4 py-1.5 text-xs font-medium uppercase tracking-wide text-ink-muted backdrop-blur"
          >
            FAQ
          </motion.span>
          <motion.h2
            variants={slideUp(36)}
            className="mt-5 text-3xl font-semibold tracking-tight text-ink sm:text-4xl lg:text-5xl"
          >
            Questions owners actually ask.
          </motion.h2>
        </motion.div>

        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="mt-12 rounded-3xl border border-border bg-paper-light px-6 sm:px-8"
        >
          {faqs.map((faq) => (
            <FaqItem
              key={faq.id}
              faq={faq}
              isOpen={openId === faq.id}
              onToggle={() => toggle(faq.id)}
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
}