import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import { hasAuthenticatedBefore } from '../../lib/apiClient.js'
import Sidebar from './Sidebar.jsx'
import BottomNav from './BottomNav.jsx'
import TopBar from './TopBar.jsx'
import MobileDrawer from './MobileDrawer.jsx'
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
// Once settled with no user, where we send them depends on whether this
// browser has ever completed a login/signup before (dann_has_authenticated,
// same flag DashboardRedirect.jsx checks on the marketing site):
//   - never authenticated here -> strictly the landing page ('/')
//   - authenticated before, session just lapsed -> '/login'
// This has to be a hard navigation (window.location.href), not react-router's
// navigate() — /login and / live in a different app (frontend/, port 5174)
// than this one (client/, port 5173). They only look same-origin to the
// browser because of the dev proxy / vercel.json rewrites; client's own
// router has no route table entry for either path.
export default function AppShell() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { loading, isAuthenticated } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-[var(--color-paper)]">
        <Loader2 className="animate-spin text-stamp" size={28} aria-hidden="true" />
      </div>
    )
  }

  if (!isAuthenticated) {
    window.location.href = hasAuthenticatedBefore() ? '/login' : '/'
    return null
  }

  return (
    <div className="flex min-h-screen bg-[var(--color-paper)]">
      <Sidebar />

      <div className="flex flex-1 flex-col">
        <TopBar onMenuClick={() => setDrawerOpen(true)} />
        <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

        <main className="flex-1 p-4 pb-20 md:p-6 md:pb-6">
          <Outlet />
        </main>

        <BottomNav />
      </div>

      <SettingsModal />
      <ChatbotWidget />
    </div>
  )
}