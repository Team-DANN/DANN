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
export const navLinks = [
  { to: '/', label: 'Home', icon: Home, primary: true },
  { to: '/production', label: 'Production', icon: Factory, primary: true },
  { to: '/inventory', label: 'Inventory', icon: Package, primary: false },
  { to: '/orders', label: 'Orders', icon: Truck, primary: true },
  { to: '/finance', label: 'Profit', icon: BanknoteArrowUp, primary: true },
  { to: '/ai-insights', label: 'Insights', icon: Sparkles, primary: false },
  { to: '/settings', label: 'Settings', icon: Settings, primary: false },
]