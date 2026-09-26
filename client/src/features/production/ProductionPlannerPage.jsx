import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Trash2, Check, Loader2 } from 'lucide-react'
import { useProducts } from './hooks/useProducts.js'
import { useMaterials } from '../inventory/hooks/useMaterials.js'
import { createProduct, deleteProduct, logProduction } from '../../lib/api/production.js'
import { createMaterial, deleteMaterial } from '../../lib/api/inventory.js'
import { classifyImage } from '../../lib/api/ocr.js'
import { parseProductionPhotoBatch } from './lib/parseProductionPhoto.js'
import { useAuth } from '../../context/AuthContext.jsx'
import ProductPicker from './components/ProductPicker.jsx'
import AddProductFlow from './components/AddProductFlow.jsx'
import QuantityStepper from './components/QuantityStepper.jsx'
import ConfirmProduction from './components/ConfirmProduction.jsx'
import ProductionDone from './components/ProductionDone.jsx'
import PhotoBatchReview from './components/PhotoBatchReview.jsx'
import { useAlerts } from '../../context/useAlerts.js'

const STEPS = { PICK: 1, ADD_PRODUCT: 2, QUANTITY: 3, CONFIRM: 4, DONE: 5, PHOTO_REVIEW: 6 }

// Normalizes one parseProductionPhotoBatch() entry into an editable
// review-item shape. 'matched' items only carry a quantity — everything
// else (recipe, price) already exists on the real product. 'new' items
// carry the full set of fields AddProductFlow used to collect on a
// separate screen, plus unmatchedIngredients.
//
// unmatchedIngredients, per ingredient — no "decision" field anymore.
// There are only two real states, and both are automatic:
//   - linkedMaterialId is set: the parser matched this ingredient's name
//     to a real material already in inventory, just couldn't find an
//     amount. Nothing to create — this always links to that material,
//     the person only has to supply the amount used.
//   - linkedMaterialId is empty: no match at all. This is a genuinely
//     new material — the create-fields (name/unit/cost/starting stock)
//     always show, no option to "skip creating it" other than removing
//     the ingredient entirely (see onRemoveUnmatchedIngredient below).
function toReviewItem(parsed) {
  const quantity = parsed.quantity != null ? String(parsed.quantity) : '0'
  if (parsed.matchedProduct) {
    return { type: 'matched', product: parsed.matchedProduct, quantity }
  }
  return {
    type: 'new',
    name: parsed.candidateName || '',
    quantity,
    category: '',
    unit: 'piece',
    sellingPrice: parsed.candidatePrice != null ? String(parsed.candidatePrice) : '',
    recipeRows:
      parsed.candidateRecipeRows?.length > 0
        ? [...parsed.candidateRecipeRows, { materialId: '', qtyPerUnit: '' }]
        : [{ materialId: '', qtyPerUnit: '' }],
    unmatchedIngredients: (parsed.unmatchedIngredients || []).map((ing) => ({
      candidateName: ing.candidateName,
      totalAmount: ing.totalAmount, // number, or null if the photo didn't have one
      detectedUnit: ing.detectedUnit,
      amountMissing: !!ing.amountMissing,
      linkedMaterialId: ing.matchedMaterialId || '', // non-empty = auto-linked, no create-fields needed
      newMaterialUnit: ing.detectedUnit || '',
      newMaterialUnitCost: '',
      newMaterialStartingStock: '',
    })),
  }
}

// A photo the OCR classifier didn't recognize as a production log at all
// (status !== 'match'/'ambiguous') used to be silently counted and
// dropped. It now becomes a blank 'new'-shaped card instead — same shape
// AddProductFlow used to collect, just with nothing pre-filled, since we
// have no trustworthy text to guess from. `unrecognized: true` only
// changes which banner PhotoBatchReview shows; every field and the
// remove action behave identically to any other 'new' item.
function toUnrecognizedItem() {
  return {
    type: 'new',
    unrecognized: true,
    name: '',
    quantity: '0',
    category: '',
    unit: 'piece',
    sellingPrice: '',
    recipeRows: [{ materialId: '', qtyPerUnit: '' }],
    unmatchedIngredients: [],
  }
}

function normalizeName(name) {
  return (name || '').trim().toLowerCase()
}

// Collapses items that describe the SAME product into one before the
// person ever sees the review carousel. Two cases:
//   - 'matched' items sharing the same real product.id
//   - 'new' items sharing the same (trimmed, case-insensitive) name
// Quantities are summed into the first occurrence; everything else is
// kept from that first occurrence. `merged: true` just flags the banner
// PhotoBatchReview shows. Blank-name 'unrecognized' cards never merge
// with each other — they're not the same product, just unidentified.
function mergeDuplicatePhotoItems(items) {
  const merged = []
  const keyToIndex = new Map()

  for (const item of items) {
    let key = null
    if (item.type === 'matched') {
      key = `matched:${item.product.id}`
    } else if (item.type === 'new' && !item.unrecognized && normalizeName(item.name)) {
      key = `new:${normalizeName(item.name)}`
    }

    if (key && keyToIndex.has(key)) {
      const idx = keyToIndex.get(key)
      const existing = merged[idx]
      const existingQty = parseFloat(existing.quantity) || 0
      const addQty = parseFloat(item.quantity) || 0
      merged[idx] = { ...existing, quantity: String(existingQty + addQty), merged: true }
    } else {
      merged.push({ ...item })
      if (key) keyToIndex.set(key, merged.length - 1)
    }
  }

  return merged
}

function isPhotoItemValid(item) {
  const qty = parseFloat(item.quantity) || 0
  if (qty <= 0) return false
  if (item.type === 'new') {
    if (!item.name.trim()) return false
    const price = Number(item.sellingPrice)
    if (item.sellingPrice === '' || Number.isNaN(price) || price < 0) return false
    for (const ing of item.unmatchedIngredients || []) {
      const amount = Number(ing.totalAmount)
      if (!amount || amount <= 0) return false
      if (!ing.linkedMaterialId) {
        // Genuinely new — needs the full create-fields.
        if (!ing.candidateName.trim() || !ing.newMaterialUnit.trim()) return false
        const startingStock = Number(ing.newMaterialStartingStock)
        // Must cover at least what this batch is about to consume, or
        // the backend's recordProduction rejects the whole batch item
        // with "Insufficient stock" the instant it's submitted.
        if (ing.newMaterialStartingStock === '' || Number.isNaN(startingStock) || startingStock < amount) return false
      }
      // linkedMaterialId set: nothing else required, it's a real
      // existing material — only the amount above matters.
    }
  }
  return true
}

export default function ProductionPlannerPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(STEPS.PICK)
  const { user } = useAuth()
  const currency = user?.currency || '₹'
  const { refetch: refetchAlerts } = useAlerts()
  const { products, loading: productsLoading, error: productsError, refetch: refetchProducts } = useProducts()
  const { materials, refetch: refetchMaterials } = useMaterials()

  const [selectedProduct, setSelectedProduct] = useState(null)
  const [quantity, setQuantity] = useState('0')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [lastQuantities, setLastQuantities] = useState({})

  const [photoQueue, setPhotoQueue] = useState([])
  const [processingPhotos, setProcessingPhotos] = useState(false)
  const [photoError, setPhotoError] = useState(null)
  const [photoSubmission, setPhotoSubmission] = useState(null)
  const [photoSubmitting, setPhotoSubmitting] = useState(false)
  const [editingFailedIndex, setEditingFailedIndex] = useState(null)

  function selectProduct(product, prefillQuantity) {
    setSelectedProduct(product)
    setQuantity(prefillQuantity ?? lastQuantities[product.id] ?? '0')
    setConfirmingDelete(false)
    setStep(STEPS.QUANTITY)
  }

  async function addNewProduct(payload) {
    setSubmitError(null)
    try {
      const created = await createProduct(payload)
      await refetchProducts()
      selectProduct(created)
    } catch (err) {
      setSubmitError(err.message || 'Failed to create product')
    }
  }

  async function handleDeleteProduct() {
    if (!confirmingDelete) { setConfirmingDelete(true); return }
    setDeleting(true)
    setSubmitError(null)
    try {
      await deleteProduct(selectedProduct.id)
      await refetchProducts()
      setSelectedProduct(null)
      setConfirmingDelete(false)
      setStep(STEPS.PICK)
    } catch (err) {
      setSubmitError(err.message || 'Failed to delete product')
    } finally {
      setDeleting(false)
    }
  }

  function goBack() {
    if (step === STEPS.QUANTITY) { setConfirmingDelete(false); setStep(STEPS.PICK) }
    else if (step === STEPS.CONFIRM) setStep(STEPS.QUANTITY)
    else if (step === STEPS.ADD_PRODUCT) setStep(STEPS.PICK)
    else if (step === STEPS.PHOTO_REVIEW) {
      if (photoSubmission) { setPhotoSubmission(null); return }
      setPhotoQueue([])
      setStep(STEPS.PICK)
    }
  }

  const qtyNum = parseFloat(quantity) || 0
  const consumption = selectedProduct?.recipe
    ? selectedProduct.recipe.map((r) => {
        const material = materials.find((m) => m.id === r.materialId)
        return { ...material, consumed: r.qtyPerUnit * qtyNum }
      })
    : []

  async function handlePhotosSelected(files) {
    setProcessingPhotos(true)
    setPhotoError(null)
    const items = []
    const failedPhotos = []

    for (const file of files) {
      try {
        const classified = await classifyImage(file, 'production')
        if (classified.status === 'match' || classified.status === 'ambiguous') {
          const parsedBlocks = parseProductionPhotoBatch(classified.text, products, materials)
          if (parsedBlocks.length === 0) {
            items.push(toUnrecognizedItem())
          } else {
            items.push(...parsedBlocks.map(toReviewItem))
          }
        } else {
          items.push(toUnrecognizedItem())
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

    const deduped = mergeDuplicatePhotoItems(items)
    setPhotoQueue(deduped)
    setPhotoSubmission(null)
    setStep(STEPS.PHOTO_REVIEW)
  }

  function updatePhotoItem(index, patch) {
    setPhotoQueue((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  }

  function updatePhotoRecipeRow(index, rowIndex, field, value) {
    setPhotoQueue((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item
        return { ...item, recipeRows: item.recipeRows.map((r, ri) => (ri === rowIndex ? { ...r, [field]: value } : r)) }
      })
    )
  }

  function addPhotoRecipeRow(index) {
    setPhotoQueue((prev) =>
      prev.map((item, i) => (i === index ? { ...item, recipeRows: [...item.recipeRows, { materialId: '', qtyPerUnit: '' }] } : item))
    )
  }

  function removePhotoRecipeRow(index, rowIndex) {
    setPhotoQueue((prev) =>
      prev.map((item, i) => (i === index ? { ...item, recipeRows: item.recipeRows.filter((_, ri) => ri !== rowIndex) } : item))
    )
  }

  function updatePhotoUnmatchedIngredient(index, uIndex, patch) {
    setPhotoQueue((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item
        return {
          ...item,
          unmatchedIngredients: item.unmatchedIngredients.map((ing, ui) => (ui === uIndex ? { ...ing, ...patch } : ing)),
        }
      })
    )
  }

  // Replaces the old "skip" decision — fully removes one ingredient
  // line from the batch instead of just marking it to be left out.
  function removePhotoUnmatchedIngredient(index, uIndex) {
    setPhotoQueue((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item
        return { ...item, unmatchedIngredients: item.unmatchedIngredients.filter((_, ui) => ui !== uIndex) }
      })
    )
  }

  function removePhotoItem(index) {
    const next = photoQueue.filter((_, i) => i !== index)
    setPhotoQueue(next)
    if (next.length === 0) setStep(STEPS.PICK)
  }

  async function confirmPhotoBatch() {
    const initial = photoQueue.map((item) => ({ item, status: 'pending', error: null }))
    setPhotoSubmission(initial)
    await runPhotoSubmission(initial)
  }

  async function runPhotoSubmission(entries) {
    setPhotoSubmitting(true)
    const updated = [...entries]
    for (let i = 0; i < updated.length; i++) {
      if (updated[i].status === 'ok') continue
      const entry = updated[i]
      const item = entry.item
      try {
        let productId
        if (item.type === 'matched') {
          productId = item.product.id
        } else if (entry.createdProductId) {
          productId = entry.createdProductId
        } else {
          const createdMaterialIds = { ...(entry.createdMaterialIds || {}) }
          const unmatched = item.unmatchedIngredients || []
          for (let ui = 0; ui < unmatched.length; ui++) {
            const ing = unmatched[ui]
            if (ing.linkedMaterialId || createdMaterialIds[ui]) continue // already a real material, or already created
            const createdMaterial = await createMaterial({
              name: ing.candidateName.trim(),
              unit: ing.newMaterialUnit.trim(),
              unit_cost: ing.newMaterialUnitCost !== '' ? Number(ing.newMaterialUnitCost) : undefined,
              // Stock BEFORE this batch's usage — recordProduction always
              // deducts the recipe's requiredQty from current_stock, so
              // this has to already account for what's about to be
              // consumed. isPhotoItemValid enforces startingStock >=
              // amount used, so this shouldn't hit "Insufficient stock."
              current_stock: Number(ing.newMaterialStartingStock) || 0,
            })
            createdMaterialIds[ui] = createdMaterial.id
            updated[i] = { ...updated[i], createdMaterialIds }
            setPhotoSubmission([...updated])
          }

          const qtyProducedForRatio = parseFloat(item.quantity) || 1
          const unmatchedRecipeRows = unmatched
            .map((ing, ui) => {
              const amount = Number(ing.totalAmount)
              if (!amount || amount <= 0) return null
              const materialId = ing.linkedMaterialId || createdMaterialIds[ui]
              if (!materialId) return null
              return { material_id: materialId, quantity_per_unit: amount / qtyProducedForRatio }
            })
            .filter(Boolean)

          const recipe = [
            ...item.recipeRows
              .filter((r) => r.materialId && r.qtyPerUnit !== '')
              .map((r) => ({ material_id: r.materialId, quantity_per_unit: Number(r.qtyPerUnit) })),
            ...unmatchedRecipeRows,
          ]

          const created = await createProduct({
            name: item.name.trim(),
            category: item.category.trim() || undefined,
            unit: item.unit,
            selling_price: Number(item.sellingPrice),
            recipe: recipe.length > 0 ? recipe : undefined,
          })
          productId = created.id
          updated[i] = { ...updated[i], createdProductId: productId }
          setPhotoSubmission([...updated])
        }
        await logProduction({ productId, quantityProduced: parseFloat(item.quantity) || 0 })
        updated[i] = { ...updated[i], status: 'ok', error: null }
      } catch (err) {
        updated[i] = { ...updated[i], status: 'failed', error: err.message || 'Failed to log' }
      }
      setPhotoSubmission([...updated])
    }
    setPhotoSubmitting(false)
    if (!updated.some((e) => e.status === 'failed')) {
      await finishPhotoBatch()
    }
  }

  function updateFailedItemField(index, patch) {
    setPhotoSubmission((prev) => prev.map((e, i) => (i === index ? { ...e, item: { ...e.item, ...patch } } : e)))
  }

  function saveFailedItemEdit(index) {
    setPhotoSubmission((prev) => prev.map((e, i) => (i === index ? { ...e, status: 'pending', error: null } : e)))
    setEditingFailedIndex(null)
  }

  async function declineFailedItem(index) {
    const entry = photoSubmission[index]
    if (!entry) return
    setEditingFailedIndex(null)
    setPhotoSubmitting(true)
    const cleanupErrors = []

    if (entry.createdProductId) {
      try {
        await deleteProduct(entry.createdProductId)
      } catch (err) {
        cleanupErrors.push(`the product it created (${err.message || 'delete failed'})`)
      }
    }
    for (const materialId of Object.values(entry.createdMaterialIds || {})) {
      try {
        await deleteMaterial(materialId)
      } catch (err) {
        cleanupErrors.push(`a material it created (${err.message || 'delete failed'})`)
      }
    }
    setPhotoSubmitting(false)

    if (cleanupErrors.length > 0) {
      setSubmitError(`Declined, but couldn't remove ${cleanupErrors.join(' and ')} — you may need to delete it manually.`)
    }

    const remaining = photoSubmission.filter((_, i) => i !== index)
    setPhotoSubmission(remaining)
    if (remaining.length === 0 || !remaining.some((e) => e.status === 'failed')) {
      await finishPhotoBatch()
    }
  }

  async function finishPhotoBatch() {
    await refetchProducts()
    await refetchMaterials()
    refetchAlerts()
    setPhotoQueue([])
    setPhotoSubmission(null)
    setEditingFailedIndex(null)
    setStep(STEPS.DONE)
  }

  async function confirmProduction() {
    setSubmitting(true)
    setSubmitError(null)
    try {
      await logProduction({ productId: selectedProduct.id, quantityProduced: qtyNum })
      refetchAlerts()
      setLastQuantities((prev) => ({ ...prev, [selectedProduct.id]: quantity }))
      setStep(STEPS.DONE)
    } catch (err) {
      setSubmitError(err.message || 'Failed to log production')
    } finally {
      setSubmitting(false)
    }
  }

  function undoLast() { setStep(STEPS.PICK); setSelectedProduct(null); setQuantity('0') }
  function logAnother() { setSelectedProduct(null); setQuantity('0'); setStep(STEPS.PICK) }
  function finishAndGoHome() { navigate('/') }

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <div className="flex items-center gap-3">
        {step !== STEPS.PICK && step !== STEPS.DONE && (
          <button type="button" onClick={goBack} aria-label="Back">
            <ArrowLeft size={20} strokeWidth={2} className="text-[var(--color-ink-muted)] lg:h-6 lg:w-6" />
          </button>
        )}
        <h1 className="font-sans text-xl font-bold text-[var(--color-ink)] lg:text-3xl xl:text-4xl">Log Production</h1>
      </div>

      {productsError && <p className="rounded-xl border border-[var(--color-error)] px-4 py-3 text-sm text-[var(--color-error)]">{productsError}</p>}
      {submitError && <p className="rounded-xl border border-[var(--color-error)] px-4 py-3 text-sm text-[var(--color-error)]">{submitError}</p>}
      {photoError && <p className="rounded-xl border border-[var(--color-border)] px-4 py-3 text-sm text-[var(--color-ink-muted)]">{photoError}</p>}

      {step === STEPS.PICK && (
        productsLoading ? (
          <p className="text-sm text-[var(--color-ink-muted)]">Loading products…</p>
        ) : (
          <ProductPicker
            products={products}
            onSelect={selectProduct}
            onAddProduct={() => setStep(STEPS.ADD_PRODUCT)}
            onRetry={refetchProducts}
            onPhotosSelected={handlePhotosSelected}
            processingPhotos={processingPhotos}
          />
        )
      )}

      {step === STEPS.ADD_PRODUCT && (
        <AddProductFlow onBack={() => setStep(STEPS.PICK)} onAdd={addNewProduct} />
      )}

      {step === STEPS.QUANTITY && selectedProduct && (
        <div className="flex flex-col gap-6 lg:gap-8">
          <div className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] px-4 py-3 lg:px-6 lg:py-4">
            <span className="font-sans text-base font-semibold text-[var(--color-ink)] lg:text-lg">{selectedProduct.name}</span>
            <button type="button" onClick={handleDeleteProduct} disabled={deleting}
              className={`flex items-center gap-1.5 text-xs font-medium lg:text-sm ${confirmingDelete ? 'text-[var(--color-error)]' : 'text-[var(--color-ink-muted)] hover:text-[var(--color-error)]'}`}>
              <Trash2 size={14} strokeWidth={2} className="lg:h-4 lg:w-4" />
              {deleting ? 'Removing…' : confirmingDelete ? 'Tap again to remove' : 'Remove product'}
            </button>
          </div>
          <div className="flex flex-col items-center gap-2 py-4 lg:py-6">
            <QuantityStepper value={quantity} onChange={setQuantity} />
            <span className="text-sm text-[var(--color-ink-muted)] lg:text-base">units</span>
          </div>
          <button type="button" disabled={qtyNum <= 0} onClick={() => setStep(STEPS.CONFIRM)}
            className="rounded-xl bg-[var(--color-stamp)] py-4 font-sans text-base font-semibold text-[var(--color-paper-light)] disabled:opacity-40 lg:py-5 lg:text-lg">
            Next
          </button>
        </div>
      )}

      {step === STEPS.CONFIRM && selectedProduct && (
        <ConfirmProduction product={selectedProduct} quantity={qtyNum} consumption={consumption} onConfirm={confirmProduction} submitting={submitting} />
      )}

      {step === STEPS.PHOTO_REVIEW && (
        photoSubmission ? (
          <div className="flex flex-col gap-6 lg:gap-8">
            <div className="flex flex-col gap-2 lg:gap-3">
              {photoSubmission.map((entry, i) => {
                const locked = entry.item.type === 'matched' || !!entry.createdProductId
                return (
                  <div
                    key={i}
                    className="flex flex-col gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] px-4 py-3 lg:px-6 lg:py-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate text-sm text-[var(--color-ink)] lg:text-base">
                        {entry.item.type === 'matched' ? entry.item.product.name : entry.item.name || 'New product'} ×{entry.item.quantity}
                      </span>
                      {entry.status === 'pending' && (
                        <Loader2 size={16} strokeWidth={2} className="animate-spin text-[var(--color-ink-muted)]" />
                      )}
                      {entry.status === 'ok' && (
                        <span className="flex items-center gap-1 text-sm font-medium text-[var(--color-success)]">
                          <Check size={16} strokeWidth={2} /> Logged
                        </span>
                      )}
                      {entry.status === 'failed' && !photoSubmitting && (
                        <div className="flex flex-shrink-0 items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setEditingFailedIndex(editingFailedIndex === i ? null : i)}
                            className="text-xs font-medium text-[var(--color-stamp)] underline"
                          >
                            {editingFailedIndex === i ? 'Cancel' : 'Edit'}
                          </button>
                          <button
                            type="button"
                            onClick={() => declineFailedItem(i)}
                            className="text-xs font-medium text-[var(--color-ink-muted)] underline hover:text-[var(--color-error)]"
                          >
                            Decline
                          </button>
                        </div>
                      )}
                    </div>

                    {entry.status === 'failed' && (
                      <p className="text-xs font-medium text-[var(--color-error)]">{entry.error}</p>
                    )}

                    {entry.status === 'failed' && editingFailedIndex === i && (
                      <div className="mt-1 flex flex-col gap-3 rounded-xl border border-dashed border-[var(--color-border)] p-4">
                        {locked && (
                          <p className="text-xs text-[var(--color-ink-muted)]">
                            {entry.item.type === 'matched'
                              ? 'Only the quantity can change here.'
                              : 'This product was already created — only the quantity being logged can still change.'}
                          </p>
                        )}

                        <label className="flex flex-col gap-1">
                          <span className="text-xs font-medium text-[var(--color-ink-muted)]">Quantity produced</span>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={entry.item.quantity}
                            onChange={(e) => {
                              const next = e.target.value
                              if (next === '' || /^\d*\.?\d*$/.test(next)) updateFailedItemField(i, { quantity: next })
                            }}
                            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] px-3 py-2 text-sm text-[var(--color-ink)] focus:border-[var(--color-stamp)] focus:outline-none"
                          />
                        </label>

                        {!locked && entry.item.type === 'new' && (
                          <>
                            <label className="flex flex-col gap-1">
                              <span className="text-xs font-medium text-[var(--color-ink-muted)]">Product name</span>
                              <input
                                type="text"
                                value={entry.item.name}
                                onChange={(e) => updateFailedItemField(i, { name: e.target.value })}
                                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] px-3 py-2 text-sm text-[var(--color-ink)] focus:border-[var(--color-stamp)] focus:outline-none"
                              />
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                              <label className="flex flex-col gap-1">
                                <span className="text-xs font-medium text-[var(--color-ink-muted)]">Price ({currency})</span>
                                <input
                                  type="number"
                                  inputMode="decimal"
                                  min="0"
                                  step="0.01"
                                  value={entry.item.sellingPrice}
                                  onChange={(e) => updateFailedItemField(i, { sellingPrice: e.target.value })}
                                  className="rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] px-3 py-2 text-sm text-[var(--color-ink)] focus:border-[var(--color-stamp)] focus:outline-none"
                                />
                              </label>
                              <label className="flex flex-col gap-1">
                                <span className="text-xs font-medium text-[var(--color-ink-muted)]">Unit</span>
                                <input
                                  type="text"
                                  value={entry.item.unit}
                                  onChange={(e) => updateFailedItemField(i, { unit: e.target.value })}
                                  className="rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] px-3 py-2 text-sm text-[var(--color-ink)] focus:border-[var(--color-stamp)] focus:outline-none"
                                />
                              </label>
                            </div>
                            <p className="text-xs text-[var(--color-ink-muted)]">
                              Ingredient matching isn't editable here — decline and re-log this one if the recipe needs changes.
                            </p>
                          </>
                        )}

                        <button
                          type="button"
                          onClick={() => saveFailedItemEdit(i)}
                          className="rounded-xl bg-[var(--color-stamp)] py-2.5 text-sm font-semibold text-[var(--color-paper-light)]"
                        >
                          Save changes
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {!photoSubmitting && photoSubmission.some((e) => e.status === 'failed') && (
              <>
                <p className="text-sm text-[var(--color-error)] lg:text-base">
                  {photoSubmission.filter((e) => e.status === 'ok').length} of {photoSubmission.length} logged. The
                  rest failed — edit and retry, decline to discard (and roll back anything already created for it),
                  or leave as-is. Items already marked "Logged" won't be repeated on retry.
                </p>
                <button
                  type="button"
                  onClick={() => { setEditingFailedIndex(null); runPhotoSubmission(photoSubmission) }}
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
          <PhotoBatchReview
            items={photoQueue}
            materials={materials}
            currency={currency}
            onUpdateItem={updatePhotoItem}
            onUpdateRecipeRow={updatePhotoRecipeRow}
            onAddRecipeRow={addPhotoRecipeRow}
            onRemoveRecipeRow={removePhotoRecipeRow}
            onUpdateUnmatchedIngredient={updatePhotoUnmatchedIngredient}
            onRemoveUnmatchedIngredient={removePhotoUnmatchedIngredient}
            onRemoveItem={removePhotoItem}
            onConfirm={confirmPhotoBatch}
            canConfirm={photoQueue.length > 0 && photoQueue.every(isPhotoItemValid)}
            submitting={photoSubmitting}
          />
        )
      )}

      {step === STEPS.DONE && <ProductionDone onUndo={undoLast} onDone={finishAndGoHome} onLogAnother={logAnother} />}
    </div>
  )
}