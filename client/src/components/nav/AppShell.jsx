import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import { loggedOutPath } from '../../lib/apiClient.js'
import Sidebar from './Sidebar.jsx'
import BottomNav from './BottomNav.jsx'
import TopBar from './TopBar.jsx'
import MobileDrawer from './MobileDrawer.jsx'
import Breadcrumbs from './Breadcrumbs.jsx'
import SearchPalette from './SearchPalette.jsx'
import SettingsModal from '../../features/settings/SettingsModal.jsx'
import ChatbotWidget from '../../features/ai-insights/chatbot/ChatbotWidget.jsx'

// Auth guard lives here because AppShell is the layout element for every
// dashboard route (mounted via the '/' route's children in router.jsx) —
// it's the one place that sits in front of every page in this app.
//
// While `loading` is true, render only a spinner — never redirect during
// this window. AuthContext's hydrate() effect is still resolving
// GET /api/auth/me on first load; bouncing out before that finishes would
// falsely kick out users who actually have a valid token.
//
// Once settled with no user, where we send them comes from loggedOutPath():
//   - staff and managers (PIN login) -> the staff login page
//   - owners who have signed in before here -> '/login'
//   - a browser that has never signed in -> strictly the landing page ('/')
// This has to be a hard navigation (window.location.href), not react-router's
// navigate() — /login and / live in a different app (frontend/, port 5174)
// than this one (client/, port 5173). They only look same-origin to the
// browser because of the dev proxy / vercel.json rewrites; client's own
// router has no route table entry for either path.
//
// Search is opened from the sidebar/drawer or with Ctrl/Cmd+K. Breadcrumbs
// sit above every page (each route declares its trail in router.jsx).
export default function AppShell() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const { loading, isAuthenticated, access } = useAuth()

  useEffect(() => {
    function handleKeyDown(event) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setSearchOpen((open) => !open)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-[var(--color-paper)]">
        <Loader2 className="animate-spin text-stamp" size={28} aria-hidden="true" />
      </div>
    )
  }

  if (!isAuthenticated) {
    window.location.href = loggedOutPath()
    return null
  }

  const openSearch = () => setSearchOpen(true)

  return (
    <div className="flex min-h-screen bg-[var(--color-paper)]">
      <Sidebar onOpenSearch={openSearch} />

      <div className="flex flex-1 flex-col">
        <TopBar onMenuClick={() => setDrawerOpen(true)} />
        <MobileDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          onOpenSearch={openSearch}
        />

        <main className="flex-1 p-4 pb-20 md:p-6 md:pb-6">
          <Breadcrumbs />
          <Outlet />
        </main>

        <BottomNav />
      </div>

      <SearchPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
      <SettingsModal />
      {/* Owner and manager only for now: the assistant reads the whole
          business. It becomes module-aware once its actions are built. */}
      {access.canManageStaff && <ChatbotWidget />}
    </div>
  )
}