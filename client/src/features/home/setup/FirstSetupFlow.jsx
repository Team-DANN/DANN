// PATH: src/features/home/setup/FirstSetupFlow.jsx
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileSpreadsheet, ListChecks } from 'lucide-react'
import { useAuth } from '../../../context/AuthContext.jsx'
import { useProducts } from '../../production/hooks/useProducts.js'
import { useRetailers } from '../../orders/hooks/useRetailers.js'
import { createProduct, logProduction } from '../../../lib/api/production.js'
import { createMaterial } from '../../../lib/api/inventory.js'
import { createRetailer } from '../../../lib/api/retailers.js'
import { createOrder } from '../../../lib/api/orders.js'
import LogDispatchFlow from '../../orders/components/LogDispatchFlow.jsx'
import SetupField, { inputClass } from './SetupField.jsx'
import SetupProductStep from './SetupProductStep.jsx'
import SetupIngredientsStep from './SetupIngredientsStep.jsx'

const STAGES = {
  WELCOME: 'welcome',
  PRODUCT: 'product',
  INGREDIENTS: 'ingredients',
  PRODUCTION: 'production',
  ORDER: 'order',
  FINANCE: 'finance',
}
const STEP_ORDER = [STAGES.PRODUCT, STAGES.INGREDIENTS, STAGES.PRODUCTION, STAGES.ORDER, STAGES.FINANCE]
const STEP_LABELS = {
  [STAGES.PRODUCT]: 'Product',
  [STAGES.INGREDIENTS]: 'Ingredients',
  [STAGES.PRODUCTION]: 'Production',
  [STAGES.ORDER]: 'Order',
  [STAGES.FINANCE]: 'Finance',
}

// Status is always a word under the bar, never color alone.
function Progress({ stage }) {
  const idx = STEP_ORDER.indexOf(stage)
  return (
    <div className="flex gap-2">
      {STEP_ORDER.map((s, i) => (
        <div key={s} className="flex flex-1 flex-col gap-1.5">
          <div className={`h-1.5 rounded-full ${i <= idx ? 'bg-[var(--color-stamp)]' : 'bg-[var(--color-border)]'}`} />
          <span
            className={`text-[11px] lg:text-xs ${
              i === idx ? 'font-semibold text-[var(--color-ink)]' : 'text-[var(--color-ink-muted)]'
            }`}
          >
            {STEP_LABELS[s]}
          </span>
        </div>
      ))}
    </div>
  )
}

function Panel({ children }) {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-paper-light)] p-6 shadow-sm lg:p-10">
      {children}
    </div>
  )
}

function StartCard({ icon: Icon, title, body, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-start gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-paper-light)] p-6 text-left transition-colors hover:border-[var(--color-stamp)] active:bg-[var(--color-paper)] lg:p-8"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-paper)] text-[var(--color-stamp)] lg:h-14 lg:w-14">
        <Icon size={22} strokeWidth={2} className="lg:h-7 lg:w-7" />
      </span>
      <span className="font-sans text-base font-semibold text-[var(--color-ink)] lg:text-xl">{title}</span>
      <span className="text-sm text-[var(--color-ink-muted)] lg:text-base">{body}</span>
    </button>
  )
}

function InfoTile({ label, body }) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-paper)] p-4">
      <p className="text-sm font-semibold text-[var(--color-ink)] lg:text-base">{label}</p>
      <p className="mt-1 text-xs text-[var(--color-ink-muted)] lg:text-sm">{body}</p>
    </div>
  )
}

// New-user setup, hosted on Home. Owns its own product/retailer hooks so
// Home doesn't have to pass a dozen props down; Home only hears about
// progress through onDataChanged / onDone / onDismiss.
//
// DB ORDER differs from screen order on purpose: a product's recipe needs
// real material IDs at creation time, so ingredients are created FIRST and
// the product SECOND (same order ProductionPlannerPage's photo flow uses).
// Every created ID is kept in state so a retry after a partial failure
// never creates anything twice.
export default function FirstSetupFlow({ onDataChanged, onDone, onDismiss }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const currency = user?.currency || '₹'

  const {
    products,
    loading: productsLoading,
    error: productsError,
    refetch: refetchProducts,
  } = useProducts()
  const {
    retailers,
    loading: retailersLoading,
    error: retailersError,
    refetch: refetchRetailers,
  } = useRetailers()

  const [stage, setStage] = useState(STAGES.WELCOME)
  const [draft, setDraft] = useState({ name: '', category: '', unit: 'piece', sellingPrice: '' })
  const [ingredients, setIngredients] = useState([])
  const [createdProduct, setCreatedProduct] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const submittingRef = useRef(false)

  // ---- Production step (new) ----
  const [productionQty, setProductionQty] = useState('')
  const [productionSubmitting, setProductionSubmitting] = useState(false)
  const [productionError, setProductionError] = useState(null)
  const [productionLogged, setProductionLogged] = useState(false)

  const patchDraft = (patch) => setDraft((prev) => ({ ...prev, ...patch }))

  async function createEverything(list) {
    if (submittingRef.current) return
    submittingRef.current = true
    setSubmitting(true)
    setError(null)

    const working = list.map((i) => ({ ...i }))
    try {
      // 1) Materials first — skip any already created on a previous attempt.
      for (let i = 0; i < working.length; i++) {
        if (working[i].createdId) continue
        const ing = working[i]
        const created = await createMaterial({
          name: ing.name,
          unit: ing.unit,
          current_stock: Number(ing.stock) || 0,
          unit_cost: ing.unitCost !== '' ? Number(ing.unitCost) : undefined,
          reorder_threshold: 0,
        })
        working[i] = { ...working[i], createdId: created.id }
        setIngredients(working.map((w) => ({ ...w })))
      }

      // 2) Product, with a recipe built only from ingredients that have a "used in each" amount.
      let productForNextStep = createdProduct
      if (!productForNextStep) {
        const recipe = working
          .filter((w) => w.qtyPerUnit !== '' && Number(w.qtyPerUnit) > 0)
          .map((w) => ({ material_id: w.createdId, quantity_per_unit: Number(w.qtyPerUnit) }))

        const product = await createProduct({
          name: draft.name.trim(),
          category: draft.category.trim() || undefined,
          unit: draft.unit,
          selling_price: Number(draft.sellingPrice),
          recipe: recipe.length > 0 ? recipe : undefined,
        })
        productForNextStep = { id: product.id, name: draft.name.trim() }
        setCreatedProduct(productForNextStep)
      }

      await refetchProducts()
      onDataChanged?.()
      setStage(STAGES.PRODUCTION)
    } catch (err) {
      setError(err.message || 'Something went wrong saving this. Nothing is lost — try again.')
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  function handleSubmitIngredients(finalList) {
    setIngredients(finalList)
    createEverything(finalList)
  }

  // ---- Production step: logs a batch of the product just created ----
  // Same call ProductionPlannerPage.jsx's confirmProduction makes. This
  // is what gives Costs (material cost from the recipe) anything to show
  // in the Finance step right after it — without this, Finance would
  // keep reading ₹0 until the user separately visited Production later.
  async function handleLogProduction() {
    const qty = parseFloat(productionQty) || 0
    if (qty <= 0) {
      setProductionError('Enter how many you made — or skip if nothing is made yet.')
      return
    }
    setProductionSubmitting(true)
    setProductionError(null)
    try {
      await logProduction({ productId: createdProduct.id, quantityProduced: qty })
      setProductionLogged(true)
      onDataChanged?.()
      setStage(STAGES.ORDER)
    } catch (err) {
      setProductionError(err.message || 'Could not log that batch. Try again, or skip for now.')
    } finally {
      setProductionSubmitting(false)
    }
  }

  // ---- Order step: same wiring OrdersLedgerPage gives LogDispatchFlow ----
  async function handleAddRetailer(payload) {
    const retailer = await createRetailer(payload)
    refetchRetailers()
    return retailer
  }

  async function handleAddProduct(payload) {
    const product = await createProduct(payload)
    await refetchProducts()
    return product
  }

  async function handleConfirmLine({ retailerId, productId, quantity, amountPaid }) {
    await createOrder({ retailerId, productId, quantity, amountPaid })
  }

  function handleOrderFinished() {
    onDataChanged?.()
    setStage(STAGES.FINANCE)
  }

  function finish(openFinance) {
    onDone()
    if (openFinance) navigate('/finance')
  }

  const inSteps = stage !== STAGES.WELCOME

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 lg:gap-8">
      {inSteps && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-[var(--color-stamp)]">
              Getting started
            </span>
            <button
              type="button"
              onClick={onDismiss}
              className="text-xs font-medium text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] lg:text-sm"
            >
              Exit setup
            </button>
          </div>
          <Progress stage={stage} />
        </div>
      )}

      {stage === STAGES.WELCOME && (
        <Panel>
          <div className="flex flex-col gap-5 lg:gap-6">
            <div>
              <h2 className="font-sans text-xl font-bold text-[var(--color-ink)] lg:text-3xl">
                Let's set up your workspace
              </h2>
              <p className="mt-1 text-sm text-[var(--color-ink-muted)] lg:text-base">
                Pick how you'd like to start. You can always do the other one later from Sync Data in the sidebar.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <StartCard
                icon={ListChecks}
                title="Set up step by step"
                body="Add your first product, its ingredients, a batch, and a sale. About four minutes."
                onClick={() => setStage(STAGES.PRODUCT)}
              />
              <StartCard
                icon={FileSpreadsheet}
                title="Bring my existing data"
                body="Import products, materials and orders from an Excel or CSV file."
                onClick={() => navigate('/migration')}
              />
            </div>
            <button
              type="button"
              onClick={onDismiss}
              className="self-start text-sm font-medium text-[var(--color-ink-muted)] underline hover:text-[var(--color-ink)]"
            >
              Skip for now — I'll explore on my own
            </button>
          </div>
        </Panel>
      )}

      {stage === STAGES.PRODUCT && (
        <Panel>
          <SetupProductStep
            draft={draft}
            onChange={patchDraft}
            onNext={() => setStage(STAGES.INGREDIENTS)}
            onBack={() => setStage(STAGES.WELCOME)}
            currency={currency}
          />
        </Panel>
      )}

      {stage === STAGES.INGREDIENTS && (
        <Panel>
          <SetupIngredientsStep
            productName={draft.name.trim()}
            productUnit={draft.unit}
            ingredients={ingredients}
            onAdd={(ing) => setIngredients((prev) => [...prev, ing])}
            onRemove={(key) => setIngredients((prev) => prev.filter((i) => i.key !== key))}
            onSubmit={handleSubmitIngredients}
            onBack={() => setStage(STAGES.PRODUCT)}
            submitting={submitting}
            error={error}
          />
        </Panel>
      )}

      {stage === STAGES.PRODUCTION && (
        <Panel>
          <div className="flex flex-col gap-5 lg:gap-6">
            <div>
              <h2 className="font-sans text-lg font-bold text-[var(--color-ink)] lg:text-2xl">
                How many {createdProduct?.name || 'have you made'} so far?
              </h2>
              <p className="mt-1 text-sm text-[var(--color-ink-muted)] lg:text-base">
                Logging a batch is what lets DANN work out your material costs and shows up in Finance right away.
                Optional — you can log this later from Production instead.
              </p>
            </div>

            <SetupField label={`Quantity produced (${draft.unit})`}>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={productionQty}
                onChange={(e) => setProductionQty(e.target.value)}
                placeholder="e.g. 10"
                className={inputClass}
              />
            </SetupField>

            {productionError && (
              <p className="rounded-xl border border-[var(--color-error)] px-4 py-3 text-sm text-[var(--color-error)]">
                {productionError}
              </p>
            )}

            <div className="flex items-center justify-between gap-3 pt-1">
              <button
                type="button"
                onClick={() => setStage(STAGES.ORDER)}
                disabled={productionSubmitting}
                className="text-sm font-medium text-[var(--color-ink-muted)] underline hover:text-[var(--color-ink)] disabled:opacity-40"
              >
                Skip, I'll log it later
              </button>
              <button
                type="button"
                onClick={handleLogProduction}
                disabled={productionSubmitting}
                className="rounded-xl bg-[var(--color-stamp)] px-6 py-3 font-sans text-sm font-semibold text-[var(--color-paper-light)] hover:bg-[var(--color-stamp-dark)] disabled:opacity-40 lg:text-base"
              >
                {productionSubmitting ? 'Logging…' : 'Log batch & continue →'}
              </button>
            </div>
          </div>
        </Panel>
      )}

      {stage === STAGES.ORDER && (
        <div className="flex flex-col gap-4 lg:gap-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-sans text-lg font-bold text-[var(--color-ink)] lg:text-2xl">
                Log your first order
              </h2>
              <p className="mt-1 text-sm text-[var(--color-ink-muted)] lg:text-base">
                Optional — record a real sale now, or skip and do it later from Orders.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setStage(STAGES.FINANCE)}
              className="flex-shrink-0 rounded-xl border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-ink)] hover:border-[var(--color-stamp)]"
            >
              Skip this step
            </button>
          </div>

          {/* LogDispatchFlow's own back button = skip; everything before this is already saved. */}
          <LogDispatchFlow
            retailers={retailers}
            retailersLoading={retailersLoading}
            retailersError={retailersError}
            products={products}
            productsLoading={productsLoading}
            productsError={productsError}
            onAddRetailer={handleAddRetailer}
            onAddProduct={handleAddProduct}
            onRetryProducts={refetchProducts}
            onBack={() => setStage(STAGES.FINANCE)}
            onConfirmLine={handleConfirmLine}
            onFinish={handleOrderFinished}
          />
        </div>
      )}

      {stage === STAGES.FINANCE && (
        <Panel>
          <div className="flex flex-col gap-5 lg:gap-6">
            <div>
              <h2 className="font-sans text-lg font-bold text-[var(--color-ink)] lg:text-2xl">
                This is where your profit shows up
              </h2>
              <p className="mt-1 text-sm text-[var(--color-ink-muted)] lg:text-base">
                {createdProduct ? `${createdProduct.name} is set up` : 'Your product is set up'}
                {productionLogged ? ', with a batch logged' : ''}. Finance keeps filling in as you log more.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <InfoTile label="Revenue" body="What you've sold to retailers." />
              <InfoTile label="Costs" body="Materials and labor from the batches you log." />
              <InfoTile label="Profit" body="Revenue minus costs, with a trend against the last period." />
            </div>
            <div className="flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => finish(true)}
                className="rounded-xl border border-[var(--color-border)] px-5 py-3 text-sm font-semibold text-[var(--color-ink)] hover:border-[var(--color-stamp)] lg:text-base"
              >
                Look at Finance
              </button>
              <button
                type="button"
                onClick={() => finish(false)}
                className="rounded-xl bg-[var(--color-stamp)] px-6 py-3 font-sans text-sm font-semibold text-[var(--color-paper-light)] hover:bg-[var(--color-stamp-dark)] lg:text-base"
              >
                Go to Home
              </button>
            </div>
          </div>
        </Panel>
      )}
    </div>
  )
}