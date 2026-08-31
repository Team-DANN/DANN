import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import ProductPreview from "../components/ProductPreview";
import homeImage from "../assets/home.png";
import { EASE } from "../lib/motion";

const heroContainer = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.15,
    },
  },
};

const heroItem = {
  hidden: {
    opacity: 0,
    y: -42,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.7,
      ease: EASE,
    },
  },
};

export default function Hero() {
  const shouldReduceMotion = useReducedMotion();
  const [cardReady, setCardReady] = useState(Boolean(shouldReduceMotion));

  useEffect(() => {
    if (shouldReduceMotion) {
      setCardReady(true);
      return;
    }

    const timer = window.setTimeout(() => {
      setCardReady(true);
    }, 900);

    return () => window.clearTimeout(timer);
  }, [shouldReduceMotion]);

  return (
    <section className="relative isolate w-full bg-ink">
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

        <div className="absolute inset-0 bg-gradient-to-b from-ink/75 via-ink/60 to-ink" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-paper to-transparent" />
      </div>

      {/* Text block — its own full-viewport area, nothing overlaps it. */}
      <motion.div
        variants={heroContainer}
        initial={shouldReduceMotion ? false : "hidden"}
        animate="visible"
        className="relative z-10 mx-auto flex min-h-[100svh] w-full max-w-7xl flex-col items-center justify-center px-6 pb-16 pt-24 text-center sm:px-10 lg:px-12 lg:pt-28"
      >
        <motion.span
          variants={heroItem}
          className="mb-6 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm text-white/90 backdrop-blur"
        >
          Trusted by small manufacturers
        </motion.span>

        <motion.h1
          variants={heroItem}
          className="max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl xl:text-7xl"
        >
          The ERP small
          <br />
          manufacturers
          <br />
          were never given.
        </motion.h1>

        <motion.p
          variants={heroItem}
          className="mt-6 max-w-2xl text-base leading-relaxed text-white/80 sm:text-lg"
        >
          Production, orders, and cash in one place. Built for the way small
          manufacturers actually work.
        </motion.p>

        <motion.div variants={heroItem} className="mt-10">
          <Link
            to="/signup"
            className="inline-flex rounded-full bg-stamp px-8 py-3.5 text-base font-medium text-white shadow-lg shadow-stamp/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-stamp-dark hover:shadow-xl hover:shadow-stamp/30"
          >
            Start free
          </Link>
        </motion.div>
      </motion.div>

      {/* Card — normal document flow, pulled up close via a small negative
          margin only. It can't reach the text above it because that text
          block already reserved its own full-viewport space. */}
      <div className="relative z-10 -mt-10 px-4 pb-16 sm:-mt-14 sm:px-8 sm:pb-20 lg:-mt-20 lg:px-10 lg:pb-24">
        <ProductPreview
          className="mx-auto w-full max-w-xs sm:max-w-xl md:max-w-2xl lg:max-w-4xl xl:max-w-5xl"
          active={cardReady}
          image={{
            src: homeImage,
            alt: "DANN production management dashboard",
          }}
        />
      </div>
    </section>
  );
}