import { useEffect } from 'react'
import { X } from 'lucide-react'
import SidebarContent from './SidebarContent.jsx'
import { useTheme } from '../../context/ThemeContext.jsx'
import logoCharcoal from '../../assets/logo/DANN-logo-charcoal.webp'
import logoTerracotta from '../../assets/logo/DANN-logo-terracotta.webp'

export default function MobileDrawer({ open, onClose, onOpenSearch }) {
  const { theme } = useTheme()
  const logo = theme === 'dark' ? logoTerracotta : logoCharcoal

  // Lock body scroll while open, and pad for the vanished scrollbar so
  // the page width doesn't jump — that jump is what reads as "moving."
  useEffect(() => {
    if (!open) return
    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth
    document.body.style.overflow = 'hidden'
    document.body.style.paddingRight = `${scrollBarWidth}px`
    return () => {
      document.body.style.overflow = ''
      document.body.style.paddingRight = ''
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-30 md:hidden">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />

      <div className="fixed inset-y-0 left-0 flex w-72 flex-col bg-[var(--color-paper-light)] p-4 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <img src={logo} alt="DANN" className="h-10 w-auto object-contain" />
          <button type="button" onClick={onClose} aria-label="Close menu">
            <X size={22} strokeWidth={2} className="text-[var(--color-ink-muted)]" />
          </button>
        </div>

        <SidebarContent onNavigate={onClose} onOpenSearch={onOpenSearch} />
      </div>
    </div>
  )
}