import { createBrowserRouter } from 'react-router-dom'
import AppShell from './components/nav/AppShell.jsx'
import DashboardPage from './features/dashboard/DashboardPage.jsx'
import InventoryPage from './features/inventory/InventoryPage.jsx'
import ProductionPlannerPage from './features/production/ProductionPlannerPage.jsx'
import OrdersLedgerPage from './features/orders/OrdersLedgerPage.jsx'
import FinancePage from './features/finance/FinancePage.jsx'
import AIInsightsPage from './features/ai-insights/AIInsightsPage.jsx'
import TeamPage from './features/team/TeamPage.jsx'
import SettingsPage from './features/settings/SettingsPage.jsx'

// One route per feature module — keep this file the single source of
// truth for navigation, don't scatter route definitions elsewhere.
export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'inventory', element: <InventoryPage /> },
      { path: 'production', element: <ProductionPlannerPage /> },
      { path: 'orders', element: <OrdersLedgerPage /> },
      { path: 'finance', element: <FinancePage /> },
      { path: 'ai-insights', element: <AIInsightsPage /> },
      { path: 'team', element: <TeamPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
])
