import { motion } from "framer-motion";
import { EASE } from "../lib/motion";

const wordVariant = {
  hidden: { opacity: 0, y: -18, filter: "blur(4px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.45, ease: EASE },
  },
};

// Splits text into words and reveals them one at a time — reads as "being written".
// onComplete fires once the LAST word finishes (not on mount) so callers can chain sequences.
export default function AnimatedText({
  text,
  className = "inline-block",
  wordClassName = "",
  stagger = 0.06,
  delay = 0,
  onComplete,
}) {
  const words = text.split(" ");

  return (
    <motion.span
      className={className}
      initial="hidden"
      animate="visible"
      transition={{ staggerChildren: stagger, delayChildren: delay }}
    >
      {words.map((w, i) => (
        <span key={`${w}-${i}`}>
          <motion.span
            variants={wordVariant}
            className={`inline-block ${wordClassName}`}
            onAnimationComplete={i === words.length - 1 ? onComplete : undefined}
          >
            {w}
          </motion.span>
          {i !== words.length - 1 && " "}
        </span>
      ))}
    </motion.span>
  );
}