import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Star,
  Mic,
  Package,
  Truck,
  TrendingUp,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
} from "lucide-react";
import Navbar from "../components/Navbar.jsx";
import homeImage from "../assets/home.png";

const HERO_VIDEO_URL =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260424_064411_9e9d7f84-9277-41f4-ab10-59172d89e6be.mp4";

const TABS = [
  { id: "production", label: "Production", icon: Mic },
  { id: "stock", label: "Stock Runway", icon: Package },
  { id: "orders", label: "Dispatches", icon: Truck },
  { id: "profit", label: "Profit & Cash", icon: TrendingUp },
];

const INDUSTRIES = [
  "BAKERIES & PACKAGED FOODS",
  "TEXTILES & GARMENTS",
  "PACKAGING & PRINTING",
  "PERSONAL & HOME CARE",
  "SMALL-BATCH MANUFACTURING",
];

function ProductionOverlay() {
  return (
    <div className="absolute bottom-6 left-6 right-6 sm:left-auto sm:right-6 sm:w-80 rounded-2xl border border-white/20 bg-ink/85 p-5 shadow-2xl backdrop-blur-xl animate-fade-in-up">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-stamp/20 px-2.5 py-1 text-xs font-medium text-stamp">
          <Mic size={12} /> Voice Log Active
        </span>
        <span className="font-mono text-xs text-white/50">Today 09:40 AM</span>
      </div>
      <p className="mt-3 text-sm text-white/90">
        "Logged <span className="font-semibold text-white">450 packets of Rusk</span> & used <span className="font-semibold text-white">35kg Wheat Flour</span>"
      </p>
      <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
        <span className="text-xs text-white/60 font-medium">Batch #104 status</span>
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-success">
          <CheckCircle2 size={13} /> Recorded
        </span>
      </div>
    </div>
  );
}

function StockOverlay() {
  return (
    <div className="absolute bottom-6 left-6 right-6 sm:left-auto sm:right-6 sm:w-80 rounded-2xl border border-white/20 bg-ink/85 p-5 shadow-2xl backdrop-blur-xl animate-fade-in-up">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/20 px-2.5 py-1 text-xs font-medium text-warning">
          <AlertTriangle size={12} /> Stock Alert
        </span>
        <span className="font-mono text-xs text-white/50">Raw Materials</span>
      </div>
      <div className="mt-3">
        <h4 className="text-sm font-semibold text-white">Maida (Refined Flour)</h4>
        <p className="mt-1 text-xs text-white/70">
          Runway: <span className="font-semibold text-warning">3 days left</span> (120 kg remaining)
        </p>
      </div>
      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div className="h-full w-[25%] rounded-full bg-warning" />
      </div>
    </div>
  );
}

function OrdersOverlay() {
  return (
    <div className="absolute bottom-6 left-6 right-6 sm:left-auto sm:right-6 sm:w-80 rounded-2xl border border-white/20 bg-ink/85 p-5 shadow-2xl backdrop-blur-xl animate-fade-in-up">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-stamp/20 px-2.5 py-1 text-xs font-medium text-stamp">
          <Truck size={12} /> Retail Dispatches
        </span>
        <span className="font-mono text-xs text-white/50">Today</span>
      </div>
      <div className="mt-3 flex items-baseline justify-between">
        <span className="text-2xl font-semibold text-white">14 Crates</span>
        <span className="text-xs text-white/60">Sharma Supermarket</span>
      </div>
      <p className="mt-1 text-xs text-white/70">Dispatched at 07:30 AM • Invoice #402</p>
      <div className="mt-4 flex items-center gap-2 border-t border-white/10 pt-3 text-xs text-white/80">
        <CheckCircle2 size={13} className="text-success" /> Payment status: Pending (₹12,400)
      </div>
    </div>
  );
}

function ProfitOverlay() {
  return (
    <div className="absolute bottom-6 left-6 right-6 sm:left-auto sm:right-6 sm:w-80 rounded-2xl border border-white/20 bg-ink/85 p-5 shadow-2xl backdrop-blur-xl animate-fade-in-up">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-success/20 px-2.5 py-1 text-xs font-medium text-success">
          <TrendingUp size={12} /> Daily Margin
        </span>
        <span className="font-mono text-xs text-white/50">Calculated</span>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-3xl font-semibold text-white">₹42,800</span>
        <span className="inline-flex items-center text-xs font-medium text-success">
          <ArrowUpRight size={14} /> +18.4%
        </span>
      </div>
      <p className="mt-1 text-xs text-white/70">Net profit after raw material & wastage cost</p>
    </div>
  );
}

const OVERLAYS = {
  production: ProductionOverlay,
  stock: StockOverlay,
  orders: OrdersOverlay,
  profit: ProfitOverlay,
};

export default function Hero() {
  const [activeTab, setActiveTab] = useState("production");

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTab((current) => {
        const index = TABS.findIndex((tab) => tab.id === current);
        return TABS[(index + 1) % TABS.length].id;
      });
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const ActiveOverlay = OVERLAYS[activeTab];

  return (
    <div className="relative overflow-hidden bg-ink text-white selection:bg-stamp/40">
      {/* Hero Background Video */}
      <video
        className="absolute inset-0 h-full w-full object-cover opacity-50"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        src={HERO_VIDEO_URL}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-ink/80 via-ink/65 to-ink" />

      {/* Top Navbar */}
      <header className="relative z-10 animate-fade-in-up opacity-0" style={{ animationDelay: "0.1s" }}>
        <Navbar />
      </header>

      {/* Hero Content */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-24 pt-16 text-center lg:pt-20">
        {/* Rating Badge */}
        <div
          className="mb-8 inline-flex animate-fade-in-up items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 opacity-0 backdrop-blur-md"
          style={{ animationDelay: "0.2s" }}
        >
          <span className="flex h-5 w-5 items-center justify-center rounded border border-white/20 bg-stamp/20">
            <Star size={11} className="fill-stamp text-stamp" />
          </span>
          <span className="text-xs font-medium text-white/90">
            4.9 rating from 100+ small-scale manufacturers
          </span>
        </div>

        {/* Headline */}
        <h1
          className="mx-auto mb-6 max-w-5xl animate-fade-in-up text-5xl font-normal leading-[1.08] tracking-tight opacity-0 sm:text-6xl md:text-7xl lg:text-[80px]"
          style={{ animationDelay: "0.3s" }}
        >
          <span className="block text-white">The ERP small</span>
          <span className="block bg-gradient-to-r from-white via-white/80 to-stamp bg-clip-text text-transparent italic">
            manufacturers
          </span>
          <span className="block text-white">were never given.</span>
        </h1>

        {/* Subheading */}
        <p
          className="mx-auto mb-10 max-w-2xl animate-fade-in-up text-base text-white/70 opacity-0 sm:text-lg lg:text-xl"
          style={{ animationDelay: "0.4s" }}
        >
          Production, raw material runway, orders, and cash in one place. Built for
          the way small manufacturers actually work, not spreadsheets.
        </p>

        {/* Primary CTA */}
        <div
          className="mb-14 animate-fade-in-up opacity-0"
          style={{ animationDelay: "0.5s" }}
        >
          <Link
            to="/signup"
            className="inline-flex items-center gap-3 rounded-full bg-stamp px-8 py-3.5 text-base font-medium text-white shadow-xl shadow-stamp/25 transition-all hover:-translate-y-0.5 hover:bg-stamp-dark active:scale-[0.98]"
          >
            Start free trial
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
              <ChevronRight size={16} />
            </span>
          </Link>
        </div>

        {/* Feature Tab Bar */}
        <div
          className="mb-8 flex animate-fade-in-up justify-center opacity-0"
          style={{ animationDelay: "0.6s" }}
        >
          <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-1.5 backdrop-blur-md">
            {/* Mobile Grid */}
            <div className="grid grid-cols-2 gap-1 md:hidden">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-medium transition-all ${
                      isActive
                        ? "bg-stamp text-white shadow-md"
                        : "text-white/60 hover:text-white"
                    }`}
                  >
                    <Icon size={14} />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Desktop Row */}
            <div className="hidden items-center md:flex">
              {TABS.map((tab, index) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <div key={tab.id} className="flex items-center">
                    {index > 0 && <div className="h-5 w-px bg-white/10" />}
                    <button
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-all ${
                        isActive
                          ? "bg-stamp text-white shadow-md"
                          : "text-white/60 hover:text-white"
                      }`}
                    >
                      <Icon size={15} />
                      {tab.label}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Interactive Dashboard Showcase (Image Only) */}
        <div
          className="relative mx-auto max-w-5xl animate-fade-in-up overflow-hidden rounded-3xl border border-white/15 bg-paper-dark shadow-2xl opacity-0"
          style={{ animationDelay: "0.7s" }}
        >
          <div className="relative aspect-[16/9] w-full overflow-hidden">
            <img
              src={homeImage}
              alt="DANN Dashboard Preview"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/60 via-transparent to-transparent pointer-events-none" />
            {ActiveOverlay && <ActiveOverlay key={activeTab} />}
          </div>
        </div>

        {/* Industry Cloud */}
        <div
          className="mt-20 flex animate-fade-in-up flex-wrap items-center justify-center gap-x-10 gap-y-4 opacity-0"
          style={{ animationDelay: "0.8s" }}
        >
          {INDUSTRIES.map((ind) => (
            <span
              key={ind}
              className="text-xs font-semibold tracking-wider text-white/40 hover:text-white/70 transition-colors"
            >
              {ind}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}