import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { Circle, Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react";
import { API_BASE_URL } from "../lib/config.js";

export default function LoginPage() {
  const shouldReduceMotion = useReducedMotion();
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });
  const [status, setStatus] = useState("idle"); // idle | submitting | error
  const [errorMessage, setErrorMessage] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus("submitting");
    setErrorMessage("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, password: form.password }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Couldn't log you in. Check your details and try again.");
      }

      const { data } = await response.json();
      const token = data?.token;

      if (!token) {
        throw new Error("No token returned from server.");
      }

      localStorage.setItem("dann_has_authenticated", "true");
      window.location.href = `/dashboard/auth/callback?token=${encodeURIComponent(token)}`;
    } catch (error) {
      setStatus("error");
      setErrorMessage(error.message);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15, delayChildren: 0.2 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  return (
    <main className="flex min-h-screen w-full bg-paper selection:bg-stamp/30 p-2 transition-all duration-500 lg:h-screen lg:overflow-hidden lg:p-4">
      {/* LEFT COLUMN (Hero & Video) */}
      <div className="relative hidden lg:flex flex-col items-center justify-end w-[52%] pb-32 px-12 rounded-3xl overflow-hidden shadow-2xl h-full bg-ink">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source
            src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260424_064411_9e9d7f84-9277-41f4-ab10-59172d89e6be.mp4"
            type="video/mp4"
          />
        </video>

        {/* Hero Content Overlay */}
        <motion.div
          variants={containerVariants}
          initial={shouldReduceMotion ? false : "hidden"}
          animate="visible"
          className="z-10 w-full max-w-xs space-y-8"
        >
          <motion.div variants={itemVariants} className="flex items-center gap-2 text-white">
            <Circle className="fill-stamp text-stamp w-6 h-6" />
            <span className="text-xl font-semibold tracking-tight">DANN</span>
          </motion.div>

          <motion.div variants={itemVariants}>
            <h1 className="text-4xl font-medium tracking-tight whitespace-nowrap text-white">
              Welcome back
            </h1>
            <p className="text-white/80 text-sm leading-relaxed mt-2">
              Log in to manage your production, stock, and dispatches.
            </p>
          </motion.div>

          <motion.div variants={itemVariants} className="space-y-3">
            <FeatureBadge text="Voice-powered floor logging" />
            <FeatureBadge text="Real material runway warnings" />
            <FeatureBadge text="Retailer dispatch & payment tracking" />
          </motion.div>
        </motion.div>
      </div>

      {/* RIGHT COLUMN (Login Form) */}
      <div className="flex-1 flex flex-col items-center justify-center py-12 lg:py-6 px-4 sm:px-12 lg:px-16 xl:px-24 overflow-y-auto lg:overflow-hidden">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="w-full max-w-xl space-y-8 lg:space-y-6 sm:space-y-10"
        >
          {/* Header */}
          <div className="text-center sm:text-left">
            <h2 className="text-3xl font-medium tracking-tight text-ink">
              Account Login
            </h2>
            <p className="mt-2 text-sm text-ink-muted">
              Enter your credentials to access your workshop dashboard.
            </p>
          </div>

          {/* Social Buttons */}
          <div className="grid grid-cols-2 gap-4">
            <SocialButton
              icon={
                <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                  <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.54 5.54 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.82z" />
                  <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.88-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.11A11.998 11.998 0 0 0 12 24z" />
                  <path fill="#FBBC05" d="M5.27 14.28a7.2 7.2 0 0 1 0-4.56V6.61H1.27a12 12 0 0 0 0 10.78l4-3.11z" />
                  <path fill="#EA4335" d="M12 4.75c1.76 0 3.34.6 4.59 1.79l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.27 6.61l4 3.11C6.22 6.86 8.87 4.75 12 4.75z" />
                </svg>
              }
              label="Google"
            />
            <SocialButton
              icon={
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                </svg>
              }
              label="Github"
            />
          </div>

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <span className="absolute inset-x-0 h-px bg-border" />
            <span className="relative bg-paper px-4 text-xs font-medium text-ink-muted uppercase tracking-widest">
              Or
            </span>
          </div>

          {/* Error Message Alert */}
          {status === "error" && (
            <div className="flex items-start gap-2.5 rounded-xl border border-error/30 bg-error/10 p-4 text-sm text-error">
              <AlertCircle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <InputGroup
              label="Email"
              name="email"
              type="email"
              required
              placeholder="you@business.com"
              value={form.email}
              onChange={handleChange}
            />

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="block text-sm font-medium text-ink">
                  Password
                </label>
                <Link to="/forgot-password" className="text-xs font-medium text-stamp hover:text-stamp-dark transition-colors">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  className="w-full rounded-xl border border-border bg-paper-light py-3.5 pl-4 pr-11 text-base text-ink outline-none transition-shadow placeholder:text-ink-muted/60 focus:border-stamp focus:ring-2 focus:ring-stamp/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={status === "submitting"}
              className="flex w-full h-14 items-center justify-center gap-2 rounded-xl bg-stamp text-white font-semibold transition-all hover:bg-stamp-dark active:scale-[0.98] shadow-lg shadow-stamp/25 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {status === "submitting" && <Loader2 size={18} className="animate-spin" aria-hidden="true" />}
              {status === "submitting" ? "Logging in…" : "Log in to Dashboard"}
            </button>
          </form>

          {/* Footer Link */}
          <p className="text-center text-sm text-ink-muted mt-6">
            Don't have an account yet?{" "}
            <Link to="/signup" className="font-medium text-stamp hover:text-stamp-dark transition-colors">
              Sign up free
            </Link>
          </p>
        </motion.div>
      </div>
    </main>
  );
}

/* =========================================
   Helper Components
   ========================================= */

function FeatureBadge({ text }) {
  return (
    <div className="flex items-center gap-3 bg-white/10 text-white/90 p-3 rounded-xl backdrop-blur-sm">
      <span className="flex h-2 w-2 rounded-full bg-stamp" />
      <span className="text-sm font-medium">{text}</span>
    </div>
  );
}

function SocialButton({ icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-paper-light px-5 py-3.5 text-sm font-medium text-ink transition-all hover:-translate-y-0.5 hover:border-ink/20 hover:bg-paper hover:shadow-md"
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function InputGroup({ label, ...props }) {
  return (
    <div className="w-full">
      <label className="mb-2 block text-sm font-medium text-ink">
        {label}
      </label>
      <input
        {...props}
        className="w-full rounded-xl border border-border bg-paper-light py-3.5 px-4 text-base text-ink outline-none transition-shadow placeholder:text-ink-muted/60 focus:border-stamp focus:ring-2 focus:ring-stamp/20"
      />
    </div>
  );
}