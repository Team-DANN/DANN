import { createBrowserRouter, Navigate } from 'react-router-dom'
import AppShell from './components/nav/AppShell.jsx'
import RouteGuard from './components/nav/RouteGuard.jsx'
import HomePage from './features/home/HomePage.jsx'
import ProductionPlannerPage from './features/production/ProductionPlannerPage.jsx'
import InventoryPage from './features/inventory/InventoryPage.jsx'
import OrdersLedgerPage from './features/orders/OrdersLedgerPage.jsx'
import FinancePage from './features/finance/FinancePage.jsx'
import AIInsightsPage from './features/ai-insights/AIInsightsPage.jsx'
import TeamPage from './features/team/TeamPage.jsx'
import SettingsPage from './features/settings/SettingsPage.jsx'
import AlertsPage from './features/alerts/AlertsPage.jsx'
import MigrationPage from './features/migration/MigrationPage.jsx'
import AuthCallbackPage from './features/auth/AuthCallbackPage.jsx'
import StaffLoginPage from './features/auth/StaffLoginPage.jsx'

// Each route's `handle.crumbs` is what Breadcrumbs.jsx draws above the page:
// "Home / <crumbs...>", the last one greyed as the current page. Home itself
// declares none and shows no breadcrumb. A crumb with `to` is a link; one
// without is plain text.
//
// RouteGuard sends people without access to their first allowed page. The
// backend enforces the same rules on every request, so a guard only decides
// what the browser shows.
export const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <AppShell />,
      children: [
        // Home is owner/manager only for now. It loads every module's data at
        // once, which staff aren't allowed to read. The role-aware Home in the
        // next step removes this guard.
        {
          index: true,
          element: (
            <RouteGuard adminOnly>
              <HomePage />
            </RouteGuard>
          ),
        },
        // First-run setup now lives on Home (features/home/setup). These two
        // routes only redirect so any old link or signup redirect still works.
        { path: 'onboarding', element: <Navigate to="/" replace /> },
        {
          path: 'production',
          element: (
            <RouteGuard modules={['production']}>
              <ProductionPlannerPage />
            </RouteGuard>
          ),
          handle: { crumbs: [{ label: 'Production' }] },
        },
        {
          path: 'inventory',
          element: (
            <RouteGuard modules={['inventory']}>
              <InventoryPage />
            </RouteGuard>
          ),
          handle: { crumbs: [{ label: 'Inventory' }] },
        },
        {
          path: 'migration',
          element: (
            <RouteGuard adminOnly>
              <MigrationPage />
            </RouteGuard>
          ),
          handle: { crumbs: [{ label: 'Sync Data' }, { label: 'Migrate data' }] },
        },
        {
          path: 'orders',
          element: (
            <RouteGuard modules={['orders']}>
              <OrdersLedgerPage />
            </RouteGuard>
          ),
          handle: { crumbs: [{ label: 'Orders' }] },
        },
        {
          path: 'finance',
          element: (
            <RouteGuard modules={['finance']}>
              <FinancePage />
            </RouteGuard>
          ),
          handle: { crumbs: [{ label: 'Finance' }] },
        },
        {
          path: 'ai-insights',
          element: (
            <RouteGuard adminOnly>
              <AIInsightsPage />
            </RouteGuard>
          ),
          handle: { crumbs: [{ label: 'DANN AI' }] },
        },
        // Staff management: owner and manager only (adminOnly means
        // access.canManageStaff). The backend /api/staff routes enforce the
        // same rule, so a hand-typed URL shows staff nothing either way.
        {
          path: 'team',
          element: (
            <RouteGuard adminOnly>
              <TeamPage />
            </RouteGuard>
          ),
          handle: { crumbs: [{ label: 'Team' }] },
        },
        // Open to everyone signed in: the backend only returns the alert
        // types each person's modules allow.
        {
          path: 'alerts',
          element: <AlertsPage />,
          handle: { crumbs: [{ label: 'Alerts' }] },
        },
      ],
    },
    {
      path: '/onboarding-full',
      element: <Navigate to="/" replace />,
    },
    // Mobile Settings page (desktop opens the modal instead). Outside
    // AppShell, so SettingsPage draws its own breadcrumb.
    {
      path: '/settings',
      element: <SettingsPage />,
      handle: { crumbs: [{ label: 'Settings' }] },
    },
    {
      path: '/auth/callback',
      element: <AuthCallbackPage />,
    },
    // Outside AppShell on purpose: staff aren't signed in yet. No breadcrumb
    // here on purpose either: there is no signed-in user to take "Home" to.
    {
      path: '/staff-login',
      element: <StaffLoginPage />,
    },
  ],
  { basename: '/dashboard' }
)
