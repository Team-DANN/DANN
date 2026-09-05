import { Mic, Package, Truck, TrendingUp } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { EASE } from "../lib/motion";
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

function FeatureRow({ feature, index }) {
  const shouldReduceMotion = useReducedMotion();
  const Icon = feature.icon;
  const reversed = index % 2 === 1;

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.5, ease: EASE }}
      className={`grid grid-cols-1 items-center gap-10 py-14 first:pt-0 last:pb-0 sm:py-16 lg:grid-cols-2 lg:gap-16 ${
        index !== features.length - 1 ? "border-b border-border" : ""
      }`}
    >
      <div className={reversed ? "lg:order-2" : ""}>
        <Icon size={22} strokeWidth={1.75} className="text-stamp" aria-hidden="true" />
        <h3 className="mt-5 text-2xl font-semibold tracking-tight text-ink sm:text-[28px]">
          {feature.title}
        </h3>
        <p className="mt-3 max-w-md text-base leading-relaxed text-ink-muted">
          {feature.body}
        </p>
      </div>

      <div className={reversed ? "lg:order-1" : ""}>
        <div className="overflow-hidden rounded-xl bg-ink shadow-sm">
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
}

export default function FeaturesSection() {
  return (
    <section id="features" className="scroll-mt-20 bg-paper px-6 py-20 sm:py-24">
      <div className="mx-auto max-w-5xl">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            Everything the floor and the ledger need, in one place.
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-ink-muted">
            One place for production, stock, orders, and profit built for how
            small manufacturers actually work, not how spreadsheets want them
            to.
          </p>
        </div>

        <div className="mt-6">
          {features.map((feature, index) => (
            <FeatureRow key={feature.id} feature={feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
