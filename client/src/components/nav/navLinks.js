import { Home, Factory, Package, Truck, BanknoteArrowUp } from 'lucide-react'

// The main links, in sidebar order: Home, Production, Orders, Inventory,
// Finance. Everything here is filtered per person by useVisibleNavLinks:
//   module     shown only to people who hold that module (owner and manager
//              hold them all)
//   adminOnly  shown to owner and manager only
// A link with neither is shown to everyone signed in.
//
// Search, DANN AI, Sync Data, Settings and Log out are no longer listed
// here: they have their own places in SidebarContent. Insights is no longer
// a nav item; it lives inside the DANN AI page. Alerts is reachable only via
// the bell in TopBar, as before.
//
// `primary` marks the links shown in the mobile bottom bar for owners and
// managers. Staff see all of their allowed links there.
//
// Home is owner/manager only until the role-aware Home arrives (step 2b),
// because the current Home loads every module's data at once.
export const navLinks = [
  { to: '/', label: 'Home', icon: Home, primary: true, adminOnly: true },
  { to: '/production', label: 'Production', icon: Factory, primary: true, module: 'production' },
  { to: '/orders', label: 'Orders', icon: Truck, primary: true, module: 'orders' },
  { to: '/inventory', label: 'Inventory', icon: Package, primary: false, module: 'inventory' },
  { to: '/finance', label: 'Finance', icon: BanknoteArrowUp, primary: true, module: 'finance' },
]