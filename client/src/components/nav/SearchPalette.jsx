import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeftRight,
  Bell,
  Factory,
  Loader2,
  Package,
  Search,
  Sparkles,
  Store,
  Truck,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import { useVisibleNavLinks } from './useVisibleNavLinks.js'
import { getProducts } from '../../lib/api/production.js'
import { getMaterials } from '../../lib/api/inventory.js'
import { getRetailers } from '../../lib/api/retailers.js'
import { getOrders } from '../../lib/api/orders.js'

const STALE_AFTER_MS = 60_000
const MAX_PER_GROUP = 5
const EMPTY = { products: [], materials: [], retailers: [], orders: [] }

// Global search, opened from the sidebar or with Ctrl/Cmd+K. It searches
// pages and, once something is typed, products, materials, retailers and
// orders, and takes you to the page where that thing lives.
//
// It only searches what this person's modules may read, using the same
// endpoints (and therefore the same backend rules) as the pages themselves.
// Data is fetched when the palette opens, and re-fetched if it is older than
// a minute, so results are fresh without every keystroke hitting the API.
export default function SearchPalette({ open, onClose }) {
  const { access } = useAuth()
  const navigate = useNavigate()
  const links = useVisibleNavLinks()

  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const [data, setData] = useState(EMPTY)
  const [loading, setLoading] = useState(false)

  const inputRef = useRef(null)
  const listRef = useRef(null)
  const loadedAtRef = useRef(0)

  useEffect(() => {
    if (!open) return
    setQuery('')
    setActiveIndex(0)
    inputRef.current?.focus()

    if (Date.now() - loadedAtRef.current < STALE_AFTER_MS) return

    let cancelled = false
    setLoading(true)

    const none = Promise.resolve([])
    Promise.allSettled([
      access.hasAny('production', 'orders', 'inventory') ? getProducts() : none,
      access.hasAny('inventory', 'production') ? getMaterials() : none,
      access.hasAny('orders', 'finance') ? getRetailers() : none,
      access.hasAny('orders', 'finance') ? getOrders() : none,
    ]).then((results) => {
      if (cancelled) return
      const [products, materials, retailers, orders] = results.map((r) =>
        r.status === 'fulfilled' && Array.isArray(r.value) ? r.value : []
      )
      setData({ products, materials, retailers, orders })
      loadedAtRef.current = Date.now()
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [open, access])

  const pages = useMemo(() => {
    const list = links.map((link) => ({
      key: `page-${link.to}`,
      group: 'Pages',
      label: link.label,
      sub: 'Page',
      to: link.to,
      icon: link.icon,
    }))
    list.push({ key: 'page-alerts', group: 'Pages', label: 'Alerts', sub: 'Page', to: '/alerts', icon: Bell })
    if (access.canManageStaff) {
      list.push({ key: 'page-ai', group: 'Pages', label: 'DANN AI', sub: 'Page', to: '/ai-insights', icon: Sparkles })
      list.push({ key: 'page-migrate', group: 'Pages', label: 'Migrate data', sub: 'Page', to: '/migration', icon: ArrowLeftRight })
    }
    return list
  }, [links, access])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return pages

    const matches = (...texts) => texts.some((t) => (t || '').toLowerCase().includes(q))

    // Send people to a page they can actually open.
    const productPath = access.hasAny('production') ? '/production' : access.hasAny('orders') ? '/orders' : '/inventory'
    const materialPath = access.hasAny('inventory') ? '/inventory' : '/production'
    const orderPath = access.hasAny('orders') ? '/orders' : '/finance'

    const pageResults = pages.filter((p) => matches(p.label)).slice(0, MAX_PER_GROUP)

    const productResults = data.products
      .filter((p) => matches(p.name, p.category))
      .slice(0, MAX_PER_GROUP)
      .map((p) => ({
        key: `product-${p.id}`,
        group: 'Products',
        label: p.name,
        sub: p.category || 'Product',
        to: productPath,
        icon: Factory,
      }))

    const materialResults = data.materials
      .filter((m) => matches(m.name, m.supplier_name))
      .slice(0, MAX_PER_GROUP)
      .map((m) => ({
        key: `material-${m.id}`,
        group: 'Materials',
        label: m.name,
        sub: `${m.qtyOnHand ?? m.current_stock ?? 0} ${m.unit ?? ''}`.trim(),
        to: materialPath,
        icon: Package,
      }))

    const retailerResults = data.retailers
      .filter((r) => matches(r.name, r.contact_phone))
      .slice(0, MAX_PER_GROUP)
      .map((r) => ({
        key: `retailer-${r.id}`,
        group: 'Retailers',
        label: r.name,
        sub: 'Retailer',
        to: orderPath,
        icon: Store,
      }))

    const orderResults = data.orders
      .filter((o) => matches(o.retailer_name, o.product_name))
      .slice(0, MAX_PER_GROUP)
      .map((o) => ({
        key: `order-${o.id}`,
        group: 'Orders',
        label: `${o.retailer_name} · ${o.product_name}`,
        sub: `${o.quantity} units · ${o.status}`,
        to: orderPath,
        icon: Truck,
      }))

    return [...pageResults, ...productResults, ...materialResults, ...retailerResults, ...orderResults]
  }, [query, pages, data, access])

  // Keep the highlighted row in view while arrowing through a long list.
  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, results])

  if (!open) return null

  function choose(item) {
    if (!item) return
    navigate(item.to)
    onClose()
  }

  function handleKeyDown(event) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, Math.max(results.length - 1, 0)))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      choose(results[activeIndex])
    } else if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
    }
  }

  let lastGroup = null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 pt-[12vh] backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search"
        className="w-full max-w-xl overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-[var(--color-border)] px-4 py-3">
          <Search size={18} strokeWidth={2} className="shrink-0 text-[var(--color-ink-muted)]" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setActiveIndex(0)
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search pages and your data…"
            aria-label="Search"
            autoComplete="off"
            spellCheck={false}
            className="flex-1 bg-transparent text-base text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-muted)]/70"
          />
          {loading && (
            <Loader2 size={16} className="shrink-0 animate-spin text-[var(--color-ink-muted)]" aria-label="Loading" />
          )}
        </div>

        <div ref={listRef} className="max-h-[50vh] overflow-y-auto p-2">
          {results.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-[var(--color-ink-muted)]">
              {loading ? 'Searching your data…' : `No matches for "${query.trim()}"`}
            </p>
          ) : (
            results.map((item, index) => {
              const showHeader = item.group !== lastGroup
              lastGroup = item.group
              const Icon = item.icon
              const isActive = index === activeIndex
              return (
                <div key={item.key}>
                  {showHeader && (
                    <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
                      {item.group}
                    </p>
                  )}
                  <button
                    type="button"
                    data-active={isActive}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => choose(item)}
                    className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm ${
                      isActive
                        ? 'bg-[var(--color-stamp)] text-[var(--color-paper-light)]'
                        : 'text-[var(--color-ink)] hover:bg-[var(--color-paper)]'
                    }`}
                  >
                    <Icon size={16} strokeWidth={2} className="shrink-0" />
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    <span className={`shrink-0 text-xs ${isActive ? 'opacity-80' : 'text-[var(--color-ink-muted)]'}`}>
                      {item.sub}
                    </span>
                  </button>
                </div>
              )
            })
          )}
        </div>

        <div className="hidden border-t border-[var(--color-border)] px-4 py-2 text-xs text-[var(--color-ink-muted)] sm:block">
          ↑ ↓ to move · Enter to open · Esc to close
        </div>
      </div>
    </div>
  )
}