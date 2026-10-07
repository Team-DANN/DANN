// PATH: src/components/nav/SyncDataMenu.jsx
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Camera, Upload, ArrowLeftRight, Factory, Package, ChevronLeft } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'

// Shared by the sidebar (desktop) and the mobile drawer through
// SidebarContent. It sits at the TOP of the sidebar now, so its menu opens
// downward.
//
// "Migrate data" routes to /migration and is for owner and manager only.
//
// "Take a photo" / "Upload photos" go to a destination: a photo could be a
// batch sheet (Production) or a delivery note (Inventory). Only the
// destinations this person may use are offered. With two, a picker asks;
// with one, they go straight there; with none (for example orders-only or
// finance-only staff) the photo actions are not shown at all.
//
// The sidebar can't call a handler that only exists on whichever page is
// mounted, so it navigates with router state, { autoPhoto: 'camera' |
// 'upload' }, and ProductionPlannerPage.jsx / InventoryPage.jsx read that
// once on mount to auto-open PhotoLogButton.jsx's real picker there.
// Nothing here talks to the OCR pipeline directly.
const VIEW = { ROOT: 'root', PICK_DESTINATION: 'destination' }

const DESTINATIONS = [
  { module: 'production', path: '/production', label: 'Production — a batch sheet', icon: Factory },
  { module: 'inventory', path: '/inventory', label: 'Inventory — a delivery or label', icon: Package },
]

const rowClass =
  'flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm text-[var(--color-ink-muted)] hover:bg-[var(--color-paper)] hover:text-[var(--color-ink)]'

export default function SyncDataMenu({ onNavigate }) {
  const { access } = useAuth()
  const [open, setOpen] = useState(false)
  const [view, setView] = useState(VIEW.ROOT)
  const [pendingAction, setPendingAction] = useState(null) // 'camera' | 'upload'
  const ref = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) closeAll()
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const destinations = DESTINATIONS.filter((d) => access.hasAny(d.module))
  const canMigrate = access.canManageStaff

  // Nothing to offer this person (no photo destination, not an admin).
  if (destinations.length === 0 && !canMigrate) return null

  function closeAll() {
    setOpen(false)
    setView(VIEW.ROOT)
    setPendingAction(null)
  }

  function goToDestination(path, action) {
    navigate(path, { state: { autoPhoto: action } })
    onNavigate?.()
    closeAll()
  }

  function startPhotoFlow(action) {
    if (destinations.length === 1) {
      goToDestination(destinations[0].path, action)
      return
    }
    setPendingAction(action)
    setView(VIEW.PICK_DESTINATION)
  }

  function handleMigrate() {
    navigate('/migration')
    onNavigate?.()
    closeAll()
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium text-[var(--color-ink-muted)] transition-colors hover:bg-[var(--color-paper)] hover:text-[var(--color-ink)] lg:gap-4 lg:px-4 lg:py-3 lg:text-base"
      >
        <Plus size={18} strokeWidth={2} className="lg:h-5 lg:w-5" />
        Sync Data
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 w-64 max-w-[calc(100vw-3rem)] rounded-md border border-[var(--color-border)] bg-[var(--color-paper-light)] p-1.5 shadow-lg">
          {view === VIEW.ROOT && (
            <>
              {destinations.length > 0 && (
                <>
                  <button type="button" onClick={() => startPhotoFlow('camera')} className={rowClass}>
                    <Camera size={16} strokeWidth={2} />
                    Take a photo
                  </button>
                  <button type="button" onClick={() => startPhotoFlow('upload')} className={rowClass}>
                    <Upload size={16} strokeWidth={2} />
                    Upload photos
                  </button>
                </>
              )}
              {canMigrate && (
                <button type="button" onClick={handleMigrate} className={rowClass}>
                  <ArrowLeftRight size={16} strokeWidth={2} />
                  Migrate data
                </button>
              )}
            </>
          )}

          {view === VIEW.PICK_DESTINATION && (
            <>
              <button
                type="button"
                onClick={() => setView(VIEW.ROOT)}
                className="mb-1 flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-xs font-medium text-[var(--color-ink-muted)] hover:bg-[var(--color-paper)]"
              >
                <ChevronLeft size={14} strokeWidth={2} />
                Back
              </button>
              <p className="px-3 pb-1.5 text-xs text-[var(--color-ink-muted)]">What's this for?</p>
              {destinations.map(({ path, label, icon: Icon }) => (
                <button
                  key={path}
                  type="button"
                  onClick={() => goToDestination(path, pendingAction)}
                  className={rowClass}
                >
                  <Icon size={16} strokeWidth={2} />
                  {label}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}