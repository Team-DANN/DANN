import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { mockMaterials } from '../../lib/mockData.js'
import { extendedProductCatalog } from './data/productionMock.js'
import ProductPicker from './components/ProductPicker.jsx'
import AddProductFlow from './components/AddProductFlow.jsx'
import QuantityStepper from './components/QuantityStepper.jsx'
import ConfirmProduction from './components/ConfirmProduction.jsx'
import ProductionDone from './components/ProductionDone.jsx'

const STEPS = { PICK: 1, ADD_PRODUCT: 2, QUANTITY: 3, CONFIRM: 4, DONE: 5 }

export default function ProductionPlannerPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(STEPS.PICK)
  const [products, setProducts] = useState(extendedProductCatalog)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [quantity, setQuantity] = useState('0')
  const [lastLogged, setLastLogged] = useState(null)

  // Most days the quantity is roughly the same as last time — pre-fill
  // instead of making them retype it. Keyed by product id, persists for
  // the session (real version: persisted per-user in the DB).
  const [lastQuantities, setLastQuantities] = useState({})

  function selectProduct(product) {
    setSelectedProduct(product)
    setQuantity(lastQuantities[product.id] ?? '0')
    setStep(STEPS.QUANTITY)
  }

  // Voice can go straight to Confirm since it already carries a quantity —
  // still requires the explicit tap on Confirm, same as manual entry.
  function selectFromVoice(product, voiceQuantity) {
    setSelectedProduct(product)
    setQuantity(String(voiceQuantity))
    setStep(STEPS.CONFIRM)
  }

  function addNewProduct(product) {
    setProducts((prev) => [...prev, product])
    selectProduct(product)
  }

  function goBack() {
    if (step === STEPS.QUANTITY) setStep(STEPS.PICK)
    else if (step === STEPS.CONFIRM) setStep(STEPS.QUANTITY)
    else if (step === STEPS.ADD_PRODUCT) setStep(STEPS.PICK)
  }

  const qtyNum = parseFloat(quantity) || 0

  // Auto-computed from the recipe — no screen should ask for anything the
  // app can infer.
  const consumption = selectedProduct
    ? selectedProduct.recipe.map((r) => {
        const material = mockMaterials.find((m) => m.id === r.materialId)
        return { ...material, consumed: r.qtyPerUnit * qtyNum }
      })
    : []

  function confirmProduction() {
    // TODO: replace with real API call once backend/agents/ endpoints exist —
    // should auto-deduct materials and auto-add finished stock.
    const entry = {
      product: selectedProduct.name,
      quantity: qtyNum,
      consumed: consumption,
      timestamp: new Date().toISOString(),
    }
    console.log('Production logged:', entry)
    setLastLogged(entry)
    setLastQuantities((prev) => ({ ...prev, [selectedProduct.id]: quantity }))
    setStep(STEPS.DONE)
  }

  function undoLast() {
    // TODO: real API call to reverse the deduction once it exists.
    console.log('Production undone:', lastLogged)
    setLastLogged(null)
    setStep(STEPS.PICK)
    setSelectedProduct(null)
    setQuantity('0')
  }

  function logAnother() {
    setLastLogged(null)
    setSelectedProduct(null)
    setQuantity('0')
    setStep(STEPS.PICK)
  }

  function finishAndGoHome() {
    navigate('/')
  }

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <div className="flex items-center gap-3">
        {step !== STEPS.PICK && step !== STEPS.DONE && (
          <button type="button" onClick={goBack} aria-label="Back">
            <ArrowLeft size={20} strokeWidth={2} className="text-[var(--color-ink-muted)] lg:h-6 lg:w-6" />
          </button>
        )}
        <h1 className="font-sans text-xl font-bold text-[var(--color-ink)] lg:text-3xl xl:text-4xl">
          Log Production
        </h1>
      </div>

      {step === STEPS.PICK && (
        <ProductPicker
          products={products}
          onSelect={(p) => selectProduct(p)}
          onVoiceConfirm={selectFromVoice}
          onAddProduct={() => setStep(STEPS.ADD_PRODUCT)}
        />
      )}

      {step === STEPS.ADD_PRODUCT && (
        <AddProductFlow onBack={() => setStep(STEPS.PICK)} onAdd={addNewProduct} />
      )}

      {step === STEPS.QUANTITY && selectedProduct && (
        <div className="flex flex-col gap-6 lg:gap-8">
          <div className="flex items-center rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] px-4 py-3 lg:px-6 lg:py-4">
            <span className="font-sans text-base font-semibold text-[var(--color-ink)] lg:text-lg">
              {selectedProduct.name}
            </span>
          </div>

          <div className="flex flex-col items-center gap-2 py-4 lg:py-6">
            <QuantityStepper value={quantity} onChange={setQuantity} />
            <span className="text-sm text-[var(--color-ink-muted)] lg:text-base">units</span>
          </div>

          <button
            type="button"
            disabled={qtyNum <= 0}
            onClick={() => setStep(STEPS.CONFIRM)}
            className="rounded-xl bg-[var(--color-stamp)] py-4 font-sans text-base font-semibold text-[var(--color-paper-light)] disabled:opacity-40 lg:py-5 lg:text-lg"
          >
            Next
          </button>
        </div>
      )}

      {step === STEPS.CONFIRM && selectedProduct && (
        <ConfirmProduction
          product={selectedProduct}
          quantity={qtyNum}
          consumption={consumption}
          onConfirm={confirmProduction}
        />
      )}

      {step === STEPS.DONE && (
        <ProductionDone onUndo={undoLast} onDone={finishAndGoHome} onLogAnother={logAnother} />
      )}
    </div>
  )
}