import { useState } from 'react'
import { mockDispatchLog, mockRetailers as initialRetailers } from './data/ordersMock.js'
import DispatchList from './components/DispatchList.jsx'
import DispatchDetail from './components/DispatchDetail.jsx'
import LogDispatchFlow from './components/LogDispatchFlow.jsx'

const VIEWS = { LIST: 'list', DETAIL: 'detail', LOG: 'log' }

export default function OrdersLedgerPage() {
  const [view, setView] = useState(VIEWS.LIST)
  const [dispatches, setDispatches] = useState(mockDispatchLog)
  const [retailers, setRetailers] = useState(initialRetailers)
  const [selectedDispatch, setSelectedDispatch] = useState(null)

  function openDetail(dispatch) {
    setSelectedDispatch(dispatch)
    setView(VIEWS.DETAIL)
  }

  function backToList() {
    setSelectedDispatch(null)
    setView(VIEWS.LIST)
  }

  function addRetailer(newRetailer) {
    // TODO: replace with real API call once backend/agents/ endpoints exist.
    setRetailers((prev) => [...prev, newRetailer])
  }

  function confirmDispatch(entry) {
    // TODO: replace with real API call — should also deduct finished-stock
    // inventory once that's wired (dispatch reduces stock, production adds it).
    const newDispatch = { ...entry, id: `d${Date.now()}` }
    setDispatches((prev) => [newDispatch, ...prev])
    setView(VIEWS.LIST)
  }

  function markPaid(dispatchId) {
    // TODO: real API call. Sets amountPaid = amount, same as a full-payment restock.
    setDispatches((prev) =>
      prev.map((d) => (d.id === dispatchId ? { ...d, amountPaid: d.amount } : d))
    )
    setSelectedDispatch((prev) => (prev && prev.id === dispatchId ? { ...prev, amountPaid: prev.amount } : prev))
  }

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      {view === VIEWS.LIST && (
        <>
          <h1 className="font-sans text-xl font-bold text-[var(--color-ink)] sm:text-2xl lg:text-3xl xl:text-4xl">
            Orders
          </h1>
          <DispatchList
            dispatches={dispatches}
            onSelectDispatch={openDetail}
            onLogDispatch={() => setView(VIEWS.LOG)}
          />
        </>
      )}

      {view === VIEWS.DETAIL && selectedDispatch && (
        <DispatchDetail dispatch={selectedDispatch} onBack={backToList} onMarkPaid={markPaid} />
      )}

      {view === VIEWS.LOG && (
        <LogDispatchFlow
          retailers={retailers}
          onAddRetailer={addRetailer}
          onBack={backToList}
          onConfirm={confirmDispatch}
        />
      )}
    </div>
  )
}