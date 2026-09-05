import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Menu, X } from 'lucide-react'
import Brand from './Brand.jsx'

const links = [
  { label: 'Features', href: '#features' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'FAQ', href: '#faq' },
]

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState('')

  useEffect(() => {
    const sections = links
      .map((l) => document.querySelector(l.href))
      .filter(Boolean)

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(`#${entry.target.id}`)
        })
      },
      { rootMargin: '-30% 0px -50% 0px' }
    )
    sections.forEach((s) => observer.observe(s))
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [])

  return (
    <div className="flex justify-center px-3 pt-4 sm:px-4 sm:pt-6">
      <div className="relative w-full max-w-[780px] rounded-full border border-border bg-paper-light/95 backdrop-blur-md py-2 pl-3 pr-2 shadow-md">
        <div className="flex items-center">
          <div className="shrink-0">
            <Brand />
          </div>

          <nav className="ml-8 hidden items-center gap-6 md:flex" aria-label="Primary navigation">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors ${
                  active === link.href ? 'text-stamp font-semibold' : 'text-ink-muted hover:text-ink'
                }`}
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <Link
              to="/login"
              className="hidden text-sm font-medium text-ink-muted transition-colors hover:text-ink sm:inline-block"
            >
              Log in
            </Link>

            <Link
              to="/signup"
              className="hidden items-center gap-2 rounded-full bg-stamp pl-4 pr-1 py-1 text-sm font-medium text-white transition-colors hover:bg-stamp-dark sm:inline-flex"
            >
              Start free
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
                <ChevronRight size={14} />
              </span>
            </Link>

            <Link
              to="/signup"
              className="inline-flex items-center gap-1 rounded-full bg-stamp px-3.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-stamp-dark sm:hidden"
            >
              Start free
            </Link>

            <button
              type="button"
              className="inline-flex items-center justify-center rounded-full p-1.5 text-ink hover:bg-paper md:hidden"
              aria-expanded={open}
              aria-controls="mobile-navigation"
              aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
            </button>
          </div>
        </div>

        {open && (
          <nav
            id="mobile-navigation"
            className="absolute left-0 right-0 top-full z-50 mt-3 rounded-2xl border border-border bg-paper-light p-4 shadow-xl md:hidden"
            aria-label="Mobile navigation"
          >
            <div className="flex flex-col gap-1">
              {links.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={`rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    active === link.href ? 'bg-stamp/10 text-stamp' : 'text-ink-muted hover:bg-paper hover:text-ink'
                  }`}
                >
                  {link.label}
                </a>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
              <Link
                to="/login"
                onClick={() => setOpen(false)}
                className="flex-1 rounded-xl border border-border py-2 text-center text-sm font-medium text-ink transition-colors hover:bg-paper"
              >
                Log in
              </Link>
              <Link
                to="/signup"
                onClick={() => setOpen(false)}
                className="flex-1 rounded-xl bg-stamp py-2 text-center text-sm font-medium text-white transition-colors hover:bg-stamp-dark"
              >
                Sign up
              </Link>
            </div>
          </nav>
        )}
      </div>
    </div>
  )
}
