// PATH: src/features/inventory/InventoryPage.jsx
import { useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { useMaterials } from './hooks/useMaterials.js'
import { useAlerts } from '../../context/useAlerts.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { createMaterial, deleteMaterial, restockMaterial } from '../../lib/api/inventory.js'
import { classifyImage } from '../../lib/api/ocr.js'
import { parseInventoryPhotoBatch } from './lib/parseInventoryPhoto.js'
import MaterialList from './components/MaterialList.jsx'
import MaterialDetail from './components/MaterialDetail.jsx'
import AddMaterialFlow from './components/AddMaterialFlow.jsx'
import RestockEntry from './components/RestockEntry.jsx'
import InventoryPhotoBatchReview from './components/InventoryPhotoBatchReview.jsx'
import PhotoLogButton from '../production/components/PhotoLogButton.jsx'

const VIEWS = { LIST: 'list', DETAIL: 'detail', ADD: 'add', RESTOCK: 'restock', PHOTO_REVIEW: 'photo_review' }

function normalizeName(name) {
  return (name || '').trim().toLowerCase()
}

// Matched material -> a restock entry (adds to existing stock). No match
// -> a new-material entry, same shape AddMaterialFlow collects: name,
// unit, starting stock, cost per unit, reorder threshold, supplier.
function toInventoryReviewItem(parsed) {
  if (parsed.matchedMaterial) {
    return {
      type: 'restock',
      material: parsed.matchedMaterial,
      quantityAdded: parsed.quantity != null ? String(parsed.quantity) : '0',
      cost: parsed.cost != null ? String(parsed.cost) : '',
    }
  }
  return {
    type: 'new',
    name: parsed.candidateName || '',
    unit: parsed.candidateUnit || 'kg',
    startingStock: parsed.quantity != null ? String(parsed.quantity) : '0',
    unitCost: parsed.cost != null ? String(parsed.cost) : '',
    reorderThreshold: parsed.candidateReorderThreshold != null ? String(parsed.candidateReorderThreshold) : '',
    supplierName: parsed.candidateSupplier || '',
  }
}

function toUnrecognizedInventoryItem() {
  return {
    type: 'new',
    unrecognized: true,
    name: '',
    unit: 'kg',
    startingStock: '0',
    unitCost: '',
    reorderThreshold: '',
    supplierName: '',
  }
}

// Same reasoning as production's mergeDuplicatePhotoItems: the same
// material noted on more than one photo (a delivery note split across
// two shots, say) used to become two separate restocks or two duplicate
// "new material" creates. Collapses by material.id (restock) or
// normalized name (new), summing quantities into the first occurrence.
function mergeDuplicateInventoryItems(items) {
  const merged = []
  const keyToIndex = new Map()

  for (const item of items) {
    let key = null
    if (item.type === 'restock') key = `restock:${item.material.id}`
    else if (item.type === 'new' && !item.unrecognized && normalizeName(item.name)) key = `new:${normalizeName(item.name)}`

    if (key && keyToIndex.has(key)) {
      const idx = keyToIndex.get(key)
      const existing = merged[idx]
      if (existing.type === 'restock') {
        const existingQty = parseFloat(existing.quantityAdded) || 0
        const addQty = parseFloat(item.quantityAdded) || 0
        merged[idx] = { ...existing, quantityAdded: String(existingQty + addQty), merged: true }
      } else {
        const existingQty = parseFloat(existing.startingStock) || 0
        const addQty = parseFloat(item.startingStock) || 0
        merged[idx] = { ...existing, startingStock: String(existingQty + addQty), merged: true }
      }
    } else {
      merged.push({ ...item })
      if (key) keyToIndex.set(key, merged.length - 1)
    }
  }

  return merged
}

function isInventoryPhotoItemValid(item) {
  if (item.type === 'restock') {
    return (parseFloat(item.quantityAdded) || 0) > 0
  }
  if (!item.name.trim() || !item.unit.trim()) return false
  const stock = Number(item.startingStock)
  if (item.startingStock === '' || Number.isNaN(stock) || stock < 0) return false
  return true
}

export default function InventoryPage() {
  const [view, setView] = useState(VIEWS.LIST)
  const { materials, loading, error, refetch } = useMaterials()
  const { refetch: refetchAlerts } = useAlerts()
  const { user } = useAuth()
  const currency = user?.currency || '₹'
  const [selectedMaterial, setSelectedMaterial] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  // ---- Photo-based logging (same pattern as production's) ----
  const [photoQueue, setPhotoQueue] = useState([])
  const [processingPhotos, setProcessingPhotos] = useState(false)
  const [photoError, setPhotoError] = useState(null)
  const [photoSubmission, setPhotoSubmission] = useState(null)
  const [photoSubmitting, setPhotoSubmitting] = useState(false)

  function openDetail(material) {
    setSelectedMaterial(material)
    setView(VIEWS.DETAIL)
  }

  function backToList() {
    setSelectedMaterial(null)
    setView(VIEWS.LIST)
  }

  async function addMaterial(payload) {
    await createMaterial(payload)
    await refetch()
    refetchAlerts()
    setView(VIEWS.LIST)
  }

  async function handleDeleteMaterial(materialId, opts) {
    await deleteMaterial(materialId, opts)
    await refetch()
    refetchAlerts()
    backToList()
  }

  async function confirmRestock(entry) {
    setSubmitting(true)
    setActionError(null)
    try {
      const updated = await restockMaterial(entry.materialId, {
        quantity_added: entry.qtyAdded,
        cost: entry.cost,
      })

      if (updated && updated.id) {
        setSelectedMaterial(updated)
      } else {
        await refetch()
        setSelectedMaterial((prev) => prev)
      }
      refetchAlerts()
      setView(VIEWS.DETAIL)
    } catch (err) {
      setActionError(err.message || 'Failed to log restock')
    } finally {
      setSubmitting(false)
    }
  }

  // Same per-photo isolation as production's handlePhotosSelected — one
  // bad photo (network blip, OCR quota) doesn't cost the rest of the batch.
  async function handlePhotosSelected(files) {
    setProcessingPhotos(true)
    setPhotoError(null)
    const items = []
    const failedPhotos = []

    for (const file of files) {
      try {
        const classified = await classifyImage(file, 'inventory')
        if (classified.status === 'match' || classified.status === 'ambiguous') {
          const parsedBlocks = parseInventoryPhotoBatch(classified.text, materials)
          if (parsedBlocks.length === 0) {
            items.push(toUnrecognizedInventoryItem())
          } else {
            items.push(...parsedBlocks.map(toInventoryReviewItem))
          }
        } else {
          items.push(toUnrecognizedInventoryItem())
        }
      } catch (err) {
        failedPhotos.push(file.name || 'a photo')
      }
    }

    setProcessingPhotos(false)

    if (failedPhotos.length > 0) {
      setPhotoError(
        `Couldn't read ${failedPhotos.length} photo${failedPhotos.length > 1 ? 's' : ''} (${failedPhotos.join(', ')}) — the rest were processed normally. Try uploading the failed one${failedPhotos.length > 1 ? 's' : ''} again on their own.`
      )
    }

    if (items.length === 0) return

    setPhotoQueue(mergeDuplicateInventoryItems(items))
    setPhotoSubmission(null)
    setView(VIEWS.PHOTO_REVIEW)
  }

  function updatePhotoItem(index, patch) {
    setPhotoQueue((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  }

  function removePhotoItem(index) {
    const next = photoQueue.filter((_, i) => i !== index)
    setPhotoQueue(next)
    if (next.length === 0) setView(VIEWS.LIST)
  }

  async function confirmPhotoBatch() {
    const initial = photoQueue.map((item) => ({ item, status: 'pending', error: null }))
    setPhotoSubmission(initial)
    await runPhotoSubmission(initial)
  }

  // 'restock' calls restockMaterial once per item — safe on retry because
  // a genuinely-succeeded item is marked 'ok' and skipped
  // (`if (updated[i].status === 'ok') continue`), so it can't be applied
  // twice from this UI. 'new' caches createdMaterialId so a retry after a
  // partial failure doesn't create the material a second time.
  async function runPhotoSubmission(entries) {
    setPhotoSubmitting(true)
    const updated = [...entries]
    for (let i = 0; i < updated.length; i++) {
      if (updated[i].status === 'ok') continue
      const entry = updated[i]
      const item = entry.item
      try {
        if (item.type === 'restock') {
          await restockMaterial(item.material.id, {
            quantity_added: parseFloat(item.quantityAdded) || 0,
            cost: parseFloat(item.cost) || 0,
          })
        } else if (!entry.createdMaterialId) {
          const created = await createMaterial({
            name: item.name.trim(),
            unit: item.unit.trim(),
            current_stock: Number(item.startingStock) || 0,
            unit_cost: item.unitCost !== '' ? Number(item.unitCost) : undefined,
            reorder_threshold: item.reorderThreshold !== '' ? Number(item.reorderThreshold) : 0,
            supplier_name: item.supplierName.trim() || undefined,
          })
          updated[i] = { ...updated[i], createdMaterialId: created.id }
        }
        updated[i] = { ...updated[i], status: 'ok', error: null }
      } catch (err) {
        updated[i] = { ...updated[i], status: 'failed', error: err.message || 'Failed to save' }
      }
      setPhotoSubmission([...updated])
    }
    setPhotoSubmitting(false)
    if (!updated.some((e) => e.status === 'failed')) {
      await finishPhotoBatch()
    }
  }

  async function finishPhotoBatch() {
    await refetch()
    refetchAlerts()
    setPhotoQueue([])
    setPhotoSubmission(null)
    setView(VIEWS.LIST)
  }

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      {actionError && (
        <p className="rounded-xl border border-[var(--color-error)] px-4 py-3 text-sm text-[var(--color-error)]">
          {actionError}
        </p>
      )}
      {photoError && view !== VIEWS.PHOTO_REVIEW && (
        <p className="rounded-xl border border-[var(--color-border)] px-4 py-3 text-sm text-[var(--color-ink-muted)]">
          {photoError}
        </p>
      )}

      {view === VIEWS.LIST && (
        <>
          <h1 className="font-sans text-xl font-bold text-[var(--color-ink)] sm:text-2xl lg:text-3xl xl:text-4xl">
            Inventory
          </h1>
          <PhotoLogButton onPhotosSelected={handlePhotosSelected} processing={processingPhotos} />
          {error && (
            <p className="rounded-xl border border-[var(--color-error)] px-4 py-3 text-sm text-[var(--color-error)]">
              {error}
            </p>
          )}
          {loading ? (
            <p className="text-sm text-[var(--color-ink-muted)]">Loading materials...</p>
          ) : (
            <MaterialList
              materials={materials}
              onSelectMaterial={openDetail}
              onAddMaterial={() => setView(VIEWS.ADD)}
            />
          )}
        </>
      )}

      {view === VIEWS.DETAIL && selectedMaterial && (
        <MaterialDetail
          material={selectedMaterial}
          onBack={backToList}
          onRestock={() => setView(VIEWS.RESTOCK)}
          onDelete={handleDeleteMaterial}
        />
      )}

      {view === VIEWS.ADD && (
        <AddMaterialFlow onBack={() => setView(VIEWS.LIST)} onAdd={addMaterial} />
      )}

      {view === VIEWS.RESTOCK && selectedMaterial && (
        <RestockEntry
          material={selectedMaterial}
          onBack={() => setView(VIEWS.DETAIL)}
          onConfirm={confirmRestock}
          submitting={submitting}
        />
      )}

      {view === VIEWS.PHOTO_REVIEW && (
        photoSubmission ? (
          <div className="flex flex-col gap-6 lg:gap-8">
            <div className="flex flex-col gap-2 lg:gap-3">
              {photoSubmission.map((entry, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] px-4 py-3 lg:px-6 lg:py-4"
                >
                  <span className="truncate text-sm text-[var(--color-ink)] lg:text-base">
                    {entry.item.type === 'restock' ? entry.item.material.name : entry.item.name || 'New material'}
                  </span>
                  {entry.status === 'pending' && (
                    <Loader2 size={16} strokeWidth={2} className="animate-spin text-[var(--color-ink-muted)]" />
                  )}
                  {entry.status === 'ok' && (
                    <span className="flex items-center gap-1 text-sm font-medium text-[var(--color-success)]">
                      <Check size={16} strokeWidth={2} /> Saved
                    </span>
                  )}
                  {entry.status === 'failed' && (
                    <span className="text-xs font-medium text-[var(--color-error)]">{entry.error}</span>
                  )}
                </div>
              ))}
            </div>

            {!photoSubmitting && photoSubmission.some((e) => e.status === 'failed') && (
              <>
                <p className="text-sm text-[var(--color-error)] lg:text-base">
                  {photoSubmission.filter((e) => e.status === 'ok').length} of {photoSubmission.length} saved. The
                  rest failed — retry now, or go back and re-enter the failed one(s) from scratch.
                </p>
                <button
                  type="button"
                  onClick={() => runPhotoSubmission(photoSubmission)}
                  className="rounded-xl bg-[var(--color-stamp)] py-4 font-sans text-base font-semibold text-[var(--color-paper-light)] lg:py-5 lg:text-lg"
                >
                  Retry failed
                </button>
                <button
                  type="button"
                  onClick={finishPhotoBatch}
                  className="rounded-xl border border-[var(--color-border)] py-4 font-sans text-base font-semibold text-[var(--color-ink)] lg:py-5 lg:text-lg"
                >
                  Done, back to list
                </button>
              </>
            )}
          </div>
        ) : (
          <InventoryPhotoBatchReview
            items={photoQueue}
            currency={currency}
            onUpdateItem={updatePhotoItem}
            onRemoveItem={removePhotoItem}
            onConfirm={confirmPhotoBatch}
            canConfirm={photoQueue.length > 0 && photoQueue.every(isInventoryPhotoItemValid)}
            submitting={photoSubmitting}
          />
        )
      )}
    </div>
  )
}