import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { slideUp, slideRight, staggerContainer } from "../lib/motion";
import { useOnboarding } from "../context/OnboardingContext.jsx";

const signupImage =
  "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=1400&q=80";

export default function SignupPage() {
  const shouldReduceMotion = useReducedMotion();
  const navigate = useNavigate();
  const { updateDraft } = useOnboarding();
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    // Don't call the API yet — /api/auth/register wants owner + business
    // info too, collected over the next 3 onboarding steps. Stash this and
    // continue; the actual account gets created once, at the end.
    updateDraft({ email: form.email, password: form.password, authProvider: "password" });
    navigate("/onboarding/owner-name");
  };

  const handleGoogleSignup = () => {
    // TODO: wire to real Google OAuth flow — this should still land the
    // user in onboarding afterward, since Google only gives us an email,
    // not owner/business details.
    console.log("google signup clicked");
  };

  return (
    <div className="grid min-h-[100svh] w-full grid-cols-1 bg-paper lg:grid-cols-2 xl:grid-cols-[1.5fr_1fr]">
      <motion.div
        initial={shouldReduceMotion ? false : "hidden"}
        animate="visible"
        variants={slideRight(40)}
        className="hidden items-center justify-center p-8 lg:flex xl:p-10"
      >
        <div className="relative aspect-[4/5] w-full max-w-md overflow-hidden rounded-3xl shadow-2xl shadow-ink/20 ring-1 ring-ink/10 lg:max-w-lg lg:rounded-tl-[2rem] lg:rounded-br-[2rem] lg:rounded-bl-2xl xl:aspect-[4/3] xl:max-w-3xl xl:rounded-tl-[3rem] xl:rounded-br-[3rem]">
          <img
            src={signupImage}
            alt="Small manufacturing workshop"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-ink/60 via-ink/10 to-ink/85" />

          <div className="absolute inset-x-0 bottom-0 p-6 xl:p-8">
            <p className="text-lg font-semibold leading-snug text-white xl:text-2xl">
              Run production, stock, and orders the way your floor actually works.
            </p>
            <p className="mt-2 text-sm text-white/70 xl:text-base">
              Built for small manufacturers, not spreadsheets.
            </p>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={shouldReduceMotion ? false : "hidden"}
        animate="visible"
        variants={staggerContainer(0.1)}
        className="flex items-center justify-center px-6 py-16 sm:px-12 lg:px-16"
      >
        <div className="w-full max-w-sm rounded-2xl border border-border p-8 sm:p-10">
          <motion.h1
            variants={slideUp(28)}
            className="mt-8 text-center text-3xl font-semibold tracking-tight text-ink sm:text-4xl"
          >
            Create your account
          </motion.h1>
          <motion.p variants={slideUp(24)} className="mt-3 text-center text-base text-ink-muted">
            Start free no card required.
          </motion.p>

          <motion.button
            variants={slideUp(24)}
            type="button"
            onClick={handleGoogleSignup}
            className="mt-8 flex w-full items-center justify-center gap-3 rounded-2xl border border-border bg-paper-light px-5 py-3.5 text-base font-medium text-ink transition-all hover:-translate-y-0.5 hover:border-ink/20 hover:bg-paper hover:shadow-md"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
              <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.54 5.54 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.82z" />
              <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.88-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.11A11.998 11.998 0 0 0 12 24z" />
              <path fill="#FBBC05" d="M5.27 14.28a7.2 7.2 0 0 1 0-4.56V6.61H1.27a12 12 0 0 0 0 10.78l4-3.11z" />
              <path fill="#EA4335" d="M12 4.75c1.76 0 3.34.6 4.59 1.79l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.27 6.61l4 3.11C6.22 6.86 8.87 4.75 12 4.75z" />
            </svg>
            Continue with Google
          </motion.button>

          <motion.div variants={slideUp(20)} className="my-7 flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-sm text-ink-muted">or use your email</span>
            <span className="h-px flex-1 bg-border" />
          </motion.div>

          <motion.form variants={slideUp(24)} onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-ink-muted">
                Email
              </label>
              <div className="relative">
                <Mail size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={form.email}
                  onChange={handleChange}
                  placeholder="you@business.com"
                  className="w-full rounded-xl border border-border bg-paper-light py-3.5 pl-11 pr-4 text-base text-ink outline-none transition-shadow placeholder:text-ink-muted/60 focus:border-stamp focus:ring-2 focus:ring-stamp/20"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium text-ink-muted">
                Password
              </label>
              <div className="relative">
                <Lock size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
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

            <button
              type="submit"
              className="w-full rounded-2xl bg-stamp px-5 py-3.5 text-base font-medium text-white transition-all hover:-translate-y-0.5 hover:bg-stamp-dark hover:shadow-lg hover:shadow-stamp/25"
            >
              Create account
            </button>
          </motion.form>

          <motion.p variants={slideUp(20)} className="mt-7 text-center text-base text-ink-muted">
            Already have an account?{" "}
            <Link to="/login" className="font-medium text-stamp hover:text-stamp-dark">
              Log in
            </Link>
          </motion.p>
        </div>
      </motion.div>
    </div>
  );
}