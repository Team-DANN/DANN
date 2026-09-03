// PATH: src/features/inventory/InventoryPage.jsx
import { useState } from 'react'
import { useMaterials } from './hooks/useMaterials.js'
import { restockMaterial } from '../../lib/api/inventory.js'
import MaterialList from './components/MaterialList.jsx'
import MaterialDetail from './components/MaterialDetail.jsx'
import AddMaterialFlow from './components/AddMaterialFlow.jsx'
import RestockEntry from './components/RestockEntry.jsx'

const VIEWS = { LIST: 'list', DETAIL: 'detail', ADD: 'add', RESTOCK: 'restock' }

export default function InventoryPage() {
  const [view, setView] = useState(VIEWS.LIST)
  const { materials, loading, error, refetch } = useMaterials()
  const [selectedMaterial, setSelectedMaterial] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  function openDetail(material) {
    setSelectedMaterial(material)
    setView(VIEWS.DETAIL)
  }

  function backToList() {
    setSelectedMaterial(null)
    setView(VIEWS.LIST)
  }

  // GAP: there's no POST /api/materials route in lib/api/inventory.js yet
  // (only getMaterials / getLowStockMaterials / restockMaterial). Flag to
  // Wayne — AddMaterialFlow can't actually persist anything until that
  // exists. Left as a local-only optimistic add for now so the UI doesn't
  // break, but this material will disappear on refresh.
  function addMaterial(newMaterial) {
    setActionError('Add material isn\'t wired to the backend yet — this material won\'t persist after refresh.')
    setView(VIEWS.LIST)
    // Not calling refetch() here on purpose — there's nothing to refetch
    // yet, and doing so would wipe the optimistic entry.
  }

  async function confirmRestock(entry) {
    setSubmitting(true)
    setActionError(null)
    try {
      // NOTE: entry.supplier and entry.date are collected by RestockEntry
      // but restockMaterial() only forwards quantity_added/cost — the
      // backend route as given doesn't accept supplier. Flag to Wayne:
      // either extend POST /api/materials/:id/restock to accept supplier,
      // or supplier gets silently dropped every time someone logs a restock.
      const updated = await restockMaterial(entry.materialId, {
        quantity_added: entry.qtyAdded,
        cost: entry.cost,
      })

      if (updated && updated.id) {
        // Backend returned the updated material — use it directly.
        setSelectedMaterial(updated)
      } else {
        // Unknown/partial response shape — refetch to stay correct rather
        // than guess at qtyOnHand math client-side.
        await refetch()
        setSelectedMaterial((prev) => prev)
      }
      setView(VIEWS.DETAIL)
    } catch (err) {
      setActionError(err.message || 'Failed to log restock')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      {actionError && (
        <p className="rounded-xl border border-[var(--color-error)] px-4 py-3 text-sm text-[var(--color-error)]">
          {actionError}
        </p>
      )}

      {view === VIEWS.LIST && (
        <>
          <h1 className="font-sans text-xl font-bold text-[var(--color-ink)] sm:text-2xl lg:text-3xl xl:text-4xl">
            Inventory
          </h1>
          {error && (
            <p className="rounded-xl border border-[var(--color-error)] px-4 py-3 text-sm text-[var(--color-error)]">
              {error}
            </p>
          )}
          {loading ? (
            <p className="text-sm text-[var(--color-ink-muted)]">Loading materials…</p>
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
    </div>
  )
}