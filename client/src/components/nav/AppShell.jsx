import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'
import BottomNav from './BottomNav.jsx'
import TopBar from './TopBar.jsx'
import MobileDrawer from './MobileDrawer.jsx'

// Desktop: full sidebar, all destinations + logout, no hamburger needed.
// Mobile: top bar (hamburger, notifications, avatar) + 4-item bottom tab
// bar for the daily loop + drawer for everything else.
export default function AppShell() {
  const [drawerOpen, setDrawerOpen] = useState(false)

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
    </div>
  )
}