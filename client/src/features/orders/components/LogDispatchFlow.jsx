// PATH: src/features/orders/components/LogDispatchFlow.jsx
import { useState } from 'react'
import { ArrowLeft, Check, Loader2 } from 'lucide-react'
import RetailerPicker from './RetailerPicker.jsx'
import AddRetailerFlow from './AddRetailerFlow.jsx'
import ProductPicker from '../../production/components/ProductPicker.jsx'
import AddProductFlow from '../../production/components/AddProductFlow.jsx'
import QuantityStepper from '../../production/components/QuantityStepper.jsx'

const STEPS = { RETAILER: 1, ADD_RETAILER: 2, PRODUCT: 3, ADD_PRODUCT: 4, QUANTITY: 5, PAYMENT: 6 }

export default function LogDispatchFlow({
  retailers,
  retailersLoading,
  retailersError,
  products,
  productsLoading,
  productsError,
  onAddRetailer,
  onAddProduct,
  onBack,
  onConfirm,
}) {
  const [step, setStep] = useState(STEPS.RETAILER)
  const [retailer, setRetailer] = useState(null)
  const [product, setProduct] = useState(null)
  const [quantity, setQuantity] = useState('0')
  const [paymentMode, setPaymentMode] = useState('full') // 'full' | 'partial' | 'unpaid'
  const [partialAmount, setPartialAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [addProductError, setAddProductError] = useState(null)

  function selectRetailer(r) {
    setRetailer(r)
    setStep(STEPS.PRODUCT)
  }

  async function addAndSelectRetailer(payload) {
    const newRetailer = await onAddRetailer(payload)
    selectRetailer(newRetailer)
  }

  function selectProduct(p) {
    setProduct(p)
    setStep(STEPS.QUANTITY)
  }

  // Real create-then-select, same pattern as AddRetailerFlow above —
  // onAddProduct (from OrdersLedgerPage) does the actual POST /api/products
  // + refetch; this just moves the flow forward once that's done. A newly
  // created product has current_stock: 0 by default, so dispatching it
  // immediately will correctly hit the "insufficient stock" check until
  // some has actually been produced — that's expected, not a bug.
  async function addAndSelectProduct(payload) {
    setAddProductError(null)
    try {
      const newProduct = await onAddProduct(payload)
      selectProduct(newProduct)
    } catch (err) {
      setAddProductError(err.message || 'Failed to create product')
    }
  }

  function goBack() {
    if (step === STEPS.ADD_RETAILER) setStep(STEPS.RETAILER)
    else if (step === STEPS.PRODUCT) setStep(STEPS.RETAILER)
    else if (step === STEPS.ADD_PRODUCT) setStep(STEPS.PRODUCT)
    else if (step === STEPS.QUANTITY) setStep(STEPS.PRODUCT)
    else if (step === STEPS.PAYMENT) setStep(STEPS.QUANTITY)
    else onBack()
  }

  const qtyNum = parseFloat(quantity) || 0
  // Computed from the product's real selling price — never a client-typed
  // total, so it can never drift from what the backend actually charges.
  const total = product ? (product.selling_price ?? 0) * qtyNum : 0

  async function handleConfirm() {
    const amountPaid = paymentMode === 'full' ? total : paymentMode === 'partial' ? parseFloat(partialAmount) || 0 : 0

    setSubmitting(true)
    setError(null)
    try {
      await onConfirm({ retailerId: retailer.id, productId: product.id, quantity: qtyNum, amountPaid })
    } catch (err) {
      setError(err.message || 'Failed to log dispatch')
      setSubmitting(false)
    }
  }

  const canConfirm =
    !submitting &&
    total > 0 &&
    (paymentMode !== 'partial' || (parseFloat(partialAmount) > 0 && parseFloat(partialAmount) < total))

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <div className="flex items-center gap-3">
        <button type="button" onClick={goBack} aria-label="Back">
          <ArrowLeft size={20} strokeWidth={2} className="text-[var(--color-ink-muted)] lg:h-6 lg:w-6" />
        </button>
        <h1 className="font-sans text-xl font-bold text-[var(--color-ink)] lg:text-3xl xl:text-4xl">Log Dispatch</h1>
      </div>

      {step === STEPS.RETAILER && (
        <RetailerPicker
          retailers={retailers}
          loading={retailersLoading}
          error={retailersError}
          onSelect={selectRetailer}
          onAddRetailer={() => setStep(STEPS.ADD_RETAILER)}
        />
      )}

      {step === STEPS.ADD_RETAILER && (
        <AddRetailerFlow onBack={() => setStep(STEPS.RETAILER)} onAdd={addAndSelectRetailer} />
      )}

      {step === STEPS.PRODUCT && (
        productsLoading ? (
          <p className="text-sm text-[var(--color-ink-muted)] lg:text-base">Loading products…</p>
        ) : productsError ? (
          <p className="text-sm text-[var(--color-error)] lg:text-base">Couldn't load products. {productsError}</p>
        ) : (
          <ProductPicker
            products={products}
            onSelect={selectProduct}
            onAddProduct={() => setStep(STEPS.ADD_PRODUCT)}
            onRetry={onRetryProducts}
          />
        )
      )}

      {step === STEPS.ADD_PRODUCT && (
        <>
          {addProductError && (
            <p className="rounded-xl border border-[var(--color-error)] px-4 py-3 text-sm text-[var(--color-error)]">
              {addProductError}
            </p>
          )}
          <AddProductFlow onBack={() => setStep(STEPS.PRODUCT)} onAdd={addAndSelectProduct} />
        </>
      )}

// LogDispatchFlow.jsx — replace the STEPS.QUANTITY block with this:

{step === STEPS.QUANTITY && product && (
  <div className="flex flex-col gap-6 lg:gap-8">
    <div className="flex items-center rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] px-4 py-3 lg:px-6 lg:py-4">
      <span className="font-sans text-base font-semibold text-[var(--color-ink)] lg:text-lg">
        {product.name} → {retailer.name}
      </span>
    </div>

    {/* current_stock comes straight from ProductModel — the real number,
        not a placeholder. A freshly created product legitimately starts
        at 0 until a batch is logged in Production; surfaced here so the
        person finds out before filling in the rest of the flow instead
        of hitting the backend's "insufficient stock" 400 at the end. */}
    <p className="text-sm text-[var(--color-ink-muted)] lg:text-base">
      {product.current_stock > 0
        ? `${product.current_stock} ${product.unit ?? 'units'} available`
        : "No stock yet — log a production batch for this product first, then come back to dispatch it."}
    </p>

    <div className="flex flex-col items-center gap-2 py-4 lg:py-6">
      <QuantityStepper value={quantity} onChange={setQuantity} />
      <span className="text-sm text-[var(--color-ink-muted)] lg:text-base">units</span>
    </div>

    {qtyNum > product.current_stock && (
      <p className="text-sm text-[var(--color-error)] lg:text-base">
        Only {product.current_stock} {product.unit ?? 'units'} in stock — reduce the quantity or produce more first.
      </p>
    )}

    <button
      type="button"
      disabled={qtyNum <= 0 || qtyNum > product.current_stock}
      onClick={() => setStep(STEPS.PAYMENT)}
      className="rounded-xl bg-[var(--color-stamp)] py-4 font-sans text-base font-semibold text-[var(--color-paper-light)] disabled:opacity-40 lg:py-5 lg:text-lg"
    >
      Next
    </button>
  </div>
)}
      {step === STEPS.PAYMENT && (
        <div className="flex flex-col gap-6 lg:gap-8">
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] px-4 py-3 lg:px-6 lg:py-4">
            <p className="text-xs text-[var(--color-ink-muted)] lg:text-sm">Total (at {product.name}'s selling price)</p>
            <p className="font-mono text-2xl font-bold text-[var(--color-ink)] lg:text-3xl">₹{total.toFixed(2)}</p>
          </div>

          <div className="grid grid-cols-3 gap-2 lg:gap-3">
            {[
              { id: 'full', label: 'Paid in full' },
              { id: 'partial', label: 'Partial' },
              { id: 'unpaid', label: 'Unpaid' },
            ].map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => setPaymentMode(mode.id)}
                className={`rounded-xl border py-3 text-sm font-medium lg:py-4 lg:text-base ${paymentMode === mode.id ? 'border-[var(--color-stamp)] bg-[var(--color-stamp)] text-[var(--color-paper-light)]' : 'border-[var(--color-border)] text-[var(--color-ink)]'}`}
              >
                {mode.label}
              </button>
            ))}
          </div>

          {paymentMode === 'partial' && (
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-[var(--color-ink-muted)] lg:text-sm">Amount paid now</span>
              <input
                type="text"
                inputMode="decimal"
                value={partialAmount}
                onChange={(e) => {
                  const next = e.target.value
                  if (next === '' || /^\d*\.?\d*$/.test(next)) setPartialAmount(next)
                }}
                placeholder="0"
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] px-4 py-3 font-mono text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:border-[var(--color-stamp)] focus:outline-none lg:py-4 lg:text-base"
              />
            </label>
          )}

          {error && <p className="text-sm text-[var(--color-error)] lg:text-base">{error}</p>}

          <button
            type="button"
            disabled={!canConfirm}
            onClick={handleConfirm}
            className="flex items-center justify-center gap-2 rounded-xl bg-[var(--color-stamp)] py-4 font-sans text-base font-semibold text-[var(--color-paper-light)] disabled:opacity-40 lg:gap-3 lg:py-5 lg:text-lg"
          >
            {submitting ? <Loader2 size={20} strokeWidth={2} className="animate-spin" /> : <Check size={20} strokeWidth={2} />}
            Confirm dispatch
          </button>
        </div>
      )}
    </div>
  )
}