import { createBrowserRouter } from 'react-router-dom'
import AppShell from './components/nav/AppShell.jsx'
import HomePage from './features/home/HomePage.jsx'
import CompanyOnboardingWizard from './features/onboarding/CompanyOnboardingWizard.jsx'
import ProductionPlannerPage from './features/production/ProductionPlannerPage.jsx'
import InventoryPage from './features/inventory/InventoryPage.jsx'
import OrdersLedgerPage from './features/orders/OrdersLedgerPage.jsx'
import FinancePage from './features/finance/FinancePage.jsx'
import AIInsightsPage from './features/ai-insights/AIInsightsPage.jsx'
import SettingsPage from './features/settings/SettingsPage.jsx'
import AlertsPage from './features/alerts/AlertsPage.jsx'
import AuthCallbackPage from './features/auth/AuthCallbackPage.jsx'

export const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <AppShell />,
      children: [
        { index: true, element: <HomePage /> },
        { path: 'onboarding', element: <CompanyOnboardingWizard /> },
        { path: 'production', element: <ProductionPlannerPage /> },
        { path: 'inventory', element: <InventoryPage /> },
        { path: 'orders', element: <OrdersLedgerPage /> },
        { path: 'finance', element: <FinancePage /> },
        { path: 'ai-insights', element: <AIInsightsPage /> },
        { path: 'alerts', element: <AlertsPage /> },
      ],
    },
    {
      path: '/onboarding-full',
      element: <CompanyOnboardingWizard />,
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