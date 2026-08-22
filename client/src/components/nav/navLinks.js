import { Home, Factory, Package, Truck,  BanknoteArrowUp, Sparkles, Settings } from 'lucide-react'

// 5 primary tabs per the locked nav spec: Home, Production, Inventory,
// Orders, Profit. Route path stays "/finance" to avoid touching
// router.jsx — only the label/primary flag changed here.
//
// Insights (ai-insights) and Settings are NOT primary tabs:
// - Settings is surfaced as a gear icon, not a nav link
// - Insights is a section (surfaces agent output), not a standalone tab
// Alerts is deliberately absent from this file entirely — reachable only
// via the bell icon in TopBar, per the Alerts scoping decision.
export const navLinks = [
  { to: '/', label: 'Home', icon: Home, primary: true },
  { to: '/production', label: 'Production', icon: Factory, primary: true },
  { to: '/inventory', label: 'Inventory', icon: Package, primary: true },
  { to: '/orders', label: 'Orders', icon: Truck, primary: true },
  { to: '/finance', label: 'Profit', icon: BanknoteArrowUp, primary: true },
  { to: '/ai-insights', label: 'Insights', icon: Sparkles, primary: false },
  { to: '/settings', label: 'Settings', icon: Settings, primary: false },
]