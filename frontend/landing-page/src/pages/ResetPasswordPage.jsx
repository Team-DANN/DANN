import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { Lock, Eye, EyeOff, AlertCircle } from "lucide-react";
import { slideUp, staggerContainer } from "../lib/motion";

export default function ResetPasswordPage() {
  const shouldReduceMotion = useReducedMotion();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ password: "", confirmPassword: "" });
  const [error, setError] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (form.password !== form.confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    setError("");
    // TODO: wire to real reset-password endpoint using `token`
    // On success, redirect to /login (don't auto-log-in — force a fresh login
    // to confirm the new password actually works)
    console.log("reset password submit", { token, password: form.password });
  };

  if (!token) {
    return (
      <div className="flex min-h-[100svh] w-full items-center justify-center bg-paper px-6 py-16">
        <motion.div
          initial={shouldReduceMotion ? false : "hidden"}
          animate="visible"
          variants={staggerContainer(0.1)}
          className="w-full max-w-sm rounded-2xl border border-border p-8 text-center sm:p-10"
        >
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-error/10">
            <AlertCircle size={26} className="text-error" aria-hidden="true" />
          </div>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            Link expired or invalid
          </h1>
          <p className="mt-3 text-base text-ink-muted">
            This password reset link is no longer valid. Request a new one below.
          </p>
          <Link
            to="/forgot-password"
            className="mt-6 inline-block w-full rounded-2xl bg-stamp px-5 py-3.5 text-base font-medium text-white transition-all hover:-translate-y-0.5 hover:bg-stamp-dark hover:shadow-lg hover:shadow-stamp/25"
          >
            Request new link
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100svh] w-full items-center justify-center bg-paper px-6 py-16">
      <motion.div
        initial={shouldReduceMotion ? false : "hidden"}
        animate="visible"
        variants={staggerContainer(0.1)}
        className="w-full max-w-sm rounded-2xl border border-border p-8 sm:p-10"
      >
        <motion.h1
          variants={slideUp(28)}
          className="text-center text-3xl font-semibold tracking-tight text-ink sm:text-4xl"
        >
          Set a new password
        </motion.h1>
        <motion.p variants={slideUp(24)} className="mt-3 text-center text-base text-ink-muted">
          Choose a strong password for your account.
        </motion.p>

        <motion.form variants={slideUp(24)} onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-medium text-ink-muted">
              New password
            </label>
            <div className="relative">
              <Lock
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted"
                aria-hidden="true"
              />
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                value={form.password}
                onChange={handleChange}
                placeholder="At least 8 characters"
                className="w-full rounded-xl border border-border bg-paper-light py-3.5 pl-11 pr-11 text-base text-ink outline-none transition-shadow placeholder:text-ink-muted/60 focus:border-stamp focus:ring-2 focus:ring-stamp/20"
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

          <div>
            <label htmlFor="confirmPassword" className="mb-2 block text-sm font-medium text-ink-muted">
              Confirm password
            </label>
            <div className="relative">
              <Lock
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted"
                aria-hidden="true"
              />
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="Re-enter your password"
                className="w-full rounded-xl border border-border bg-paper-light py-3.5 pl-11 pr-11 text-base text-ink outline-none transition-shadow placeholder:text-ink-muted/60 focus:border-stamp focus:ring-2 focus:ring-stamp/20"
              />
            </div>
          </div>

          {error && <p className="text-sm font-medium text-error">{error}</p>}

          <button
            type="submit"
            className="w-full rounded-2xl bg-stamp px-5 py-3.5 text-base font-medium text-white transition-all hover:-translate-y-0.5 hover:bg-stamp-dark hover:shadow-lg hover:shadow-stamp/25"
          >
            Update password
          </button>
        </motion.form>
      </motion.div>
    </div>
  );
}