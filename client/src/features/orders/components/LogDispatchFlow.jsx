import { useState } from 'react'
import { ArrowLeft, Check, Loader2 } from 'lucide-react'
import RetailerPicker from './RetailerPicker.jsx'
import AddRetailerFlow from './AddRetailerFlow.jsx'
import CartReview from './CartReview.jsx'
import ProductPicker from '../../production/components/ProductPicker.jsx'
import AddProductFlow from '../../production/components/AddProductFlow.jsx'
import QuantityStepper from '../../production/components/QuantityStepper.jsx'
import { useAuth } from '../../../context/AuthContext.jsx'

const STEPS = { RETAILER: 1, ADD_RETAILER: 2, PRODUCT: 3, ADD_PRODUCT: 4, QUANTITY: 5, CART: 6, PAYMENT: 7 }

const round2 = (n) => Math.round(n * 100) / 100

export default function LogDispatchFlow({
  retailers,
  retailersLoading,
  retailersError,
  products,
  productsLoading,
  productsError,
  onAddRetailer,
  onAddProduct,
  onRetryProducts,
  onBack,
  onConfirmLine,
  onFinish,
}) {
  const { user } = useAuth()
  const currency = user?.currency || '₹'

  const [step, setStep] = useState(STEPS.RETAILER)
  const [retailer, setRetailer] = useState(null)
  const [cart, setCart] = useState([]) // [{ product, quantity }]
  const [editingIndex, setEditingIndex] = useState(null) // index in cart being edited, or null when adding new
  const [product, setProduct] = useState(null)
  const [quantity, setQuantity] = useState('0')
  const [duplicateError, setDuplicateError] = useState(null)

  const [paymentMode, setPaymentMode] = useState('full') // 'full' | 'partial' | 'unpaid'
  const [partialAmount, setPartialAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submission, setSubmission] = useState(null) // [{ product, quantity, amountPaid, status, error }] once confirm is hit
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
    // If this product is already a line in the cart, don't add a second
    // line for it — jump straight into editing the existing line instead
    // of just blocking with an error. Simpler for the person: one tap gets
    // them to the quantity they actually want to change, no detour through
    // the cart screen.
    if (editingIndex === null) {
      const existingIndex = cart.findIndex((line) => line.product.id === p.id)
      if (existingIndex !== -1) {
        const existing = cart[existingIndex]
        setDuplicateError(`${p.name} is already in this dispatch adjust the quantity below.`)
        setEditingIndex(existingIndex)
        setProduct(existing.product)
        setQuantity(String(existing.quantity))
        setStep(STEPS.QUANTITY)
        return
      }
    }
    setDuplicateError(null)
    setProduct(p)
    setQuantity(editingIndex !== null ? quantity : '0')
    setStep(STEPS.QUANTITY)
  }

  async function addAndSelectProduct(payload) {
    setAddProductError(null)
    try {
      const newProduct = await onAddProduct(payload)
      selectProduct(newProduct)
    } catch (err) {
      setAddProductError(err.message || 'Failed to create product')
    }
  }

  function confirmQuantity() {
    setDuplicateError(null)
    const qtyNum = parseFloat(quantity) || 0
    if (editingIndex !== null) {
      setCart((prev) => prev.map((line, i) => (i === editingIndex ? { product, quantity: qtyNum } : line)))
    } else {
      setCart((prev) => [...prev, { product, quantity: qtyNum }])
    }
    setEditingIndex(null)
    setProduct(null)
    setQuantity('0')
    setStep(STEPS.CART)
  }

  function editLine(index) {
    const line = cart[index]
    setEditingIndex(index)
    setProduct(line.product)
    setQuantity(String(line.quantity))
    setDuplicateError(null)
    setStep(STEPS.QUANTITY)
  }

  function removeLine(index) {
    setCart((prev) => prev.filter((_, i) => i !== index))
  }

  function addAnotherProduct() {
    setEditingIndex(null)
    setDuplicateError(null)
    setStep(STEPS.PRODUCT)
  }

  function goBack() {
    if (step === STEPS.ADD_RETAILER) setStep(STEPS.RETAILER)
    else if (step === STEPS.PRODUCT) setStep(cart.length > 0 ? STEPS.CART : STEPS.RETAILER)
    else if (step === STEPS.ADD_PRODUCT) setStep(STEPS.PRODUCT)
    else if (step === STEPS.QUANTITY) {
      setDuplicateError(null)
      setStep(editingIndex !== null ? STEPS.CART : STEPS.PRODUCT)
    } else if (step === STEPS.CART) setStep(STEPS.RETAILER)
    else if (step === STEPS.PAYMENT) {
      if (submission) setSubmission(null)
      else setStep(STEPS.CART)
    } else onBack()
  }

  function lineTotal(line) {
    return (line.product.selling_price ?? 0) * line.quantity
  }
  const cartTotal = cart.reduce((sum, l) => sum + lineTotal(l), 0)
  const amountPaidTotal =
    paymentMode === 'full' ? cartTotal : paymentMode === 'partial' ? parseFloat(partialAmount) || 0 : 0

  // Splits one payment total across every line proportionally to that
  // line's share of the cart. The last line takes whatever's left over
  // instead of its own rounded share, so the per-line amounts always sum
  // to exactly amountPaidTotal instead of drifting a cent off from rounding.
  function allocatePayments() {
    let allocated = 0
    return cart.map((line, i) => {
      if (i === cart.length - 1) return round2(amountPaidTotal - allocated)
      const share = round2((lineTotal(line) / cartTotal) * amountPaidTotal)
      allocated += share
      return share
    })
  }

  const canConfirm =
    !submitting &&
    cart.length > 0 &&
    cartTotal > 0 &&
    (paymentMode !== 'partial' || (parseFloat(partialAmount) > 0 && parseFloat(partialAmount) < cartTotal))

  async function handleConfirm() {
    const paidPerLine = allocatePayments()
    const initialLines = cart.map((line, i) => ({
      product: line.product,
      quantity: line.quantity,
      amountPaid: paidPerLine[i],
      status: 'pending',
      error: null,
    }))
    setSubmission(initialLines)
    await runSubmission(initialLines)
  }

  // Submits every line that isn't already 'ok', in order, without stopping
  // on a failure — so one bad line (stale stock, a network blip) doesn't
  // block the rest of an otherwise-fine dispatch. Runs again on retry,
  // skipping lines that already succeeded so nothing gets double-logged.
  async function runSubmission(lines) {
    setSubmitting(true)
    const updated = [...lines]
    for (let i = 0; i < updated.length; i++) {
      if (updated[i].status === 'ok') continue
      try {
        await onConfirmLine({
          retailerId: retailer.id,
          productId: updated[i].product.id,
          quantity: updated[i].quantity,
          amountPaid: updated[i].amountPaid,
        })
        updated[i] = { ...updated[i], status: 'ok', error: null }
      } catch (err) {
        updated[i] = { ...updated[i], status: 'failed', error: err.message || 'Failed to log' }
      }
      setSubmission([...updated])
    }
    setSubmitting(false)
    if (!updated.some((l) => l.status === 'failed')) {
      await onFinish()
    }
  }

  const okCount = submission?.filter((l) => l.status === 'ok').length ?? 0
  const hasFailed = submission?.some((l) => l.status === 'failed') ?? false

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

      {step === STEPS.QUANTITY && product && (
        <div className="flex flex-col gap-6 lg:gap-8">
          {duplicateError && (
            <p className="rounded-xl border border-[var(--color-error)] px-4 py-3 text-sm text-[var(--color-error)]">
              {duplicateError}
            </p>
          )}

          <div className="flex items-center rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] px-4 py-3 lg:px-6 lg:py-4">
            <span className="font-sans text-base font-semibold text-[var(--color-ink)] lg:text-lg">
              {product.name} → {retailer.name}
            </span>
          </div>

          <p className="text-sm text-[var(--color-ink-muted)] lg:text-base">
            {product.current_stock > 0
              ? `${product.current_stock} ${product.unit ?? 'units'} available`
              : "No stock yet — log a production batch for this product first, then come back to dispatch it."}
          </p>

          <div className="flex flex-col items-center gap-2 py-4 lg:py-6">
            <QuantityStepper value={quantity} onChange={setQuantity} />
            <span className="text-sm text-[var(--color-ink-muted)] lg:text-base">units</span>
          </div>

          {(parseFloat(quantity) || 0) > product.current_stock && (
            <p className="text-sm text-[var(--color-error)] lg:text-base">
              Only {product.current_stock} {product.unit ?? 'units'} in stock reduce the quantity or produce more first.
            </p>
          )}

          <button
            type="button"
            disabled={(parseFloat(quantity) || 0) <= 0 || (parseFloat(quantity) || 0) > product.current_stock}
            onClick={confirmQuantity}
            className="rounded-xl bg-[var(--color-stamp)] py-4 font-sans text-base font-semibold text-[var(--color-paper-light)] disabled:opacity-40 lg:py-5 lg:text-lg"
          >
            {editingIndex !== null ? 'Save changes' : 'Add to dispatch'}
          </button>
        </div>
      )}

      {step === STEPS.CART && (
        <CartReview
          cart={cart}
          currency={currency}
          onEditLine={editLine}
          onRemoveLine={removeLine}
          onAddAnother={addAnotherProduct}
          onContinue={() => setStep(STEPS.PAYMENT)}
        />
      )}

      {step === STEPS.PAYMENT && (
        <div className="flex flex-col gap-6 lg:gap-8">
          {!submission ? (
            <>
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] px-4 py-3 lg:px-6 lg:py-4">
                <p className="text-xs text-[var(--color-ink-muted)] lg:text-sm">
                  Total across {cart.length} product{cart.length === 1 ? '' : 's'}
                </p>
                <p className="font-mono text-2xl font-bold text-[var(--color-ink)] lg:text-3xl">
                  {currency}{cartTotal.toFixed(2)}
                </p>
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
                  {cart.length > 1 && (
                    <span className="text-xs text-[var(--color-ink-muted)] lg:text-sm">
                      Split proportionally across all {cart.length} products.
                    </span>
                  )}
                </label>
              )}

              <button
                type="button"
                disabled={!canConfirm}
                onClick={handleConfirm}
                className="flex items-center justify-center gap-2 rounded-xl bg-[var(--color-stamp)] py-4 font-sans text-base font-semibold text-[var(--color-paper-light)] disabled:opacity-40 lg:gap-3 lg:py-5 lg:text-lg"
              >
                {submitting ? <Loader2 size={20} strokeWidth={2} className="animate-spin" /> : <Check size={20} strokeWidth={2} />}
                Confirm dispatch
              </button>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-2 lg:gap-3">
                {submission.map((line, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] px-4 py-3 lg:px-6 lg:py-4"
                  >
                    <span className="truncate text-sm text-[var(--color-ink)] lg:text-base">
                      {line.product.name} ×{line.quantity}
                    </span>
                    {line.status === 'pending' && (
                      <Loader2 size={16} strokeWidth={2} className="animate-spin text-[var(--color-ink-muted)]" />
                    )}
                    {line.status === 'ok' && (
                      <span className="flex items-center gap-1 text-sm font-medium text-[var(--color-success)]">
                        <Check size={16} strokeWidth={2} /> Logged
                      </span>
                    )}
                    {line.status === 'failed' && (
                      <span className="text-sm font-medium text-[var(--color-error)]">{line.error}</span>
                    )}
                  </div>
                ))}
              </div>

              {!submitting && hasFailed && (
                <>
                  <p className="text-sm text-[var(--color-error)] lg:text-base">
                    {okCount} of {submission.length} logged. The rest failed — the ones marked "Logged" are already
                    saved, so retrying only re-sends what's left.
                  </p>
                  <button
                    type="button"
                    onClick={() => runSubmission(submission)}
                    className="rounded-xl bg-[var(--color-stamp)] py-4 font-sans text-base font-semibold text-[var(--color-paper-light)] lg:py-5 lg:text-lg"
                  >
                    Retry failed
                  </button>
                  <button
                    type="button"
                    onClick={onFinish}
                    className="rounded-xl border border-[var(--color-border)] py-4 font-sans text-base font-semibold text-[var(--color-ink)] lg:py-5 lg:text-lg"
                  >
                    Done, back to list
                  </button>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
