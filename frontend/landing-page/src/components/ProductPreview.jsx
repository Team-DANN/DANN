import { motion, useReducedMotion } from "framer-motion";
import { Sparkles, Mic, PhoneOff, ChevronDown } from "lucide-react";
import { EASE } from "../lib/motion";

const chips = ["Insights", "Log a batch", "Ask a question", "Recap"];

export default function ProductPreview({ className = "", children, image, active = true }) {
  const shouldReduceMotion = useReducedMotion();

  const cardVariants = {
    hidden: { opacity: 0, scale: 0.86, y: 30 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: shouldReduceMotion
        ? { duration: 0 }
        : { type: "spring", stiffness: 120, damping: 15 },
    },
  };

  const pillVariants = {
    hidden: { opacity: 0, y: -14, scale: 0.9 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: shouldReduceMotion
        ? { duration: 0 }
        : { duration: 0.5, ease: EASE, delay: 0.15 },
    },
  };

  return (
    <motion.div
      className={`relative w-full ${className}`}
      initial="hidden"
      animate={active ? "visible" : "hidden"}
      variants={cardVariants}
      style={{ pointerEvents: active ? "auto" : "none" }}
    >
      {/* Floating capsule — "the app is running" indicator, sits above the window */}
      {children && (
        <motion.div
          variants={pillVariants}
          className="absolute -top-6 left-1/2 z-30 flex max-w-[92%] -translate-x-1/2 items-center gap-2 rounded-full border border-white/15 bg-ink/90 px-4 py-2 shadow-lg shadow-ink/40 backdrop-blur-xl sm:-top-7 sm:max-w-none sm:gap-3 sm:px-5 sm:py-2.5"
        >
          <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-white/10 text-white sm:h-6 sm:w-6">
            <Sparkles size={12} strokeWidth={2} aria-hidden="true" />
          </span>
          <span className="text-xs font-medium text-white/90 sm:whitespace-nowrap sm:text-sm">
            {children}
          </span>
          <ChevronDown size={14} className="hidden flex-none text-white/50 sm:block" aria-hidden="true" />
        </motion.div>
      )}

      {/* Window frame */}
      <div
        className="w-full overflow-hidden rounded-2xl border border-white/10 bg-[#0B0C10] shadow-2xl shadow-ink/50 sm:rounded-3xl"
        aria-hidden="true"
      >
        <div className="flex items-center gap-2 border-b border-white/10 bg-white/[0.03] px-4 py-3 sm:px-6 sm:py-4">
          <span className="h-2.5 w-2.5 rounded-full bg-error/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
          <span className="ml-3 truncate font-mono text-[11px] text-white/40 sm:text-sm">
            dann.app — production floor
          </span>
        </div>

        {/* Once you have a real screenshot, pass it as the `image` prop and this fills the frame. */}
        {image ? (
          <div className="relative min-h-[280px] w-full sm:min-h-[420px] lg:min-h-[560px] xl:min-h-[640px]">
            <motion.img
              src={image.src}
              alt={image.alt || ""}
              initial={shouldReduceMotion ? false : { opacity: 0, scale: 1.03 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, ease: EASE, delay: 0.2 }}
              className="absolute inset-0 h-full w-full object-cover object-top"
            />
          </div>
        ) : (
          <div className="relative min-h-[300px] overflow-hidden px-4 py-8 sm:min-h-[420px] sm:px-8 sm:py-12 lg:min-h-[560px]">
            {/* ambient backdrop standing in for a real screenshot */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(199,90,45,0.16),transparent_45%),radial-gradient(circle_at_80%_70%,rgba(184,144,89,0.14),transparent_45%)]" />
            <div className="absolute inset-0 opacity-[0.04] [background-image:linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] [background-size:32px_32px]" />

            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5, ease: EASE, delay: 0.35 }}
              className="relative mx-auto w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.06] p-4 shadow-xl backdrop-blur-2xl sm:max-w-lg sm:p-5"
            >
              <div className="flex justify-end">
                <span className="rounded-full bg-stamp px-3 py-1.5 text-xs font-medium text-white sm:text-sm">
                  What's my runway?
                </span>
              </div>

              <p className="mt-3 text-sm leading-relaxed text-white/85 sm:text-base">
                You have 12 days of raw material left before you run out,
                based on this week's usage.
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-white/45 sm:text-xs">
                {chips.map((chip, i) => (
                  <span key={chip} className="flex items-center gap-3">
                    {i !== 0 && <span className="text-white/20">·</span>}
                    {chip}
                  </span>
                ))}
              </div>

              <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 sm:gap-3 sm:px-4">
                <span className="flex-1 truncate text-xs text-white/35 sm:text-sm">
                  Ask about your stock or production…
                </span>
                <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-stamp text-white">
                  <Sparkles size={12} aria-hidden="true" />
                </span>
              </div>
            </motion.div>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-white/10 px-4 py-3 sm:px-6 sm:py-4">
          <span className="flex items-center gap-1.5 text-[11px] text-white/40 sm:gap-2 sm:text-xs">
            <Mic size={14} aria-hidden="true" /> <span className="hidden sm:inline">Voice log</span>
          </span>
          <span className="flex items-center gap-1.5 rounded-full bg-error/20 px-3 py-1.5 text-[11px] font-medium text-error sm:text-xs">
            <PhoneOff size={12} aria-hidden="true" /> End preview
          </span>
        </div>
      </div>
    </motion.div>
  );
}