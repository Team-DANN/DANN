// PATH: src/features/orders/OrdersLedgerPage.jsx
import { useState } from 'react'
import { useRetailers } from './hooks/useRetailers.js'
import { useOrders } from './hooks/useOrders.js'
import { useProducts } from '../production/hooks/useProducts.js'
import { createRetailer } from '../../lib/api/retailers.js'
import { createOrder, recordPayment } from '../../lib/api/orders.js'
import DispatchList from './components/DispatchList.jsx'
import DispatchDetail from './components/DispatchDetail.jsx'
import LogDispatchFlow from './components/LogDispatchFlow.jsx'

const VIEWS = { LIST: 'list', DETAIL: 'detail', LOG: 'log' }

export default function OrdersLedgerPage() {
  const [view, setView] = useState(VIEWS.LIST)
  const [selectedOrder, setSelectedOrder] = useState(null)

  const { retailers, loading: retailersLoading, error: retailersError, refetch: refetchRetailers } = useRetailers()
  const { orders, loading: ordersLoading, error: ordersError, refetch: refetchOrders } = useOrders()
  const { products } = useProducts()

  function openDetail(order) {
    setSelectedOrder(order)
    setView(VIEWS.DETAIL)
  }

  function backToList() {
    setSelectedOrder(null)
    setView(VIEWS.LIST)
  }

  async function addRetailer(payload) {
    const retailer = await createRetailer(payload)
    refetchRetailers()
    return retailer
  }

  async function confirmDispatch({ retailerId, productId, quantity, amountPaid }) {
    await createOrder({ retailerId, productId, quantity, amountPaid })
    await refetchOrders()
    setView(VIEWS.LIST)
  }

  async function markPaid(order, remaining) {
    await recordPayment(order.id, remaining)
    await refetchOrders()
    backToList()
  }

  const retailerName = (id) => retailers.find((r) => r.id === id)?.name ?? 'Unknown retailer'
  const productName = (id) => products.find((p) => p.id === id)?.name ?? id

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      {view === VIEWS.LIST && (
        <>
          <h1 className="font-sans text-xl font-bold text-[var(--color-ink)] sm:text-2xl lg:text-3xl xl:text-4xl">
            Orders
          </h1>
          <DispatchList
            orders={orders}
            retailers={retailers}
            products={products}
            loading={ordersLoading}
            error={ordersError}
            onSelectDispatch={openDetail}
            onLogDispatch={() => setView(VIEWS.LOG)}
          />
        </>
      )}

      {view === VIEWS.DETAIL && selectedOrder && (
        <DispatchDetail
          order={selectedOrder}
          retailerName={retailerName(selectedOrder.retailer_id)}
          productName={productName(selectedOrder.product_id)}
          onBack={backToList}
          onMarkPaid={markPaid}
        />
      )}

      {view === VIEWS.LOG && (
        <LogDispatchFlow
          retailers={retailers}
          retailersLoading={retailersLoading}
          retailersError={retailersError}
          onAddRetailer={addRetailer}
          onBack={backToList}
          onConfirm={confirmDispatch}
        />
      )}
    </div>
  )
}