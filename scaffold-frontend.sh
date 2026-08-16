#!/usr/bin/env bash
# Run from the repo root (DANN/), on the client-agents branch.
# Fills in the rest of frontend/ with working stub code — not just empty folders.
set -e

cd frontend 2>/dev/null || { echo "No frontend/ folder here — run this from the repo root."; exit 1; }

mkdir -p public/icons \
  src/components/ui src/components/nav \
  src/features/dashboard \
  src/features/inventory/components \
  src/features/production/components \
  src/features/orders/components \
  src/features/finance/components \
  src/features/ai-insights/components \
  src/features/team/components \
  src/features/settings/onboarding \
  src/lib/api src/context src/assets

# ---------- root config files ----------

cat > package.json << 'EOF'
{
  "name": "dann-frontend",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.26.0",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.5.2"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.1",
    "@tailwindcss/vite": "^4.0.0",
    "vite": "^5.4.1",
    "tailwindcss": "^4.0.0"
  }
}
EOF

cat > vite.config.js << 'EOF'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
EOF

cat > jsconfig.json << 'EOF'
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
EOF

cat > components.json << 'EOF'
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": false,
  "tailwind": {
    "config": "",
    "css": "src/index.css",
    "baseColor": "neutral",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
EOF

cat > index.html << 'EOF'
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>MicroMake</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
EOF

cat > .env.example << 'EOF'
VITE_API_BASE_URL=http://localhost:8000
EOF

# ---------- src root ----------

cat > src/main.jsx << 'EOF'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
EOF

cat > src/App.jsx << 'EOF'
import { RouterProvider } from 'react-router-dom'
import { router } from './router.jsx'

// App only mounts the router — no other logic lives here.
export default function App() {
  return <RouterProvider router={router} />
}
EOF

cat > src/router.jsx << 'EOF'
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
EOF

cat > src/index.css << 'EOF'
@import "tailwindcss";

@theme {
  --color-brand-50: #eef6f2;
  --color-brand-600: #0f6e56;
  --font-sans: "Inter", system-ui, sans-serif;
}
EOF

# ---------- shared components ----------

cat > src/components/StampBadge.jsx << 'EOF'
export default function StampBadge({ children, tone = 'neutral' }) {
  // Small status badge reused across inventory/orders/production views.
  return <span data-tone={tone}>{children}</span>
}
EOF

cat > src/components/Card.jsx << 'EOF'
export default function Card({ title, children }) {
  return (
    <div className="rounded-lg border p-4">
      {title && <h3 className="mb-2 text-sm font-medium">{title}</h3>}
      {children}
    </div>
  )
}
EOF

cat > src/components/nav/AppShell.jsx << 'EOF'
import { Outlet, Link } from 'react-router-dom'

// Sidebar nav + route transitions. Every page renders inside this shell.
export default function AppShell() {
  const links = [
    ['/', 'Dashboard'],
    ['/inventory', 'Inventory'],
    ['/production', 'Production'],
    ['/orders', 'Orders'],
    ['/finance', 'Finance'],
    ['/ai-insights', 'AI Insights'],
    ['/team', 'Team'],
    ['/settings', 'Settings'],
  ]
  return (
    <div className="flex min-h-screen">
      <nav className="flex w-56 flex-col gap-2 border-r p-4">
        {links.map(([to, label]) => (
          <Link key={to} to={to}>{label}</Link>
        ))}
      </nav>
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  )
}
EOF

# ---------- feature pages + sub-components (generated) ----------

make_component() {
  local path="$1" name="$2" note="$3"
  cat > "$path" << EOF
export default function ${name}() {
  // ${note}
  return (
    <div>
      <h2 className="text-lg font-medium">${name}</h2>
    </div>
  )
}
EOF
}

make_component src/features/dashboard/DashboardPage.jsx DashboardPage \
  "top-level overview — pulls summary numbers from every other feature's API"

make_component src/features/inventory/InventoryPage.jsx InventoryPage \
  "real-time stock per product — data from lib/api/inventory.js"
make_component src/features/inventory/components/RunwayCard.jsx RunwayCard \
  "shows days-of-runway from agents/predictors/runway_predictor.py"
make_component src/features/inventory/components/StockTable.jsx StockTable \
  "table of current stock levels"
make_component src/features/inventory/components/AlertList.jsx AlertList \
  "low-stock threshold warnings"

make_component src/features/production/ProductionPlannerPage.jsx ProductionPlannerPage \
  "log a production run — auto-deducts materials per recipe"
make_component src/features/production/components/LiveCostCalculator.jsx LiveCostCalculator \
  "recalculates batch cost as quantities change"
make_component src/features/production/components/BOMEditor.jsx BOMEditor \
  "edit the bill of materials / recipe for a product"

make_component src/features/orders/OrdersLedgerPage.jsx OrdersLedgerPage \
  "retailer list + deliveries logged against inventory"
make_component src/features/orders/components/RetailerCard.jsx RetailerCard \
  "single retailer summary — paid/unpaid status"
make_component src/features/orders/components/DispatchStatus.jsx DispatchStatus \
  "delivery status for an order"
make_component src/features/orders/components/ARSummary.jsx ARSummary \
  "accounts-receivable summary across retailers"

make_component src/features/finance/FinancePage.jsx FinancePage \
  "cost vs revenue, derived from inventory + orders + production"
make_component src/features/finance/components/ProfitByProductTable.jsx ProfitByProductTable \
  "per-product profit breakdown"

make_component src/features/ai-insights/AIInsightsPage.jsx AIInsightsPage \
  "entry point for the Claude-powered features — calls lib/api/intelligence.js only"
make_component src/features/ai-insights/components/VoiceLogger.jsx VoiceLogger \
  "record/upload a voice note -> agents/llm/voice_extraction_agent.py"
make_component src/features/ai-insights/components/ChatAssistant.jsx ChatAssistant \
  "chat UI for the conversational assistant agent"

make_component src/features/team/TeamPage.jsx TeamPage \
  "team members + oversight tags"
make_component src/features/team/components/OversightTagEditor.jsx OversightTagEditor \
  "assign oversight tags to a team member"

make_component src/features/settings/SettingsPage.jsx SettingsPage \
  "tenant + account settings"
make_component src/features/settings/onboarding/OnboardingWizard.jsx OnboardingWizard \
  "first-run setup flow for a new manufacturer"

# ---------- lib/api ----------

cat > src/lib/api/client.js << 'EOF'
const BASE_URL = import.meta.env.VITE_API_BASE_URL

export async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`)
  return res.json()
}
EOF

cat > src/lib/api/inventory.js << 'EOF'
import { apiFetch } from './client.js'

export const getInventory = () => apiFetch('/api/inventory')
export const getRunway = (productId) => apiFetch(`/api/inventory/runway/${productId}`)
EOF

cat > src/lib/api/production.js << 'EOF'
import { apiFetch } from './client.js'

export const getRecipes = () => apiFetch('/api/production/recipes')
export const logProductionRun = (payload) =>
  apiFetch('/api/production/log', { method: 'POST', body: JSON.stringify(payload) })
EOF

cat > src/lib/api/orders.js << 'EOF'
import { apiFetch } from './client.js'

export const getOrders = () => apiFetch('/api/orders')
export const getRetailers = () => apiFetch('/api/orders/retailers')
EOF

cat > src/lib/api/finance.js << 'EOF'
import { apiFetch } from './client.js'

export const getProfitSummary = () => apiFetch('/api/finance/profit-summary')
EOF

cat > src/lib/api/intelligence.js << 'EOF'
import { apiFetch } from './client.js'

// The ONLY file that talks to the agents/ module — everything AI-powered
// routes through here, never call agents/ endpoints from elsewhere.
export const getAnomalies = () => apiFetch('/api/intelligence/anomalies')
export const askAssistant = (message) =>
  apiFetch('/api/intelligence/assistant', {
    method: 'POST',
    body: JSON.stringify({ message }),
  })
EOF

cat > src/lib/utils.js << 'EOF'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}
EOF

# ---------- context ----------

cat > src/context/AuthContext.jsx << 'EOF'
import { createContext, useContext, useState } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
EOF

cat > src/context/TenantContext.jsx << 'EOF'
import { createContext, useContext, useState } from 'react'

const TenantContext = createContext(null)

export function TenantProvider({ children }) {
  const [tenant, setTenant] = useState(null)
  return (
    <TenantContext.Provider value={{ tenant, setTenant }}>
      {children}
    </TenantContext.Provider>
  )
}

export const useTenant = () => useContext(TenantContext)
EOF

echo "frontend/ scaffolded."
find . -type f | sort