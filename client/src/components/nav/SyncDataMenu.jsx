// PATH: src/components/nav/SyncDataMenu.jsx
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Camera, Upload, ArrowLeftRight } from 'lucide-react'

// Shared by Sidebar (desktop) and MobileDrawer (mobile), same pattern as
// AccountMenuTrigger — one component, no drift between the two surfaces.
//
// "Migrate data" is real — routes to the existing /migration flow, which
// now has no standalone nav entry of its own (see navLinks.js — the
// /migration link was removed there; this menu is its only entry point).
// Labeled to match MigrationPage.jsx's own heading ("Move your factory
// data into DANN" / "GUIDED DATA MIGRATION") rather than a new term like
// "import" or "bulk import" — reusing the product's existing vocabulary
// instead of adding a third synonym for the same feature.
//
// "Take a photo" / "Upload photos" are STUBS: Production and Inventory
// already have real capture/upload handlers on their own pages, but that
// logic hasn't been extracted into a shared hook yet. Marked PREVIEW
// rather than silently wired to nothing — clicking shows an honest
// "coming soon" notice instead of pretending to work.
// TODO: extract the capture handler from ProductionPlannerPage.jsx /
// InventoryPage.jsx into a shared hook (e.g. usePhotoCapture) so this
// menu can call the real thing instead of stubbing it.
export default function SyncDataMenu({ onNavigate }) {
  const [open, setOpen] = useState(false)
  const [previewNotice, setPreviewNotice] = useState(null)
  const ref = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleMigrate() {
    setOpen(false)
    navigate('/migration')
    onNavigate?.()
  }

  // PREVIEW: replace with real capture wiring — see TODO above.
  function handlePreviewOnly(label) {
    setOpen(false)
    setPreviewNotice(`${label} from here is coming soon — for now, use it from Production or Inventory directly.`)
    setTimeout(() => setPreviewNotice(null), 3500)
  }

  return (
    <div ref={ref} className="relative mb-2 border-t border-[var(--color-border)] pt-2 lg:pt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium text-[var(--color-ink-muted)] hover:bg-[var(--color-paper)] hover:text-[var(--color-ink)] lg:px-4 lg:py-2.5 lg:text-base"
      >
        <Plus size={18} strokeWidth={2} className="lg:h-5 lg:w-5" />
        Sync Data
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-1 w-60 rounded-md border border-[var(--color-border)] bg-[var(--color-paper-light)] p-1.5 shadow-lg">
          <button
            type="button"
            onClick={() => handlePreviewOnly('Camera capture')}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm text-[var(--color-ink-muted)] hover:bg-[var(--color-paper)] hover:text-[var(--color-ink)]"
          >
            <Camera size={16} strokeWidth={2} />
            Take a photo
          </button>
          <button
            type="button"
            onClick={() => handlePreviewOnly('Photo upload')}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm text-[var(--color-ink-muted)] hover:bg-[var(--color-paper)] hover:text-[var(--color-ink)]"
          >
            <Upload size={16} strokeWidth={2} />
            Upload photos
          </button>
          <button
            type="button"
            onClick={handleMigrate}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm text-[var(--color-ink-muted)] hover:bg-[var(--color-paper)] hover:text-[var(--color-ink)]"
          >
            <ArrowLeftRight size={16} strokeWidth={2} />
            Migrate data
          </button>
        </div>
      )}

      {previewNotice && (
        <p className="absolute bottom-full left-0 mb-1 w-60 rounded-md border border-[var(--color-border)] bg-[var(--color-paper-light)] px-3 py-2 text-xs text-[var(--color-ink-muted)] shadow-lg">
          {previewNotice}
        </p>
      )}
    </div>
  )
}