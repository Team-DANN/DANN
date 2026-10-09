import { Link } from 'react-router-dom'
import Brand from './Brand.jsx'

const accountLinks = [
  { label: 'Log in', href: '/login' },
  { label: 'Sign up', href: '/signup' },
]

const legalLinks = [
  { label: 'Privacy Policy', href: '/privacy-policy' },
  { label: 'Terms of Service', href: '/terms-of-service' },
]

export default function Footer() {
  return (
    <footer className="border-t border-border bg-paper-light">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-4">
          {/* Wordmark Column */}
          <div className="sm:col-span-2">
            <Brand />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-muted">
              Simple production, raw material runway, orders, and profit tracking for small-scale manufacturers.
            </p>
          </div>

          {/* Account Links */}
          <div>
            <h3 className="text-sm font-semibold tracking-wider text-ink uppercase font-mono">
              Account
            </h3>
            <ul className="mt-4 space-y-3">
              {accountLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-sm text-ink-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stamp rounded-md"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="text-sm font-semibold tracking-wider text-ink uppercase font-mono">
              Legal
            </h3>
            <ul className="mt-4 space-y-3">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-sm text-ink-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stamp rounded-md"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Copyright Line */}
        <div className="mt-14 border-t border-border pt-8">
          <p className="text-xs font-mono text-ink-muted">
            © {new Date().getFullYear()} DANN. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}