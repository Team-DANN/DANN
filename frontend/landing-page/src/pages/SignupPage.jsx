import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { Circle, Eye, EyeOff } from "lucide-react";
import { useOnboarding } from "../context/OnboardingContext.jsx";

export default function SignupPage() {
  const navigate = useNavigate();
  const { updateDraft } = useOnboarding();
  const shouldReduceMotion = useReducedMotion();

  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const fullName = `${form.firstName} ${form.lastName}`.trim();
    updateDraft({
      email: form.email,
      password: form.password,
      ownerName: fullName,
    });
    navigate("/onboarding/owner-name");
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

        {/* Hero Content */}
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
              Join DANN
            </h1>
            <p className="text-white/80 text-sm leading-relaxed mt-2">
              Follow 3 quick steps to set up your floor.
            </p>
          </motion.div>

          <motion.div variants={itemVariants} className="space-y-3">
            <StepItem number={1} text="Create account" active />
            <StepItem number={2} text="Owner details" />
            <StepItem number={3} text="Business setup" />
          </motion.div>
        </motion.div>
      </div>

      {/* RIGHT COLUMN (Sign Up Form) */}
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
              Create New Account
            </h2>
            <p className="mt-2 text-sm text-ink-muted">
              Enter your details to get started with DANN.
            </p>
          </div>

          {/* Social Buttons */}
          <div className="grid grid-cols-1 gap-4">
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
          </div>

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <span className="absolute inset-x-0 h-px bg-border" />
            <span className="relative bg-paper px-4 text-xs font-medium text-ink-muted uppercase tracking-widest">
              Or
            </span>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <InputGroup
                label="First Name"
                name="firstName"
                type="text"
                required
                placeholder="Jane"
                value={form.firstName}
                onChange={handleChange}
              />
              <InputGroup
                label="Last Name"
                name="lastName"
                type="text"
                required
                placeholder="Doe"
                value={form.lastName}
                onChange={handleChange}
              />
            </div>

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
              <label className="mb-2 block text-sm font-medium text-ink">
                Password
              </label>
              <div className="relative">
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  value={form.password}
                  onChange={handleChange}
                  placeholder="At least 8 characters"
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
              <p className="mt-2 text-xs text-ink-muted">
                Requires at least 8 characters.
              </p>
            </div>

            <button
              type="submit"
              className="w-full h-14 mt-4 rounded-xl bg-stamp text-white font-semibold transition-all hover:bg-stamp-dark active:scale-[0.98] shadow-lg shadow-stamp/25"
            >
              Continue to Setup
            </button>
          </form>

          {/* Footer Link */}
          <p className="text-center text-sm text-ink-muted mt-6">
            Already have an account?{" "}
            <Link to="/login" className="font-medium text-stamp hover:text-stamp-dark transition-colors">
              Log in
            </Link>
          </p>
        </motion.div>
      </div>
    </main>
  );
}

/* =========================================
   Reusable Components
   ========================================= */

function StepItem({ number, text, active = false }) {
  if (active) {
    return (
      <div className="flex items-center gap-3 bg-paper text-ink border border-border p-3 rounded-xl transition-all">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-stamp text-white text-xs font-bold">
          {number}
        </div>
        <span className="text-sm font-medium">{text}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 bg-white/10 text-white/80 p-3 rounded-xl transition-all backdrop-blur-sm">
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-white/90 text-xs font-bold">
        {number}
      </div>
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