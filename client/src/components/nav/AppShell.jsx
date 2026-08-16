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
