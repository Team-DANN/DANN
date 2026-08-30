import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import Brand from './Brand.jsx'

const links = [
  { label: 'Features', href: '#features' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'FAQ', href: '#faq' },
]

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [active, setActive] = useState('')

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

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
      { rootMargin: '-40% 0px -55% 0px' }
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

  const closeMenu = () => setOpen(false)

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/80 backdrop-blur-xl shadow-lg shadow-ink/5 border-b border-stamp/10'
          : 'bg-white/75 backdrop-blur-lg border-b border-transparent'
      }`}
    >
      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-stamp via-stamp-dark to-stamp" />

      <div className="mx-auto flex h-16 lg:h-20 max-w-6xl items-center justify-between px-6">
        <Brand />

        <nav className="hidden md:flex items-center gap-8" aria-label="Primary navigation">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={`group relative text-sm lg:text-base font-semibold [text-shadow:0_1px_3px_rgba(32,29,25,0.12)] transition-colors ${
                active === link.href ? 'text-ink' : 'text-ink-muted hover:text-ink'
              }`}
            >
              {link.label}
              <span
                className={`absolute -bottom-1 left-0 h-0.5 bg-stamp transition-all duration-300 ${
                  active === link.href ? 'w-full' : 'w-0 group-hover:w-full'
                }`}
              />
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center">
          <Link
            to="/signup"
            className="rounded-full bg-gradient-to-r from-stamp to-stamp-dark px-7 py-2.5 lg:px-8 lg:py-3 text-sm lg:text-base font-semibold text-white shadow-lg shadow-stamp/30 hover:shadow-xl hover:shadow-stamp/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
          >
            Sign up
          </Link>
        </div>

        <button
          type="button"
          className="md:hidden inline-flex items-center justify-center rounded-full p-2 text-ink hover:bg-paper-dark/40 transition-colors"
          aria-expanded={open}
          aria-controls="mobile-navigation"
          aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X aria-hidden="true" size={22} /> : <Menu aria-hidden="true" size={22} />}
        </button>
      </div>

      <div
        id="mobile-navigation"
        className={`md:hidden overflow-hidden transition-[max-height] duration-300 ease-in-out ${
          open ? 'max-h-96' : 'max-h-0'
        }`}
      >
        <nav
          className="flex flex-col gap-1 border-t border-stamp/10 bg-white/95 backdrop-blur-xl px-6 py-4"
          aria-label="Mobile navigation"
        >
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={closeMenu}
              className={`rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                active === link.href
                  ? 'bg-stamp/10 text-stamp'
                  : 'text-ink-muted hover:bg-paper-dark/30 hover:text-ink'
              }`}
            >
              {link.label}
            </a>
          ))}
          <Link
            to="/signup"
            onClick={closeMenu}
            className="mt-2 rounded-full bg-gradient-to-r from-stamp to-stamp-dark px-6 py-2.5 text-center text-sm font-semibold text-white shadow-lg shadow-stamp/30 transition-all duration-200"
          >
            Sign up
          </Link>
        </nav>
      </div>
    </header>
  )
}