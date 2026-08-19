import { createBrowserRouter } from 'react-router-dom'
import AppShell from './components/nav/AppShell.jsx'
import HomePage from './features/home/HomePage.jsx'
import ProductionPlannerPage from './features/production/ProductionPlannerPage.jsx'
import InventoryPage from './features/inventory/InventoryPage.jsx'
import OrdersLedgerPage from './features/orders/OrdersLedgerPage.jsx'
import FinancePage from './features/finance/FinancePage.jsx'
import AIInsightsPage from './features/ai-insights/AIInsightsPage.jsx'
import SettingsPage from './features/settings/SettingsPage.jsx'
import AlertsPage from './features/alerts/AlertsPage.jsx'

// 5 nav tabs: Home, Production, Inventory, Orders, Finance.
// ai-insights and settings exist as routes but are NOT in the bottom nav.
// alerts is reachable ONLY via the bell icon — never appears in
// navLinks.js, so no nav surface (sidebar/bottom nav/drawer) links to it.
export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'production', element: <ProductionPlannerPage /> },
      { path: 'inventory', element: <InventoryPage /> },
      { path: 'orders', element: <OrdersLedgerPage /> },
      { path: 'finance', element: <FinancePage /> },
      { path: 'ai-insights', element: <AIInsightsPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'alerts', element: <AlertsPage /> },
    ],
  },
])