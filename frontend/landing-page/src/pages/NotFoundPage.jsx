import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { Home } from "lucide-react";

function MissingPanelIllustration() {
  return (
    <svg
      viewBox="0 0 440 300"
      className="w-full max-w-md"
      role="img"
      aria-label="A missing dashboard panel illustration"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <ellipse
        cx="220"
        cy="267"
        rx="142"
        ry="18"
        fill="#18304D"
        fillOpacity="0.1"
      />

      <text
        x="220"
        y="96"
        textAnchor="middle"
        fill="#18304D"
        fontSize="82"
        fontWeight="700"
        letterSpacing="-5"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
      >
        404
      </text>

      <rect
        x="91"
        y="128"
        width="258"
        height="118"
        rx="18"
        fill="#FFFFFF"
        stroke="#18304D"
        strokeOpacity="0.18"
        strokeWidth="3"
      />

      <path
        d="M109 128H331C340.941 128 349 136.059 349 146V163H91V146C91 136.059 99.0589 128 109 128Z"
        fill="#E8F4FF"
      />

      <circle cx="113" cy="146" r="5" fill="#E47A61" />
      <circle cx="130" cy="146" r="5" fill="#E7B75C" />
      <circle cx="147" cy="146" r="5" fill="#6FBC8B" />

      <rect
        x="111"
        y="182"
        width="84"
        height="42"
        rx="8"
        fill="#DCEEFF"
      />
      <rect
        x="123"
        y="194"
        width="40"
        height="7"
        rx="3.5"
        fill="#18304D"
        fillOpacity="0.22"
      />
      <rect
        x="123"
        y="207"
        width="56"
        height="5"
        rx="2.5"
        fill="#18304D"
        fillOpacity="0.12"
      />

      <rect
        x="246"
        y="182"
        width="84"
        height="42"
        rx="8"
        fill="#DCEEFF"
      />
      <rect
        x="258"
        y="194"
        width="46"
        height="7"
        rx="3.5"
        fill="#18304D"
        fillOpacity="0.22"
      />
      <rect
        x="258"
        y="207"
        width="56"
        height="5"
        rx="2.5"
        fill="#18304D"
        fillOpacity="0.12"
      />

      <rect
        x="206"
        y="176"
        width="28"
        height="54"
        rx="7"
        fill="#F3F9FF"
        stroke="#18304D"
        strokeDasharray="5 5"
        strokeOpacity="0.34"
        strokeWidth="2"
      />

      <text
        x="220"
        y="215"
        textAnchor="middle"
        fill="#18304D"
        fillOpacity="0.55"
        fontSize="27"
        fontWeight="700"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
      >
        ?
      </text>

      <circle cx="75" cy="190" r="5" fill="#6CB6E8" fillOpacity="0.75" />
      <circle cx="367" cy="184" r="7" fill="#E47A61" fillOpacity="0.75" />
      <circle cx="354" cy="229" r="4" fill="#18304D" fillOpacity="0.2" />
      <circle cx="93" cy="239" r="4" fill="#18304D" fillOpacity="0.18" />
    </svg>
  );
}

export default function NotFoundPage() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F3F9FF] px-6 py-16 text-center text-[#18304D]">
      <section className="flex w-full max-w-2xl flex-col items-center">
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
          animate={
            shouldReduceMotion
              ? { opacity: 1 }
              : {
                  opacity: 1,
                  y: [0, -14, 0],
                }
          }
          transition={
            shouldReduceMotion
              ? { duration: 0 }
              : {
                  opacity: {
                    duration: 0.5,
                    ease: "easeOut",
                  },
                  y: {
                    duration: 3.2,
                    ease: "easeInOut",
                    repeat: Infinity,
                    repeatType: "mirror",
                  },
                }
          }
          className="mb-2"
        >
          <MissingPanelIllustration />
        </motion.div>

        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#18304D]/55">
          Page not found
        </p>

        <h1 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
          This page is not on the floor plan.
        </h1>

        <p className="mt-5 max-w-lg text-base leading-relaxed text-[#18304D]/70 sm:text-lg">
          The link may be outdated, the page may have moved, or the address
          may not be correct.
        </p>

        <Link
          to="/"
          className="mt-9 inline-flex items-center justify-center gap-2 rounded-full bg-stamp px-6 py-3 text-sm font-medium text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-stamp-dark"
        >
          <Home size={16} aria-hidden="true" />
          Back to home
        </Link>
      </section>
    </main>
  );
}