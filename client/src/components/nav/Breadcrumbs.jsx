import { Link, useMatches } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'

// Solid house icon (Material "home" shape), to match the design reference.
function HomeIcon({ size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className="shrink-0"
    >
      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
    </svg>
  )
}

// Draws "[house] Home / Production" above a page. Each route declares its
// trail in router.jsx as `handle: { crumbs: [{ label, to? }] }`; this reads
// them from the matched routes with useMatches(), which needs a data router
// (createBrowserRouter, which router.jsx uses).
//
// - Home itself declares no crumbs, so nothing is drawn on the Home page.
// - The last crumb is the current page: greyed, plain text, never a link.
// - An earlier crumb with `to` is a link; one without is plain text.
// - "Home" goes to access.firstAllowedPath: '/' for owner and manager, a
//   staff member's first module until the role-aware Home exists.
export default function Breadcrumbs() {
  const matches = useMatches()
  const { access } = useAuth()

  const crumbs = matches.flatMap((match) => match.handle?.crumbs ?? [])
  if (crumbs.length === 0) return null

  return (
    <nav aria-label="Breadcrumb" className="mb-5">
      <ol className="flex flex-wrap items-center gap-2 text-base">
        <li className="flex items-center">
          <Link
            to={access.firstAllowedPath}
            className="flex items-center gap-2 text-[var(--color-ink)] transition-colors hover:text-[var(--color-stamp)]"
          >
            <HomeIcon />
            <span>Home</span>
          </Link>
        </li>

        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1
          return (
            <li key={`${crumb.label}-${index}`} className="flex items-center gap-2">
              <span aria-hidden="true" className="text-[var(--color-ink)]">
                /
              </span>
              {isLast || !crumb.to ? (
                <span
                  aria-current={isLast ? 'page' : undefined}
                  className={isLast ? 'text-[var(--color-ink-muted)]' : 'text-[var(--color-ink)]'}
                >
                  {crumb.label}
                </span>
              ) : (
                <Link
                  to={crumb.to}
                  className="text-[var(--color-ink)] transition-colors hover:text-[var(--color-stamp)]"
                >
                  {crumb.label}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}