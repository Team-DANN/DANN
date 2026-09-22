import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Trash2, Check, Loader2 } from 'lucide-react'
import { useProducts } from './hooks/useProducts.js'
import { useMaterials } from '../inventory/hooks/useMaterials.js'
import { createProduct, deleteProduct, logProduction } from '../../lib/api/production.js'
import { createMaterial } from '../../lib/api/inventory.js'
import { classifyImage } from '../../lib/api/ocr.js'
import { parseProductionPhoto } from './lib/parseProductionPhoto.js'
import { useAuth } from '../../context/AuthContext.jsx'
import ProductPicker from './components/ProductPicker.jsx'
import AddProductFlow from './components/AddProductFlow.jsx'
import QuantityStepper from './components/QuantityStepper.jsx'
import ConfirmProduction from './components/ConfirmProduction.jsx'
import ProductionDone from './components/ProductionDone.jsx'
import PhotoBatchReview from './components/PhotoBatchReview.jsx'
import { useAlerts } from '../../context/useAlerts.js'

const STEPS = { PICK: 1, ADD_PRODUCT: 2, QUANTITY: 3, CONFIRM: 4, DONE: 5, PHOTO_REVIEW: 6 }

// Normalizes one parseProductionPhoto() result into an editable review-item
// shape. 'matched' items only carry a quantity — everything else (recipe,
// price) already exists on the real product. 'new' items carry the full
// set of fields AddProductFlow used to collect on a separate screen, plus
// unmatchedIngredients — ingredient lines the photo mentioned that don't
// match anything in inventory yet, each with a per-ingredient decision
// the person makes in PhotoBatchReview (skip / link to existing / add as
// new material).
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
      totalAmount: ing.totalAmount,
      detectedUnit: ing.detectedUnit,
      qtyPerUnit: ing.qtyPerUnit,
      decision: 'skip', // 'skip' | 'link' | 'create' — skip preserves the old silent-drop behavior as the default
      linkedMaterialId: '',
      newMaterialUnit: ing.detectedUnit || '',
      newMaterialUnitCost: '',
    })),
  }
}

function isPhotoItemValid(item) {
  const qty = parseFloat(item.quantity) || 0
  if (qty <= 0) return false
  if (item.type === 'new') {
    if (!item.name.trim()) return false
    const price = Number(item.sellingPrice)
    if (item.sellingPrice === '' || Number.isNaN(price) || price < 0) return false
    for (const ing of item.unmatchedIngredients || []) {
      if (ing.decision === 'link' && !ing.linkedMaterialId) return false
      if (ing.decision === 'create' && (!ing.candidateName.trim() || !ing.newMaterialUnit.trim())) return false
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

  // ---- Photo-based logging: every parsed photo becomes one editable
  // "review item" in photoQueue, all shown together in PhotoBatchReview
  // (a swipeable carousel) rather than stepped through one at a time.
  // photoSubmission is null while still reviewing/editing; once the user
  // hits confirm it becomes an array of
  // { item, status, error, createdProductId, createdMaterialIds } that
  // the page renders as a live progress + result summary.
  const [photoQueue, setPhotoQueue] = useState([])
  const [processingPhotos, setProcessingPhotos] = useState(false)
  const [photoError, setPhotoError] = useState(null)
  const [photoSubmission, setPhotoSubmission] = useState(null)
  const [photoSubmitting, setPhotoSubmitting] = useState(false)

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
    try {
      const results = []
      let skipped = 0
      for (const file of files) {
        const classified = await classifyImage(file, 'production')
        if (classified.status === 'match' || classified.status === 'ambiguous') {
          results.push(parseProductionPhoto(classified.text, products, materials))
        } else {
          skipped += 1
        }
      }
      if (skipped > 0) {
        setPhotoError(`${skipped} photo(s) didn't look like a production log and were skipped — log those manually if needed.`)
      }
      if (results.length === 0) return
      setPhotoQueue(results.map(toReviewItem))
      setPhotoSubmission(null)
      setStep(STEPS.PHOTO_REVIEW)
    } catch (err) {
      setPhotoError(err.message || 'Failed to read photos')
    } finally {
      setProcessingPhotos(false)
    }
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

  async function confirmPhotoBatch() {
    const initial = photoQueue.map((item) => ({ item, status: 'pending', error: null }))
    setPhotoSubmission(initial)
    await runPhotoSubmission(initial)
  }

  // Submits every item that isn't already 'ok', in order, without stopping
  // on a failure — mirrors the same pattern used for multi-product order
  // dispatch. IMPORTANT: neither product_id nor material_id has a
  // uniqueness constraint on name server-side (both are fresh timestamps
  // per call), so a second createProduct()/createMaterial() call for the
  // same item on retry would NOT throw — it would silently create a
  // duplicate. To keep retry idempotent: once a product is created we
  // stash its id in createdProductId; once a "new material" ingredient
  // decision is fulfilled we stash its id in createdMaterialIds[ui].
  // Every later attempt reuses those instead of creating again.
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
          // Resolve "add as new material" decisions first — recipe rows
          // need real material ids before the product (and its recipe)
          // can be created.
          const createdMaterialIds = { ...(entry.createdMaterialIds || {}) }
          const unmatched = item.unmatchedIngredients || []
          for (let ui = 0; ui < unmatched.length; ui++) {
            const ing = unmatched[ui]
            if (ing.decision !== 'create' || createdMaterialIds[ui]) continue
            const createdMaterial = await createMaterial({
              name: ing.candidateName.trim(),
              unit: ing.newMaterialUnit.trim(),
              unit_cost: ing.newMaterialUnitCost !== '' ? Number(ing.newMaterialUnitCost) : undefined,
            })
            createdMaterialIds[ui] = createdMaterial.id
            updated[i] = { ...updated[i], createdMaterialIds }
            setPhotoSubmission([...updated])
          }

          const unmatchedRecipeRows = unmatched
            .map((ing, ui) => {
              if (ing.decision === 'link' && ing.linkedMaterialId) {
                return { material_id: ing.linkedMaterialId, quantity_per_unit: Number(ing.qtyPerUnit) }
              }
              if (ing.decision === 'create' && createdMaterialIds[ui]) {
                return { material_id: createdMaterialIds[ui], quantity_per_unit: Number(ing.qtyPerUnit) }
              }
              return null
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

  async function finishPhotoBatch() {
    await refetchProducts()
    await refetchMaterials()
    refetchAlerts()
    setPhotoQueue([])
    setPhotoSubmission(null)
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
              {photoSubmission.map((entry, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] px-4 py-3 lg:px-6 lg:py-4"
                >
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
                  {entry.status === 'failed' && (
                    <span className="text-sm font-medium text-[var(--color-error)]">{entry.error}</span>
                  )}
                </div>
              ))}
            </div>

            {!photoSubmitting && photoSubmission.some((e) => e.status === 'failed') && (
              <>
                <p className="text-sm text-[var(--color-error)] lg:text-base">
                  {photoSubmission.filter((e) => e.status === 'ok').length} of {photoSubmission.length} logged. The
                  rest failed — items already marked "Logged" won't be repeated on retry, and any product or
                  material already created for a failed row won't be created again either.
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
          <PhotoBatchReview
            items={photoQueue}
            materials={materials}
            currency={currency}
            onUpdateItem={updatePhotoItem}
            onUpdateRecipeRow={updatePhotoRecipeRow}
            onAddRecipeRow={addPhotoRecipeRow}
            onRemoveRecipeRow={removePhotoRecipeRow}
            onUpdateUnmatchedIngredient={updatePhotoUnmatchedIngredient}
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