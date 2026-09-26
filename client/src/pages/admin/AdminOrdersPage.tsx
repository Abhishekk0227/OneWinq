import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '@/features/admin/api/admin.api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingScreen } from '@/components/common/LoadingScreen'
import { EmptyState } from '@/components/common/EmptyState'
import { toast } from '@/stores/toastStore'
import {
  Package,
  Search,
  Truck,
  CreditCard,
  Send,
  RefreshCw,
  X,
  Phone,
  Sparkles,
  Zap,
} from 'lucide-react'

const ORDER_STATE_CONFIG: Record<
  string,
  { label: string; color: string; dotColor: string }
> = {
  CREATED: {
    label: 'Created',
    color: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    dotColor: 'bg-purple-400',
  },
  PAID: {
    label: 'Paid',
    color: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
    dotColor: 'bg-sky-400',
  },
  PROCESSING: {
    label: 'Processing',
    color: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    dotColor: 'bg-amber-400',
  },
  SHIPPED: {
    label: 'Shipped',
    color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    dotColor: 'bg-emerald-400',
  },
  DELIVERED: {
    label: 'Delivered',
    color: 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40',
    dotColor: 'bg-emerald-300',
  },
  CANCELLED: {
    label: 'Cancelled',
    color: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    dotColor: 'bg-rose-400',
  },
}

export default function AdminOrdersPage() {
  const queryClient = useQueryClient()
  const [selectedStatus, setSelectedStatus] = React.useState<string>('ALL')
  const [searchQuery, setSearchQuery] = React.useState<string>('')
  const [page, setPage] = React.useState<number>(1)

  // Fulfillment Modal State
  const [selectedOrder, setSelectedOrder] = React.useState<any | null>(null)
  const [isFulfillModalOpen, setIsFulfillModalOpen] = React.useState(false)
  const [selectedCardCode, setSelectedCardCode] = React.useState<string>('')
  const [carrier, setCarrier] = React.useState<string>('BlueDart Express')
  const [trackingNumber, setTrackingNumber] = React.useState<string>('')

  // Status Update Modal State
  const [isStatusModalOpen, setIsStatusModalOpen] = React.useState(false)
  const [newStatus, setNewStatus] = React.useState<string>('PAID')

  // Fetch Orders
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin', 'orders', selectedStatus, searchQuery, page],
    queryFn: () =>
      adminApi.listOrders({
        status: selectedStatus,
        q: searchQuery,
        page,
        limit: 25,
      }),
  })

  // Fetch Unassigned Cards for Fulfillment Dropdown
  const { data: unassignedCardsData } = useQuery({
    queryKey: ['admin', 'cards', 'unassigned'],
    queryFn: () => adminApi.listCards({ status: 'UNASSIGNED', limit: 50 }),
    enabled: isFulfillModalOpen,
  })

  const orders = data?.data?.orders || []
  const stats = data?.data?.stats || {
    totalOrders: 0,
    created: 0,
    paid: 0,
    processing: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
    totalRevenue: 0,
  }
  const pagination = data?.data?.pagination || { total: 0, page: 1, totalPages: 1 }
  const unassignedCards = unassignedCardsData?.data?.cards || []

  // Fulfill Mutation
  const fulfillMutation = useMutation({
    mutationFn: (payload: { orderId: string; cardCode?: string; carrier?: string; trackingNumber?: string }) =>
      adminApi.fulfillOrder(payload.orderId, {
        cardCode: payload.cardCode,
        carrier: payload.carrier,
        trackingNumber: payload.trackingNumber,
        state: 'SHIPPED',
      }),
    onSuccess: (res: any) => {
      toast.success(
        `Order ${res?.data?.orderNumber || ''} fulfilled! NFC Card ${selectedCardCode || 'auto-assigned'} is now ACTIVE and bound.`
      )
      setIsFulfillModalOpen(false)
      setSelectedOrder(null)
      setSelectedCardCode('')
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'cards'] })
    },
    onError: (err: unknown) => {
      const apiErr = err as { message?: string }
      toast.error(apiErr.message || 'Failed to fulfill order')
    },
  })

  // Update Status Mutation
  const updateStatusMutation = useMutation({
    mutationFn: (payload: { orderId: string; state: string; carrier?: string; trackingNumber?: string }) =>
      adminApi.updateOrder(payload.orderId, {
        state: payload.state,
        carrier: payload.carrier,
        trackingNumber: payload.trackingNumber,
      }),
    onSuccess: () => {
      toast.success('Order status updated successfully')
      setIsStatusModalOpen(false)
      setSelectedOrder(null)
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] })
    },
    onError: (err: unknown) => {
      const apiErr = err as { message?: string }
      toast.error(apiErr.message || 'Failed to update order status')
    },
  })

  const handleOpenFulfill = (order: any) => {
    setSelectedOrder(order)
    setSelectedCardCode('')
    setCarrier('BlueDart Express')
    setTrackingNumber(`BD-${Math.floor(10000000 + Math.random() * 90000000)}IN`)
    setIsFulfillModalOpen(true)
  }

  const handleOpenStatus = (order: any) => {
    setSelectedOrder(order)
    setNewStatus(order.state || 'PAID')
    setCarrier(order.carrier || 'BlueDart Express')
    setTrackingNumber(order.trackingNumber || '')
    setIsStatusModalOpen(true)
  }

  const pendingFulfillmentCount = stats.paid + stats.processing

  return (
    <div className="space-y-6 text-left max-w-6xl pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-2">
            <Package className="h-3.5 w-3.5" />
            <span>Fulfillment Pipeline</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Hardware Card Orders
          </h1>
          <p className="text-xs text-white/60">
            Review customer hardware orders, attach physical NFC smart cards, and manage courier tracking.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            isLoading={isFetching}
            className="border-white/15 bg-white/5 text-white hover:bg-white/10"
            leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-[#14141c] border border-white/10 space-y-1">
          <div className="text-[11px] text-white/50">Total Orders</div>
          <div className="text-2xl font-extrabold text-white">{stats.totalOrders}</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#14141c] border border-amber-500/20 space-y-1">
          <div className="flex items-center justify-between text-[11px] text-amber-400/80">
            <span>Pending Fulfillment</span>
            {stats.created > 0 && (
              <span className="text-[10px] text-white/40">({stats.created} unpaid)</span>
            )}
          </div>
          <div className="text-2xl font-extrabold text-amber-400">{pendingFulfillmentCount}</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#14141c] border border-emerald-500/20 space-y-1">
          <div className="text-[11px] text-emerald-400/80">Shipped / Delivered</div>
          <div className="text-2xl font-extrabold text-emerald-400">{stats.shipped + stats.delivered}</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#14141c] border border-white/10 space-y-1">
          <div className="text-[11px] text-white/50">Total Revenue</div>
          <div className="text-2xl font-extrabold text-white">
            ₹{(stats.totalRevenue > 5000 ? Math.round(stats.totalRevenue / 100) : stats.totalRevenue).toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {/* Search & Status Filters */}
      <div className="p-4 rounded-2xl bg-[#14141c] border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setPage(1)
            }}
            placeholder="Search by order #, recipient name, city..."
            className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/30 text-xs h-9"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 custom-scrollbar">
          {['ALL', 'CREATED', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map((st) => (
            <button
              key={st}
              onClick={() => {
                setSelectedStatus(st)
                setPage(1)
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors shrink-0 ${
                selectedStatus === st
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      {isLoading ? (
        <LoadingScreen message="Loading customer orders..." />
      ) : orders.length === 0 ? (
        <div className="p-12 rounded-3xl bg-[#14141c] border border-white/10 text-center">
          <EmptyState
            icon={<Package className="h-10 w-10 text-white/40" />}
            title="No orders found"
            description={
              searchQuery || selectedStatus !== 'ALL'
                ? 'Try adjusting your search query or status filter.'
                : 'Customer hardware NFC orders will appear here.'
            }
          />
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order: any) => {
            const cfg = ORDER_STATE_CONFIG[order.state] || ORDER_STATE_CONFIG.CREATED
            const isINR = (order.currency || 'INR') === 'INR'
            const symbol = isINR ? '₹' : (order.currency || '₹')
            const rawAmt = order.totalAmount ?? 0
            const displayAmt = rawAmt > 5000 ? Math.round(rawAmt / 100) : rawAmt
            const hasAssignedCard = order.assignedCardUids && order.assignedCardUids.length > 0

            return (
              <div
                key={order.id || order._id}
                className="p-5 sm:p-6 rounded-3xl bg-[#14141c] border border-white/10 hover:border-white/20 transition-colors shadow-sm space-y-4"
              >
                {/* Top Row: Order Number, Status, Amount */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-mono text-xs font-bold text-primary px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20">
                      {order.orderNumber}
                    </span>

                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${cfg.color}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dotColor} animate-pulse`} />
                      <span>{cfg.label}</span>
                    </span>

                    <span className="text-xs text-white/50">
                      {new Date(order.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-base font-extrabold text-white">
                      {symbol}{displayAmt.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Middle Grid: Customer, Edition, Shipping, NFC Card */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  {/* Customer Identity */}
                  <div className="space-y-1.5 p-3 rounded-2xl bg-white/[0.02] border border-white/5">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-white/40 block">
                      Customer Profile
                    </span>
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                        {order.user?.displayName?.[0] || 'U'}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-white truncate">
                          {order.user?.displayName || order.shippingAddress?.recipientName}
                        </div>
                        <div className="text-white/50 truncate font-mono text-[11px]">
                          @{order.user?.username || 'user'} • {order.user?.email || 'N/A'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Items / Edition */}
                  <div className="space-y-1.5 p-3 rounded-2xl bg-white/[0.02] border border-white/5">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-white/40 block">
                      Ordered Hardware
                    </span>
                    <div className="space-y-1">
                      {order.items?.map((it: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between text-white font-medium">
                          <span className="capitalize">{it.cardType || 'PVC'} Smart Card</span>
                          <span className="font-mono text-white/50">Qty: {it.quantity || 1}</span>
                        </div>
                      ))}
                    </div>

                    {/* Linked NFC Cards */}
                    <div className="pt-1 flex flex-wrap items-center gap-1.5">
                      {hasAssignedCard ? (
                        order.assignedCardUids.map((code: string) => (
                          <span
                            key={code}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono text-[10px] font-bold"
                          >
                            <CreditCard className="h-3 w-3" />
                            <span>{code}</span>
                          </span>
                        ))
                      ) : (
                        <span className="text-[11px] text-amber-400/80 font-medium">
                          ⚠️ No physical card attached yet
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Shipping Address */}
                  <div className="space-y-1.5 p-3 rounded-2xl bg-white/[0.02] border border-white/5">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-white/40 block">
                      Courier Delivery Address
                    </span>
                    <div className="text-white/80 leading-relaxed text-[11px]">
                      <strong>{order.shippingAddress?.recipientName || order.shippingAddress?.fullName}</strong>
                      <br />
                      {order.shippingAddress?.addressLine1 || order.shippingAddress?.line1}
                      {order.shippingAddress?.city && `, ${order.shippingAddress.city}`}
                      <br />
                      {order.shippingAddress?.state || order.shippingAddress?.stateName}{' '}
                      {order.shippingAddress?.postalCode},{' '}
                      {order.shippingAddress?.country || 'India'}
                      {order.shippingAddress?.phone && (
                        <div className="mt-1 flex items-center gap-1 text-white/50 font-mono">
                          <Phone className="h-3 w-3" />
                          <span>{order.shippingAddress.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom Row: Courier Tracking + Action Buttons */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-3 text-xs">
                    {order.trackingNumber ? (
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white/80 font-mono">
                        <Truck className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span>{order.carrier || 'Courier'}:</span>
                        <strong className="text-white">{order.trackingNumber}</strong>
                      </div>
                    ) : (
                      <span className="text-xs text-white/40 italic">
                        No courier tracking number assigned yet.
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenStatus(order)}
                      className="border-white/15 bg-white/5 text-white hover:bg-white/10 text-xs h-8"
                    >
                      Update Status
                    </Button>

                    <Button
                      size="sm"
                      onClick={() => handleOpenFulfill(order)}
                      leftIcon={<Zap className="h-3.5 w-3.5" />}
                      className="bg-primary hover:bg-primary-600 text-white text-xs h-8 shadow-xs"
                    >
                      {hasAssignedCard ? 'Re-assign / Re-ship' : 'Fulfill & Assign Card'}
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination Footer */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between p-4 rounded-2xl bg-[#14141c] border border-white/10 text-xs text-white/60">
          <div>
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} orders)
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="border-white/15 bg-white/5 text-white h-7 text-xs"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="border-white/15 bg-white/5 text-white h-7 text-xs"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Fulfill Order Modal */}
      {isFulfillModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-[#14141c] border border-white/15 rounded-3xl w-full max-w-lg p-6 space-y-5 shadow-2xl text-left">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span>Fulfill Order {selectedOrder.orderNumber}</span>
                </h3>
                <p className="text-xs text-white/50">
                  Select an available physical card and assign tracking details.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsFulfillModalOpen(false)}
                className="text-white/40 hover:text-white p-1 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Customer Recap */}
            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1 text-xs">
              <div className="text-white/50 text-[10px] uppercase font-bold">Assignee</div>
              <div className="font-bold text-white">
                {selectedOrder.shippingAddress?.recipientName || selectedOrder.user?.displayName}
              </div>
              <div className="text-white/60">
                {selectedOrder.shippingAddress?.addressLine1 || selectedOrder.shippingAddress?.line1},{' '}
                {selectedOrder.shippingAddress?.city}
              </div>
            </div>

            {/* Select Unassigned Card */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white/80">
                Physical NFC Smart Card (From Inventory)
              </label>
              <select
                value={selectedCardCode}
                onChange={(e) => setSelectedCardCode(e.target.value)}
                className="w-full bg-[#1c1c26] text-white text-xs px-3.5 py-2.5 rounded-xl border border-white/15 focus:ring-2 focus:ring-primary outline-none"
              >
                <option value="">-- Auto-Pick First Available Unassigned Card --</option>
                {unassignedCards.map((card: any) => (
                  <option key={card.cardId} value={card.cardId}>
                    {card.cardId} ({card.edition || 'PVC'}) — Unassigned
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-white/40">
                If left on Auto-Pick, the system automatically binds the next free sequential card.
              </p>
            </div>

            {/* Courier Carrier */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white/80">
                Shipping Carrier / Courier
              </label>
              <Input
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
                placeholder="e.g. BlueDart Express, Delhivery, SpeedPost"
                className="bg-white/5 border-white/10 text-white text-xs"
              />
            </div>

            {/* Tracking Number */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-white/80">
                  Tracking Number / AWB
                </label>
                <button
                  type="button"
                  onClick={() => setTrackingNumber(`BD-${Math.floor(10000000 + Math.random() * 90000000)}IN`)}
                  className="text-[10px] text-primary hover:underline font-semibold"
                >
                  Generate Test Tracking #
                </button>
              </div>
              <Input
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="e.g. BD123456789IN"
                className="bg-white/5 border-white/10 text-white font-mono text-xs"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsFulfillModalOpen(false)}
                className="text-white/60 hover:text-white text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                isLoading={fulfillMutation.isPending}
                onClick={() =>
                  fulfillMutation.mutate({
                    orderId: selectedOrder.id || selectedOrder._id,
                    cardCode: selectedCardCode,
                    carrier,
                    trackingNumber,
                  })
                }
                leftIcon={<Send className="h-3.5 w-3.5" />}
                className="bg-primary hover:bg-primary-600 text-white text-xs font-bold"
              >
                Confirm Fulfillment & Ship
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Status Update Modal */}
      {isStatusModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-[#14141c] border border-white/15 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl text-left">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <h3 className="text-base font-extrabold text-white">
                  Update Order {selectedOrder.orderNumber}
                </h3>
                <p className="text-xs text-white/50">
                  Update lifecycle state, carrier, or courier tracking.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsStatusModalOpen(false)}
                className="text-white/40 hover:text-white p-1 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white/80">Order State</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full bg-[#1c1c26] text-white text-xs px-3.5 py-2.5 rounded-xl border border-white/15 focus:ring-2 focus:ring-primary outline-none"
              >
                <option value="CREATED">CREATED</option>
                <option value="PAID">PAID</option>
                <option value="PROCESSING">PROCESSING</option>
                <option value="SHIPPED">SHIPPED</option>
                <option value="DELIVERED">DELIVERED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white/80">Carrier</label>
              <Input
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
                placeholder="e.g. BlueDart Express"
                className="bg-white/5 border-white/10 text-white text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white/80">Tracking Number</label>
              <Input
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="Tracking number"
                className="bg-white/5 border-white/10 text-white font-mono text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsStatusModalOpen(false)}
                className="text-white/60 hover:text-white text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                isLoading={updateStatusMutation.isPending}
                onClick={() =>
                  updateStatusMutation.mutate({
                    orderId: selectedOrder.id || selectedOrder._id,
                    state: newStatus,
                    carrier,
                    trackingNumber,
                  })
                }
                className="bg-primary hover:bg-primary-600 text-white text-xs font-bold"
              >
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
