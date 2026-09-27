import { Home, Factory, Package, Truck, BanknoteArrowUp, Sparkles, Settings } from 'lucide-react'

// 4 primary tabs in the bottom nav: Home, Production, Orders, Profit.
// Route path stays "/finance" to avoid touching router.jsx — only the
// label/primary flag changed here.
//
// Inventory is NOT a primary tab — reachable via the hamburger drawer
// instead, alongside Insights and Settings, to keep the bottom nav to 4.
//
// Insights (ai-insights) and Settings are NOT primary tabs:
// - Settings is surfaced as a gear icon, not a nav link
// - Insights is a section (surfaces agent output), not a standalone tab
// Alerts is deliberately absent from this file entirely — reachable only
// via the bell icon in TopBar, per the Alerts scoping decision.
//
// /migration has no entry here anymore — it moved under the Sync Data
// menu (SyncDataMenu.jsx, "Bulk import") in both Sidebar and
// MobileDrawer, alongside camera capture and photo upload, instead of
// sitting as its own standalone nav destination. Router path itself
// ('/migration' in router.jsx) is untouched — only its nav entry point
// changed.
export const navLinks = [
  { to: '/', label: 'Home', icon: Home, primary: true },
  { to: '/production', label: 'Production', icon: Factory, primary: true },
  { to: '/inventory', label: 'Inventory', icon: Package, primary: false },
  { to: '/orders', label: 'Orders', icon: Truck, primary: true },
  { to: '/finance', label: 'Finance', icon: BanknoteArrowUp, primary: true },
  { to: '/ai-insights', label: 'Insights', icon: Sparkles, primary: false },
  { to: '/settings', label: 'Settings', icon: Settings, primary: false },
]