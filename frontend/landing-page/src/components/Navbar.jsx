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
      .map((link) => document.querySelector(link.href))
      .filter(Boolean)

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActive(`#${entry.target.id}`)
          }
        })
      },
      { rootMargin: '-30% 0px -50% 0px' }
    )

    sections.forEach((section) => observer.observe(section))

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('keydown', closeOnEscape)

    return () => {
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [])

  useEffect(() => {
    const closeOnDesktop = () => {
      if (window.innerWidth >= 768) setOpen(false)
    }

    window.addEventListener('resize', closeOnDesktop)

    return () => window.removeEventListener('resize', closeOnDesktop)
  }, [])

  return (
    <div className="flex w-full justify-center px-3 pt-3 sm:px-4 sm:pt-5">
      <div className="relative w-full max-w-[780px] rounded-full border border-border bg-paper-light/95 py-2 pl-3 pr-2 shadow-md backdrop-blur-md">
        <div className="flex items-center">
          <div className="shrink-0">
            <Brand />
          </div>

          <nav
            className="ml-8 hidden items-center gap-6 md:flex"
            aria-label="Primary navigation"
          >
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors ${
                  active === link.href
                    ? 'font-semibold text-stamp'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <Link
              to="/login"
              className="hidden text-sm font-medium text-ink-muted transition-colors hover:text-ink sm:inline-block"
            >
              Log in
            </Link>

            <Link
              to="/signup"
              className="hidden items-center gap-2 rounded-full bg-stamp py-1 pl-4 pr-1 text-sm font-medium text-white transition-colors hover:bg-stamp-dark sm:inline-flex"
            >
              Start free
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
                <ChevronRight size={14} aria-hidden="true" />
              </span>
            </Link>

            <Link
              to="/signup"
              className="inline-flex items-center rounded-full bg-stamp px-3.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-stamp-dark sm:hidden"
            >
              Start free
            </Link>

            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-ink transition-colors hover:bg-paper md:hidden"
              aria-expanded={open}
              aria-controls="mobile-navigation"
              aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
              onClick={() => setOpen((value) => !value)}
            >
              {open ? (
                <X size={20} aria-hidden="true" />
              ) : (
                <Menu size={20} aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {open && (
          <nav
            id="mobile-navigation"
            className="fixed left-3 right-3 top-[78px] z-[120] max-h-[calc(100vh-94px)] overflow-y-auto rounded-2xl border border-border bg-white p-4 shadow-2xl md:hidden"
            aria-label="Mobile navigation"
          >
            <div className="flex flex-col gap-1">
              {links.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={`rounded-xl px-4 py-3 text-base font-medium transition-colors ${
                    active === link.href
                      ? 'bg-stamp/10 text-stamp'
                      : 'text-ink hover:bg-paper'
                  }`}
                >
                  {link.label}
                </a>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-border pt-4">
              <Link
                to="/login"
                onClick={() => setOpen(false)}
                className="rounded-xl border border-border px-4 py-3 text-center text-sm font-medium text-ink transition-colors hover:bg-paper"
              >
                Log in
              </Link>

              <Link
                to="/signup"
                onClick={() => setOpen(false)}
                className="rounded-xl bg-stamp px-4 py-3 text-center text-sm font-medium text-white transition-colors hover:bg-stamp-dark"
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