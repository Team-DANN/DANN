import { useState } from 'react'
import { inventoryMaterials as initialMaterials, mockRestockLog } from './data/inventoryMock.js'
import MaterialList from './components/MaterialList.jsx'
import MaterialDetail from './components/MaterialDetail.jsx'
import AddMaterialFlow from './components/AddMaterialFlow.jsx'
import RestockEntry from './components/RestockEntry.jsx'

const VIEWS = { LIST: 'list', DETAIL: 'detail', ADD: 'add', RESTOCK: 'restock' }

export default function InventoryPage() {
  const [view, setView] = useState(VIEWS.LIST)
  const [materials, setMaterials] = useState(initialMaterials)
  const [selectedMaterial, setSelectedMaterial] = useState(null)

  function openDetail(material) {
    setSelectedMaterial(material)
    setView(VIEWS.DETAIL)
  }

  function backToList() {
    setSelectedMaterial(null)
    setView(VIEWS.LIST)
  }

  function addMaterial(newMaterial) {
    // TODO: replace with real API call once backend/agents/ endpoints exist.
    setMaterials((prev) => [...prev, newMaterial])
    setView(VIEWS.LIST)
  }

  function confirmRestock(entry) {
    // TODO: replace with real API call — should also write to Finance's
    // cost log so this isn't entered twice.
    mockRestockLog.push(entry)
    setMaterials((prev) =>
      prev.map((m) =>
        m.id === entry.materialId ? { ...m, qtyOnHand: m.qtyOnHand + entry.qtyAdded } : m
      )
    )
    setSelectedMaterial((prev) =>
      prev && prev.id === entry.materialId
        ? { ...prev, qtyOnHand: prev.qtyOnHand + entry.qtyAdded }
        : prev
    )
    setView(VIEWS.DETAIL)
  }

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      {view === VIEWS.LIST && (
        <>
          <h1 className="font-sans text-xl font-bold text-[var(--color-ink)] sm:text-2xl lg:text-3xl xl:text-4xl">
            Inventory
          </h1>
          <MaterialList
            materials={materials}
            onSelectMaterial={openDetail}
            onAddMaterial={() => setView(VIEWS.ADD)}
          />
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
        />
      )}
    </div>
  )
}