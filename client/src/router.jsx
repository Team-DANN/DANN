import { createBrowserRouter, Navigate } from 'react-router-dom'
import AppShell from './components/nav/AppShell.jsx'
import HomePage from './features/home/HomePage.jsx'
import ProductionPlannerPage from './features/production/ProductionPlannerPage.jsx'
import InventoryPage from './features/inventory/InventoryPage.jsx'
import OrdersLedgerPage from './features/orders/OrdersLedgerPage.jsx'
import FinancePage from './features/finance/FinancePage.jsx'
import AIInsightsPage from './features/ai-insights/AIInsightsPage.jsx'
import SettingsPage from './features/settings/SettingsPage.jsx'
import AlertsPage from './features/alerts/AlertsPage.jsx'
import MigrationPage from './features/migration/MigrationPage.jsx'
import AuthCallbackPage from './features/auth/AuthCallbackPage.jsx'

export const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <AppShell />,
      children: [
        { index: true, element: <HomePage /> },
        // First-run setup now lives on Home (features/home/setup). These two
        // routes only redirect so any old link or signup redirect still works.
        { path: 'onboarding', element: <Navigate to="/" replace /> },
        { path: 'production', element: <ProductionPlannerPage /> },
        { path: 'inventory', element: <InventoryPage /> },
        { path: 'migration', element: <MigrationPage /> },
        { path: 'orders', element: <OrdersLedgerPage /> },
        { path: 'finance', element: <FinancePage /> },
        { path: 'ai-insights', element: <AIInsightsPage /> },
        { path: 'alerts', element: <AlertsPage /> },
      ],
    },
    {
      path: '/onboarding-full',
      element: <Navigate to="/" replace />,
    },
    {
      path: '/settings',
      element: <SettingsPage />,
    },
    {
      path: '/auth/callback',
      element: <AuthCallbackPage />,
    },
  ],
  { basename: '/dashboard' }
)