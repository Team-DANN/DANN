// PATH: src/features/inventory/InventoryPage.jsx
import { useState } from 'react'
import { useMaterials } from './hooks/useMaterials.js'
import { useAlerts } from '../../context/useAlerts.js'
import { createMaterial, deleteMaterial, restockMaterial } from '../../lib/api/inventory.js'
import MaterialList from './components/MaterialList.jsx'
import MaterialDetail from './components/MaterialDetail.jsx'
import AddMaterialFlow from './components/AddMaterialFlow.jsx'
import RestockEntry from './components/RestockEntry.jsx'

const VIEWS = { LIST: 'list', DETAIL: 'detail', ADD: 'add', RESTOCK: 'restock' }

export default function InventoryPage() {
  const [view, setView] = useState(VIEWS.LIST)
  const { materials, loading, error, refetch } = useMaterials()
  const { refetch: refetchAlerts } = useAlerts()
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
    </div>
  )
}