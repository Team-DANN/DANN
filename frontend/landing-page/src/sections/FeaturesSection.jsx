import { Mic, Package, Truck, TrendingUp } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { EASE, slideUp, slideDown, slideLeft, slideRight, staggerContainer } from "../lib/motion";
import productionVideo from "../assets/production.mp4";
import profitVideo from "../assets/profit.mp4";
import orderImage from "../assets/order.png";
import inventoryImage from "../assets/inventory.png";

const features = [
  {
    id: "production",
    icon: Mic,
    title: "Talk it, don't type it",
    body: "Say what you made and how much. No clipboard, no forms, no stopping the line to write it down.",
    media: { type: "video", src: productionVideo },
  },
  {
    id: "inventory",
    icon: Package,
    title: "Never run out without warning",
    body: "Know exactly how many days of stock you have left, before it turns into a problem on the floor.",
    media: { type: "image", src: inventoryImage, alt: "DANN inventory tracking screen" },
  },
  {
    id: "orders",
    icon: Truck,
    title: "Every order, one glance",
    body: "See what's dispatched and what's still owed, without chasing anyone down for an update.",
    media: { type: "image", src: orderImage, alt: "DANN orders and dispatch screen" },
  },
  {
    id: "profit",
    icon: TrendingUp,
    title: "See what's actually working",
    body: "Real revenue by product and outstanding payments, pulled straight from your own numbers.",
    media: { type: "video", src: profitVideo },
  },
];

export default function FeaturesSection() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section
      id="features"
      className="scroll-mt-24 bg-paper px-6 pb-24 pt-16 sm:pt-20 lg:pt-24"
    >
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
            className="inline-flex rounded-full border border-ink/10 bg-white/60 px-4 py-1.5 text-xs font-medium uppercase tracking-wide text-ink-muted backdrop-blur"
          >
            What's inside
          </motion.span>
          <motion.h2
            variants={slideUp(36)}
            className="mt-5 text-3xl font-semibold tracking-tight text-ink sm:text-4xl lg:text-5xl"
          >
            Everything the floor and the ledger need, in one place.
          </motion.h2>
          <motion.p
            variants={slideUp(28)}
            className="mt-4 text-base leading-relaxed text-ink-muted sm:text-lg"
          >
            One place for production, stock, orders, and profit built for
            how small manufacturers actually work, not how spreadsheets want
            them to.
          </motion.p>
        </motion.div>

        <motion.div
          className="mt-16 grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8"
          variants={staggerContainer(0.12)}
          initial={shouldReduceMotion ? false : "hidden"}
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
        >
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.id}
                variants={index % 2 === 0 ? slideLeft(56) : slideRight(56)}
                whileHover={shouldReduceMotion ? undefined : { y: -6 }}
                transition={{ duration: 0.3, ease: EASE }}
                className="group mx-auto w-full max-w-xl overflow-hidden rounded-3xl border border-border bg-paper-light shadow-sm transition-shadow duration-300 hover:shadow-xl hover:shadow-ink/5 md:max-w-md lg:max-w-none"
              >
                {/* Text first */}
                <div className="p-6 pb-5 sm:p-8 sm:pb-6">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-stamp/10 text-stamp">
                    <Icon size={20} strokeWidth={2} aria-hidden="true" />
                  </div>

                  <h3 className="mt-5 text-xl font-semibold text-ink">
                    {feature.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-ink-muted sm:text-base">
                    {feature.body}
                  </p>
                </div>

                {/* Media below — frame sizes itself to the media's own natural
                    proportions (no fixed aspect ratio, no object-cover), so
                    the whole image/video shows in full and still fills its
                    frame edge-to-edge with no crop and no letterboxing. */}
                <div className="px-6 pb-6 sm:px-8 sm:pb-8">
                  <div className="w-full overflow-hidden rounded-xl bg-ink sm:rounded-2xl">
                    {feature.media.type === "video" ? (
                      <video
                        className="block h-auto w-full"
                        src={feature.media.src}
                        autoPlay
                        muted
                        loop
                        playsInline
                        preload="metadata"
                      />
                    ) : (
                      <img
                        src={feature.media.src}
                        alt={feature.media.alt || ""}
                        className="block h-auto w-full"
                      />
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}