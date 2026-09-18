import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { useProducts } from './hooks/useProducts.js'
import { useMaterials } from '../inventory/hooks/useMaterials.js'
import { createProduct, deleteProduct, logProduction } from '../../lib/api/production.js'
import { classifyImage } from '../../lib/api/ocr.js'
import { parseProductionPhoto } from './lib/parseProductionPhoto.js'
import ProductPicker from './components/ProductPicker.jsx'
import AddProductFlow from './components/AddProductFlow.jsx'
import QuantityStepper from './components/QuantityStepper.jsx'
import ConfirmProduction from './components/ConfirmProduction.jsx'
import ProductionDone from './components/ProductionDone.jsx'
import { useAlerts } from '../../context/useAlerts.js'

const STEPS = { PICK: 1, ADD_PRODUCT: 2, QUANTITY: 3, CONFIRM: 4, DONE: 5 }

export default function ProductionPlannerPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(STEPS.PICK)
  const { refetch: refetchAlerts } = useAlerts()
  const { products, loading: productsLoading, error: productsError, refetch: refetchProducts } = useProducts()
  const { materials } = useMaterials()

  const [selectedProduct, setSelectedProduct] = useState(null)
  const [quantity, setQuantity] = useState('0')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [lastQuantities, setLastQuantities] = useState({})

  // ---- Photo-based logging: a queue of draft entries, one per photo.
  // Each item walks the SAME QUANTITY -> CONFIRM steps manual selection
  // uses — not a parallel flow, just pre-filled. matchedProduct: null
  // means OCR couldn't confidently match a product, so that item falls
  // back to the normal picker instead of guessing wrong.
  const [photoQueue, setPhotoQueue] = useState([])
  const [queueIndex, setQueueIndex] = useState(0)
  const [processingPhotos, setProcessingPhotos] = useState(false)
  const [photoError, setPhotoError] = useState(null)
  const [needsManualMatch, setNeedsManualMatch] = useState(false)

  function selectProduct(product, prefillQuantity) {
    setSelectedProduct(product)
    setQuantity(prefillQuantity ?? lastQuantities[product.id] ?? '0')
    setConfirmingDelete(false)
    setNeedsManualMatch(false)
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
  }

  const qtyNum = parseFloat(quantity) || 0
  const consumption = selectedProduct?.recipe
    ? selectedProduct.recipe.map((r) => {
        const material = materials.find((m) => m.id === r.materialId)
        return { ...material, consumed: r.qtyPerUnit * qtyNum }
      })
    : []

  function loadQueueItem(item) {
    if (!item) { setPhotoQueue([]); setQueueIndex(0); setStep(STEPS.DONE); return }
    if (!item.matchedProduct) { setNeedsManualMatch(true); setStep(STEPS.PICK); return }
    selectProduct(item.matchedProduct, item.quantity != null ? String(item.quantity) : '0')
  }

  async function handlePhotosSelected(files) {
    setProcessingPhotos(true)
    setPhotoError(null)
    try {
      const results = []
      let skipped = 0
      for (const file of files) {
        const classified = await classifyImage(file, 'production')
        if (classified.status === 'match' || classified.status === 'ambiguous') {
          results.push(parseProductionPhoto(classified.text, products))
        } else {
          skipped += 1
        }
      }
      if (skipped > 0) {
        setPhotoError(`${skipped} photo(s) didn't look like a production log and were skipped — log those manually if needed.`)
      }
      if (results.length === 0) return
      setPhotoQueue(results)
      setQueueIndex(0)
      loadQueueItem(results[0])
    } catch (err) {
      setPhotoError(err.message || 'Failed to read photos')
    } finally {
      setProcessingPhotos(false)
    }
  }

  async function confirmProduction() {
    setSubmitting(true)
    setSubmitError(null)
    try {
      await logProduction({ productId: selectedProduct.id, quantityProduced: qtyNum })
      refetchAlerts()
      setLastQuantities((prev) => ({ ...prev, [selectedProduct.id]: quantity }))

      if (photoQueue.length > 0 && queueIndex < photoQueue.length - 1) {
        const next = queueIndex + 1
        setQueueIndex(next)
        loadQueueItem(photoQueue[next])
      } else {
        setPhotoQueue([])
        setQueueIndex(0)
        setStep(STEPS.DONE)
      }
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
      {needsManualMatch && (
        <p className="rounded-xl border border-[var(--color-border)] px-4 py-3 text-sm text-[var(--color-ink-muted)]">
          Couldn't tell which product photo {queueIndex + 1} of {photoQueue.length} was for — pick it below.
        </p>
      )}

      {step === STEPS.PICK && (
        productsLoading ? (
          <p className="text-sm text-[var(--color-ink-muted)]">Loading products…</p>
        ) : (
          <ProductPicker
            products={products}
            onSelect={(p) => {
              if (needsManualMatch) {
                const guess = photoQueue[queueIndex]?.quantity
                selectProduct(p, guess != null ? String(guess) : '0')
              } else {
                selectProduct(p)
              }
            }}
            onAddProduct={() => setStep(STEPS.ADD_PRODUCT)}
            onRetry={refetchProducts}
            onPhotosSelected={handlePhotosSelected}
            processingPhotos={processingPhotos}
          />
        )
      )}

      {step === STEPS.ADD_PRODUCT && <AddProductFlow onBack={() => setStep(STEPS.PICK)} onAdd={addNewProduct} />}

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

      {step === STEPS.DONE && <ProductionDone onUndo={undoLast} onDone={finishAndGoHome} onLogAnother={logAnother} />}
    </div>
  )
}