import { useEffect, useState } from 'react'
import { Menu, X } from 'lucide-react'
import Brand from './Brand.jsx'

const links = [
  { label: 'Features', href: '#features' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Why DANN', href: '#why-dann' },
]

export default function Navbar() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [])

  const closeMenu = () => setOpen(false)

  return (
    <header className="site-header">
      <div className="container nav-shell">
        <Brand />

        <nav className="desktop-nav" aria-label="Primary navigation">
          {links.map((link) => (
            <a key={link.href} href={link.href}>{link.label}</a>
          ))}
        </nav>

        <div className="nav-actions">
          <a className="nav-link-subtle" href="#login">Log in</a>
          <a className="button button--small button--primary" href="#pilot">Sign up</a>
        </div>

        <button
          className="menu-button"
          type="button"
          aria-expanded={open}
          aria-controls="mobile-navigation"
          aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </button>
      </div>

      <div className={`mobile-nav-wrap ${open ? 'is-open' : ''}`} id="mobile-navigation">
        <nav className="container mobile-nav" aria-label="Mobile navigation">
          {links.map((link) => (
            <a key={link.href} href={link.href} onClick={closeMenu}>{link.label}</a>
          ))}
          <div className="mobile-nav-actions">
            <a className="nav-link-subtle" href="#login" onClick={closeMenu}>Log in</a>
            <a className="button button--primary button--full" href="#pilot" onClick={closeMenu}>Sign up</a>
          </div>
        </nav>
      </div>
    </header>
  )
}
