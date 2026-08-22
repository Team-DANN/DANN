import { useState } from 'react'
import { ArrowLeft, Check, IndianRupee } from 'lucide-react'
import RetailerPicker from './RetailerPicker.jsx'
import AddRetailerFlow from './AddRetailerFlow.jsx'
import ProductPicker from '../../production/components/ProductPicker.jsx'
import QuantityStepper from '../../production/components/QuantityStepper.jsx'

// retailer -> product+qty -> amount -> paid toggle -> confirm.
// Reuses Production's ProductPicker/QuantityStepper rather than rebuilding
// them — same product catalog, same fast-tap interaction.
const STEPS = {
  RETAILER: 1,
  ADD_RETAILER: 2,
  PRODUCT: 3,
  QUANTITY: 4,
  AMOUNT: 5,
}

export default function LogDispatchFlow({ retailers, onAddRetailer, onBack, onConfirm }) {
  const [step, setStep] = useState(STEPS.RETAILER)
  const [retailer, setRetailer] = useState(null)
  const [product, setProduct] = useState(null)
  const [quantity, setQuantity] = useState('0')
  const [amount, setAmount] = useState('')
  const [paymentMode, setPaymentMode] = useState('full') // 'full' | 'partial' | 'unpaid'
  const [partialAmount, setPartialAmount] = useState('')

  function selectRetailer(r) {
    setRetailer(r)
    setStep(STEPS.PRODUCT)
  }

  function addAndSelectRetailer(newRetailer) {
    onAddRetailer(newRetailer)
    selectRetailer(newRetailer)
  }

  function selectProduct(p) {
    setProduct(p)
    setStep(STEPS.QUANTITY)
  }

  function goBack() {
    if (step === STEPS.ADD_RETAILER) setStep(STEPS.RETAILER)
    else if (step === STEPS.PRODUCT) setStep(STEPS.RETAILER)
    else if (step === STEPS.QUANTITY) setStep(STEPS.PRODUCT)
    else if (step === STEPS.AMOUNT) setStep(STEPS.QUANTITY)
    else onBack()
  }

  const qtyNum = parseFloat(quantity) || 0
  const amountNum = parseFloat(amount) || 0

  function handleConfirm() {
    const amountPaid =
      paymentMode === 'full' ? amountNum : paymentMode === 'partial' ? parseFloat(partialAmount) || 0 : 0

    onConfirm({
      retailerId: retailer.id,
      items: [{ productId: product.id, qty: qtyNum }],
      amount: amountNum,
      amountPaid,
      date: new Date().toISOString(),
    })
  }

  const canConfirm =
    amountNum > 0 && (paymentMode !== 'partial' || (parseFloat(partialAmount) > 0 && parseFloat(partialAmount) < amountNum))

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <button type="button" onClick={goBack} aria-label="Back">
          <ArrowLeft size={20} strokeWidth={2} className="text-[var(--color-ink-muted)]" />
        </button>
        <h1 className="font-sans text-xl font-bold text-[var(--color-ink)]">Log Dispatch</h1>
      </div>

      {step === STEPS.RETAILER && (
        <RetailerPicker
          retailers={retailers}
          onSelect={selectRetailer}
          onAddRetailer={() => setStep(STEPS.ADD_RETAILER)}
        />
      )}

      {step === STEPS.ADD_RETAILER && (
        <AddRetailerFlow onBack={() => setStep(STEPS.RETAILER)} onAdd={addAndSelectRetailer} />
      )}

      {step === STEPS.PRODUCT && (
        <ProductPicker onSelect={selectProduct} onVoiceConfirm={() => {}} onAddProduct={() => {}} />
      )}

      {step === STEPS.QUANTITY && product && (
        <div className="flex flex-col gap-6">
          <div className="flex items-center rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] px-4 py-3">
            <span className="font-sans text-base font-semibold text-[var(--color-ink)]">
              {product.name} → {retailer.name}
            </span>
          </div>

          <div className="flex flex-col items-center gap-2 py-4">
            <QuantityStepper value={quantity} onChange={setQuantity} />
            <span className="text-sm text-[var(--color-ink-muted)]">units</span>
          </div>

          <button
            type="button"
            disabled={qtyNum <= 0}
            onClick={() => setStep(STEPS.AMOUNT)}
            className="rounded-xl bg-[var(--color-stamp)] py-4 font-sans text-base font-semibold text-[var(--color-paper-light)] disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}

      {step === STEPS.AMOUNT && (
        <div className="flex flex-col gap-6">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-[var(--color-ink-muted)]">Total amount</span>
            <div className="relative">
              <IndianRupee
                size={14}
                strokeWidth={2}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)]"
              />
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => {
                  const next = e.target.value
                  if (next === '' || /^\d*\.?\d*$/.test(next)) setAmount(next)
                }}
                placeholder="0"
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] py-3 pl-8 pr-4 font-mono text-lg text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:border-[var(--color-stamp)] focus:outline-none"
              />
            </div>
          </label>

          {/* One tap for the common case, partial only reveals a field if chosen. */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'full', label: 'Paid in full' },
              { id: 'partial', label: 'Partial' },
              { id: 'unpaid', label: 'Unpaid' },
            ].map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => setPaymentMode(mode.id)}
                className={`rounded-xl border py-3 text-sm font-medium ${
                  paymentMode === mode.id
                    ? 'border-[var(--color-stamp)] bg-[var(--color-stamp)] text-[var(--color-paper-light)]'
                    : 'border-[var(--color-border)] text-[var(--color-ink)]'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>

          {paymentMode === 'partial' && (
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-[var(--color-ink-muted)]">
                Amount paid now
              </span>
              <div className="relative">
                <IndianRupee
                  size={14}
                  strokeWidth={2}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)]"
                />
                <input
                  type="text"
                  inputMode="decimal"
                  value={partialAmount}
                  onChange={(e) => {
                    const next = e.target.value
                    if (next === '' || /^\d*\.?\d*$/.test(next)) setPartialAmount(next)
                  }}
                  placeholder="0"
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] py-3 pl-8 pr-4 font-mono text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:border-[var(--color-stamp)] focus:outline-none"
                />
              </div>
            </label>
          )}

          <button
            type="button"
            disabled={!canConfirm}
            onClick={handleConfirm}
            className="flex items-center justify-center gap-2 rounded-xl bg-[var(--color-stamp)] py-4 font-sans text-base font-semibold text-[var(--color-paper-light)] disabled:opacity-40"
          >
            <Check size={20} strokeWidth={2} />
            Confirm dispatch
          </button>
        </div>
      )}
    </div>
  )
}