import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import ProductPreview from "../components/ProductPreview";
import AnimatedText from "../components/AnimatedText";
import { slideDown, slideUp } from "../lib/motion";

const headlineLines = [
  { text: "The ERP small", delay: 0 },
  { text: "manufacturers", delay: 0.5 },
  { text: "were never given.", delay: 0.85 },
];

const paragraph =
  "Production, orders, and cash in one place. Built for the way small manufacturers actually work.";

export default function Hero() {
  const shouldReduceMotion = useReducedMotion();

  // Chained via onComplete callbacks rather than fixed timers, so each stage
  // only starts once the one before it has actually finished writing.
  const [badgeDone, setBadgeDone] = useState(shouldReduceMotion);
  const [headlineDone, setHeadlineDone] = useState(shouldReduceMotion);
  const [paragraphDone, setParagraphDone] = useState(shouldReduceMotion);
  const [ctaDone, setCtaDone] = useState(shouldReduceMotion);

  const cardReady = shouldReduceMotion || ctaDone;

  return (
    <section className="relative isolate min-h-[100svh] w-full overflow-hidden bg-ink">
      <div className="absolute inset-0 overflow-hidden">
        <video
          className="h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster="/videos/hero-poster.jpg"
        >
          <source
            src="https://assets.mixkit.co/videos/1944/1944-720.mp4"
            type="video/mp4"
          />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-ink/70 via-ink/55 to-ink/80" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-paper to-transparent" />
      </div>

      <div className="relative z-10 flex min-h-[100svh] flex-col items-center justify-center px-6 pb-40 pt-20 text-center sm:pb-48 lg:pt-24">
        <motion.span
          initial={shouldReduceMotion ? false : "hidden"}
          animate="visible"
          variants={slideDown(20)}
          onAnimationComplete={() => setBadgeDone(true)}
          className="mb-6 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm text-white/90 backdrop-blur"
        >
          Trusted by small manufacturers
        </motion.span>

        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl xl:text-7xl">
          {badgeDone &&
            headlineLines.map((line, i) => (
              <AnimatedText
                key={line.text}
                text={line.text}
                className="block"
                stagger={0.07}
                delay={line.delay}
                onComplete={
                  i === headlineLines.length - 1
                    ? () => setHeadlineDone(true)
                    : undefined
                }
              />
            ))}
        </h1>

        <p className="mt-6 max-w-2xl text-base leading-relaxed text-white/80 sm:text-lg">
          {headlineDone && (
            <AnimatedText
              text={paragraph}
              stagger={0.028}
              onComplete={() => setParagraphDone(true)}
            />
          )}
        </p>

        {paragraphDone && (
          <motion.div
            initial={shouldReduceMotion ? false : "hidden"}
            animate="visible"
            variants={slideUp(20)}
            onAnimationComplete={() => setCtaDone(true)}
            className="mt-10 flex flex-col items-center gap-4 sm:flex-row"
          >
            <Link
              to="/signup"
              className="rounded-full bg-stamp px-8 py-3.5 text-base font-medium text-white transition-colors hover:bg-stamp-dark"
            >
              Start free
            </Link>
          </motion.div>
        )}
      </div>

      {/* Card lives in the hero itself now — no scroll trigger. It overlaps down
          into the next section by half its height, same as before. */}
      <div className="absolute inset-x-0 bottom-0 z-20 flex translate-y-1/2 justify-center px-6">
        <ProductPreview className="max-w-6xl" active={cardReady}>
          Built for how small manufacturers actually run their floor
        </ProductPreview>
      </div>
    </section>
  );
}