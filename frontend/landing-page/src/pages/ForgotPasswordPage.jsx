import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { Mail, CheckCircle2 } from "lucide-react";
import { slideUp, staggerContainer } from "../lib/motion";

export default function ForgotPasswordPage() {
  const shouldReduceMotion = useReducedMotion();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (event) => {
    event.preventDefault();
    // TODO: wire to real password-reset endpoint
    // Always show the confirmation state regardless of whether the email
    // exists — never reveal which emails are registered.
    console.log("forgot password submit", email);
    setSubmitted(true);
  };

  return (
    <div className="flex min-h-[100svh] w-full items-center justify-center bg-paper px-6 py-16">
      <motion.div
        initial={shouldReduceMotion ? false : "hidden"}
        animate="visible"
        variants={staggerContainer(0.1)}
        className="w-full max-w-sm rounded-2xl border border-border p-8 sm:p-10"
      >
        {!submitted ? (
          <>
            <motion.h1
              variants={slideUp(28)}
              className="text-center text-3xl font-semibold tracking-tight text-ink sm:text-4xl"
            >
              Reset your password
            </motion.h1>
            <motion.p variants={slideUp(24)} className="mt-3 text-center text-base text-ink-muted">
              Enter your email and we'll send you a reset link.
            </motion.p>

            <motion.form variants={slideUp(24)} onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-medium text-ink-muted">
                  Email
                </label>
                <div className="relative">
                  <Mail
                    size={18}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted"
                    aria-hidden="true"
                  />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@business.com"
                    className="w-full rounded-xl border border-border bg-paper-light py-3.5 pl-11 pr-4 text-base text-ink outline-none transition-shadow placeholder:text-ink-muted/60 focus:border-stamp focus:ring-2 focus:ring-stamp/20"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full rounded-2xl bg-stamp px-5 py-3.5 text-base font-medium text-white transition-all hover:-translate-y-0.5 hover:bg-stamp-dark hover:shadow-lg hover:shadow-stamp/25"
              >
                Send reset link
              </button>
            </motion.form>
          </>
        ) : (
          <motion.div variants={slideUp(24)} className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
              <CheckCircle2 size={26} className="text-success" aria-hidden="true" />
            </div>
            <h1 className="mt-5 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              Check your inbox
            </h1>
            <p className="mt-3 text-base text-ink-muted">
              If an account exists for <span className="font-medium text-ink">{email}</span>, we've
              sent a link to reset your password. It expires in 30 minutes.
            </p>
          </motion.div>
        )}

        <motion.p variants={slideUp(20)} className="mt-7 text-center text-base text-ink-muted">
          Remembered it?{" "}
          <Link to="/login" className="font-medium text-stamp hover:text-stamp-dark">
            Log in
          </Link>
        </motion.p>
      </motion.div>
    </div>
  );
}