import { Home, Factory, Package, Truck, IndianRupee, Sparkles, Settings } from 'lucide-react'

export const navLinks = [
  { to: '/', label: 'Home', icon: Home, primary: true },
  { to: '/production', label: 'Production', icon: Factory, primary: true },
  { to: '/inventory', label: 'Inventory', icon: Package, primary: true },
  { to: '/orders', label: 'Orders', icon: Truck, primary: true },
  { to: '/finance', label: 'Finance', icon: IndianRupee, primary: false },
  { to: '/ai-insights', label: 'Insights', icon: Sparkles, primary: false },
  { to: '/settings', label: 'Settings', icon: Settings, primary: false },
]