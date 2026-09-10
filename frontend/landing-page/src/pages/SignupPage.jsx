import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { Circle, Eye, EyeOff } from "lucide-react";
import { useOnboarding } from "../context/OnboardingContext.jsx";
import { loginWithGoogle } from "../lib/auth.js";
import SocialButton from "../components/SocialButton.jsx";
import GoogleIcon from "../components/GoogleIcon.jsx";

export default function SignupPage() {
  const navigate = useNavigate();
  const { updateDraft } = useOnboarding();
  const shouldReduceMotion = useReducedMotion();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (name === "password" || name === "confirmPassword") {
      setConfirmPasswordError("");
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (form.password !== form.confirmPassword) {
      setConfirmPasswordError("Passwords don't match.");
      return;
    }

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
            <SocialButton icon={<GoogleIcon />} label="Google" onClick={loginWithGoogle} />
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

            <div>
              <label className="mb-2 block text-sm font-medium text-ink">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  placeholder="Re-enter your password"
                  className="w-full rounded-xl border border-border bg-paper-light py-3.5 pl-4 pr-11 text-base text-ink outline-none transition-shadow placeholder:text-ink-muted/60 focus:border-stamp focus:ring-2 focus:ring-stamp/20"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {confirmPasswordError && (
                <p className="mt-2 text-xs text-error">{confirmPasswordError}</p>
              )}
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