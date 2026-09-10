import { useState } from "react";
import { Plus } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { EASE } from "../lib/motion";

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
    <div className="border-b border-border py-5">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex w-full items-start justify-between gap-6 text-left"
      >
        <span className="text-base font-medium text-ink sm:text-lg">
          {faq.question}
        </span>
        <motion.span
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.2, ease: EASE }}
          className="mt-0.5 flex h-6 w-6 flex-none items-center justify-center text-ink-muted"
        >
          <Plus size={16} aria-hidden="true" />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.25, ease: EASE }}
            className="overflow-hidden"
          >
            <p className="max-w-xl pr-10 pt-3 text-sm leading-relaxed text-ink-muted sm:text-base">
              {faq.answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FAQ() {
  const [openId, setOpenId] = useState(faqs[0].id);

  const toggle = (id) => {
    setOpenId((current) => (current === id ? null : id));
  };

  return (
    <section id="faq" className="scroll-mt-20 bg-paper px-6 py-20 sm:py-24">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          Questions owners actually ask.
        </h2>

        <div className="mt-10">
          {faqs.map((faq) => (
            <FaqItem
              key={faq.id}
              faq={faq}
              isOpen={openId === faq.id}
              onToggle={() => toggle(faq.id)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
