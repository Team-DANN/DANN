import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronLeft, LogOut } from 'lucide-react'
import { useSettings } from '../../context/SettingsContext.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { useIsDesktop } from '../../hooks/useIsDesktop.js'
import { getInitials } from '../../lib/utils/getInitials.js'
import {
  SettingsSectionList,
  SettingsSectionBody,
  useVisibleSections,
} from './SettingsContent.jsx'
import Breadcrumbs from '../../components/nav/Breadcrumbs.jsx'
import ChatbotWidget from '../ai-insights/chatbot/ChatbotWidget.jsx'

const pageClass = 'mx-auto max-w-md px-4 pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]'

// Mobile Settings. On desktop this route just opens the Settings modal.
// Everything that used to be in the avatar popover is a section here now
// (Appearance, Language and Get apps are under Preferences).
export default function SettingsPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isDesktop = useIsDesktop()
  const { open: openSettingsModal } = useSettings()
  const { user, logout, access } = useAuth()
  const visibleSections = useVisibleSections()

  const requestedSection = searchParams.get('section')
  const [activeSection, setActiveSection] = useState(requestedSection)

  useEffect(() => {
    if (isDesktop) {
      navigate('/', { replace: true })
      openSettingsModal(requestedSection ?? 'account')
    }
  }, [isDesktop, navigate, openSettingsModal, requestedSection])

  if (isDesktop) return null

  // A section this person can't see (for example ?section=plan for a
  // manager) shows the list instead of a blank page.
  const openSection = visibleSections.some((s) => s.id === activeSection) ? activeSection : null

  // AuthContext.logout() decides where to go (staff login for staff, email
  // login for owners, or another stored account), so nothing is forced here.
  const handleLogout = () => logout()

  // The chat assistant reads the whole business, so owner and manager only.
  const chatbot = access.canManageStaff ? <ChatbotWidget /> : null

  if (openSection) {
    return (
      <>
        <div className={pageClass}>
          <Breadcrumbs />
          <SettingsSectionBody sectionId={openSection} onBack={() => setActiveSection(null)} />
        </div>
        {chatbot}
      </>
    )
  }

  return (
    <>
      <div className={pageClass}>
        <Breadcrumbs />

        <div className="mb-1 flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Back"
            className="rounded-md p-1 -ml-1 text-[var(--color-ink-muted)] hover:bg-[var(--color-paper)] hover:text-[var(--color-ink)]"
          >
            <ChevronLeft size={20} strokeWidth={2} />
          </button>
          <h1 className="font-[Roboto_Slab] text-lg font-semibold text-[var(--color-ink)]">
            Settings
          </h1>
        </div>

        <div className="mb-4 mt-4 flex items-center gap-3 px-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-stamp)] font-mono text-sm font-semibold text-[var(--color-paper-light)]">
            {getInitials(user?.name)}
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--color-ink)]">{user?.name}</p>
            {user?.email && (
              <p className="text-xs text-[var(--color-ink-muted)]">{user.email}</p>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-paper-light)] p-1">
          <SettingsSectionList onSelect={setActiveSection} />
        </div>

        <div className="my-3 border-t border-[var(--color-ink-muted)]/30" />

        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-paper-light)] p-1">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-md px-3 py-3 text-left text-sm font-medium text-[var(--color-error)] hover:bg-[var(--color-paper)]"
          >
            <LogOut size={18} strokeWidth={2} />
            Log out
          </button>
        </div>
      </div>
      {chatbot}
    </>
  )
}