import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  ChevronDown,
  GripHorizontal,
  MessageCircle,
  Play,
  Sparkles,
} from "lucide-react";
import { EASE } from "../lib/motion";

export default function ProductPreview({
  className = "",
  image,
  active = true,
}) {
  const shouldReduceMotion = useReducedMotion();
  const constraintsRef = useRef(null);

  // Closed by default. Only opens itself once, on mount, if the viewport is
  // already sm+ — never auto-opens on a small screen.
  const [assistantVisible, setAssistantVisible] = useState(false);
  const [question, setQuestion] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const isSmUp = window.matchMedia("(min-width: 640px)").matches;
    setAssistantVisible(isSmUp);
  }, []);

  const cardVariants = {
    hidden: {
      opacity: 0,
      y: 40,
      scale: 0.94,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: shouldReduceMotion
        ? { duration: 0 }
        : {
            type: "spring",
            stiffness: 105,
            damping: 18,
          },
    },
  };

  const assistantVariants = {
    hidden: {
      opacity: 0,
      scale: 0.94,
      y: -18,
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: shouldReduceMotion
        ? { duration: 0 }
        : {
            duration: 0.5,
            ease: EASE,
            delay: 0.35,
          },
    },
  };

  // Typing and sending both work, but nothing typed is ever stored or shown —
  // this is a preview surface, not a live chat, so it always resets to the
  // same placeholder state.
  const sendQuestion = () => {
    if (!question.trim()) return;
    setQuestion("");
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      sendQuestion();
    }
  };

  return (
    <motion.div
      ref={constraintsRef}
      initial="hidden"
      animate={active ? "visible" : "hidden"}
      variants={cardVariants}
      className={`relative ${className}`}
      style={{ pointerEvents: active ? "auto" : "none" }}
    >
      {assistantVisible && (
        <motion.aside
          drag={!shouldReduceMotion}
          dragConstraints={constraintsRef}
          dragElastic={0.08}
          dragMomentum={false}
          whileDrag={{ scale: 1.02, cursor: "grabbing" }}
          variants={assistantVariants}
          className="absolute right-1.5 top-1.5 z-40 w-[calc(100%-0.75rem)] touch-none cursor-grab overflow-hidden rounded-lg border border-white/15 bg-[#171717]/95 shadow-2xl shadow-black/50 backdrop-blur-2xl sm:right-4 sm:top-4 sm:w-64 sm:rounded-xl lg:-right-4 lg:top-6 lg:w-80 lg:rounded-2xl"
          aria-label="DANN assistant"
        >
          <div className="flex items-center justify-between border-b border-white/10 px-2.5 py-1.5 sm:px-3 sm:py-2">
            <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
              <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-stamp text-white sm:h-6 sm:w-6">
                <Sparkles size={11} aria-hidden="true" />
              </span>

              <span className="truncate text-[11px] font-medium text-white/90 sm:text-xs">
                Ask DANN
              </span>
            </div>

            <div className="flex items-center gap-1">
              <span className="hidden text-[10px] text-white/40 lg:inline">
                Drag to move
              </span>

              <GripHorizontal
                size={13}
                className="hidden text-white/40 sm:block"
                aria-hidden="true"
              />

              <button
                type="button"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={() => setAssistantVisible(false)}
                className="ml-1 inline-flex items-center gap-1 rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-white/70 transition-colors hover:bg-white/15 hover:text-white sm:px-2 sm:py-1"
                aria-label="Hide assistant"
              >
                <ChevronDown size={10} aria-hidden="true" />
                Hide
              </button>
            </div>
          </div>

          <div className="px-2.5 py-2 sm:px-3 sm:py-2.5">
            <p className="text-[11px] leading-relaxed text-white/85 sm:text-xs">
              What would you like to check?
            </p>

            <div className="mt-2 flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.06] px-2 py-1.5 sm:gap-2 sm:px-2.5">
              <MessageCircle
                size={12}
                className="flex-none text-white/45"
                aria-hidden="true"
              />

              <input
                type="text"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={handleKeyDown}
                onPointerDown={(event) => event.stopPropagation()}
                placeholder="Ask about stock, orders, or cash"
                className="min-w-0 flex-1 bg-transparent text-[10px] text-white outline-none placeholder:text-white/40 sm:text-[11px]"
                aria-label="Ask DANN a question"
              />

              <button
                type="button"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={sendQuestion}
                disabled={!question.trim()}
                aria-label="Send question"
                className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-stamp text-white transition-all hover:bg-stamp-dark disabled:cursor-not-allowed disabled:opacity-40 sm:h-6 sm:w-6"
              >
                <Play size={9} fill="currentColor" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="border-t border-white/10 px-2.5 py-1.5 text-[9px] text-white/45 sm:px-3 sm:py-2 sm:text-[10px]">
            Press Enter to send
          </div>
        </motion.aside>
      )}

      {!assistantVisible && (
        <button
          type="button"
          onClick={() => setAssistantVisible(true)}
          className="absolute right-1.5 top-1.5 z-40 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-[#171717]/95 px-2.5 py-1.5 text-[11px] font-medium text-white shadow-xl shadow-black/40 backdrop-blur-xl transition-colors hover:bg-[#252525] sm:right-4 sm:top-4 sm:gap-2 sm:px-3 sm:text-xs lg:-right-4 lg:top-6"
        >
          <Sparkles size={11} className="text-stamp" aria-hidden="true" />
          Ask DANN
        </button>
      )}

      <div className="overflow-hidden rounded-lg border border-white/10 bg-[#111111] shadow-2xl shadow-ink/60 sm:rounded-xl lg:rounded-2xl">
        <div className="flex items-center gap-1.5 border-b border-white/10 bg-white/[0.03] px-2.5 py-2 sm:gap-2 sm:px-4 sm:py-2.5">
          <span className="h-1.5 w-1.5 rounded-full bg-error/70 sm:h-2 sm:w-2" />
          <span className="h-1.5 w-1.5 rounded-full bg-warning/70 sm:h-2 sm:w-2" />
          <span className="h-1.5 w-1.5 rounded-full bg-success/70 sm:h-2 sm:w-2" />

          <span className="ml-2 truncate font-mono text-[9px] text-white/40 sm:ml-3 sm:text-[10px] lg:text-xs">
            Production overview
          </span>
        </div>

        <div className="bg-gradient-to-br from-[#3a2414] via-[#241609] to-[#140b05] p-1 sm:p-2.5 lg:p-4">
          <div className="overflow-hidden rounded-md border-2 border-black bg-black shadow-2xl sm:rounded-lg lg:rounded-xl">
            {image && (
              <motion.img
                src={image.src}
                alt={image.alt || ""}
                initial={
                  shouldReduceMotion ? false : { opacity: 0, scale: 1.02 }
                }
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  duration: shouldReduceMotion ? 0 : 0.7,
                  ease: EASE,
                  delay: shouldReduceMotion ? 0 : 0.2,
                }}
                className="block h-auto w-full object-contain"
              />
            )}
          </div>
        </div>

        <div className="flex items-center justify-end border-t border-white/10 bg-[#140b05] px-2.5 py-2 sm:px-4 sm:py-2.5">
          <span className="rounded-full bg-stamp/15 px-2.5 py-1 text-[9px] font-medium text-stamp sm:px-3 sm:py-1.5 sm:text-[10px] lg:text-xs">
            Dashboard preview
          </span>
        </div>
      </div>
    </motion.div>
  );
}