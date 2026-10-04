import * as React from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cardsApi } from '@/features/cards/api/cards.api'
import { queryKeys } from '@/lib/query/queryKeys'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingScreen } from '@/components/common/LoadingScreen'
import { toast } from '@/stores/toastStore'
import {
  Package,
  Plus,
  Truck,
  ArrowLeft,
  Wifi,
  CreditCard,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  QrCode,
  Smartphone,
} from 'lucide-react'
import { NfcCardEditions, NFC_CARD_EDITIONS } from '@/components/cards/NfcCardEditions'
import type { CardOrder } from '@/types/cards.types'

declare global {
  interface Window {
    Razorpay?: any
  }
}

/**
 * Dynamically load Razorpay checkout script if not already present.
 */
function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.Razorpay) {
      return resolve(true)
    }
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

export default function OrdersPage() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const [isOrderModalOpen, setIsOrderModalOpen] = React.useState(false)
  const [isProcessingPayment, setIsProcessingPayment] = React.useState(false)

  // Test mode simulator modal state
  const [isSimulatorOpen, setIsSimulatorOpen] = React.useState(false)
  const [simulatorOrder, setSimulatorOrder] = React.useState<{
    order: CardOrder
    amount: number
    currency: string
    orderId: string
    razorpayOrderId?: string
    designTier: string
    editionName: string
    originalPrice: number
    discountAmount: number
    salePrice: number
  } | null>(null)

  // Order form state
  const [selectedEditionId, setSelectedEditionId] = React.useState<'pvc' | 'wooden' | 'metallic'>('pvc')
  const [fullName, setFullName] = React.useState(user?.displayName || '')
  const [line1, setLine1] = React.useState('')
  const [city, setCity] = React.useState('')
  const [stateName, setStateName] = React.useState('')
  const [postalCode, setPostalCode] = React.useState('')
  const [country, setCountry] = React.useState('India')
  const [phone, setPhone] = React.useState('')

  const activeEdition = NFC_CARD_EDITIONS.find((e) => e.id === selectedEditionId) || NFC_CARD_EDITIONS[0]

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.cards.orders,
    queryFn: () => cardsApi.listOrders(),
  })

  const orders = data?.data?.orders || []

  // Razorpay payment verification
  const handleVerifyPayment = async (
    orderId: string,
    paymentData: {
      razorpayOrderId?: string
      razorpayPaymentId: string
      razorpaySignature?: string
    },
  ) => {
    try {
      setIsProcessingPayment(true)
      await cardsApi.verifyPayment(orderId, paymentData)
      toast.success('Payment verified successfully! Your card order is now PAID.')
      setIsOrderModalOpen(false)
      setIsSimulatorOpen(false)
      queryClient.invalidateQueries({ queryKey: queryKeys.cards.orders })
    } catch (err: unknown) {
      const apiErr = err as { message?: string }
      toast.error(apiErr.message || 'Payment verification failed.')
    } finally {
      setIsProcessingPayment(false)
    }
  }

  // Launch Razorpay Checkout popup or Sandbox Test Simulator
  const launchRazorpayCheckout = async (
    order: CardOrder,
    razorpayOrder?: {
      id: string
      amount: number
      currency: string
      keyId?: string | null
      isConfigured?: boolean
      isTestMode?: boolean
    },
  ) => {
    const orderId = order.id || order._id
    const rzpOrderId = razorpayOrder?.id || order.razorpayOrderId
    let keyId = razorpayOrder?.keyId

    if (!keyId) {
      try {
        const configRes = await cardsApi.getPaymentConfig()
        keyId = configRes.data?.razorpayKeyId
      } catch (err) {
        console.warn('Failed to fetch payment config:', err)
      }
    }

    // Check if a real registered key is present in environment (starts with rzp_test_ or rzp_live_ and not dummy)
    const hasLiveOrRealTestKey = Boolean(
      keyId &&
      !keyId.includes('dummy') &&
      !keyId.includes('placeholder') &&
      (keyId.startsWith('rzp_test_') || keyId.startsWith('rzp_live_')) &&
      keyId.length > 15,
    )

    if (hasLiveOrRealTestKey) {
      const scriptLoaded = await loadRazorpayScript()
      if (scriptLoaded && window.Razorpay) {
        try {
          const rzp = new window.Razorpay({
            key: keyId,
            amount: razorpayOrder?.amount || activeEdition.salePrice * 100,
            currency: razorpayOrder?.currency || 'INR',
            name: 'OneWinq Smart NFC Cards',
            description: `${activeEdition.name} (₹100 Discount Applied)`,
            order_id: rzpOrderId?.startsWith('order_mock_') ? undefined : rzpOrderId,
            prefill: {
              name: fullName || user?.displayName || '',
              email: user?.email || '',
              contact: phone || '',
            },
            theme: {
              color: '#7C3AED',
            },
            handler: async (response: {
              razorpay_order_id?: string
              razorpay_payment_id: string
              razorpay_signature?: string
            }) => {
              await handleVerifyPayment(orderId, {
                razorpayOrderId: response.razorpay_order_id || rzpOrderId || undefined,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature || `sig_test_${Date.now()}`,
              })
            },
            modal: {
              ondismiss: () => {
                toast.info('Payment window closed. You can complete payment anytime from Order History.')
                setIsOrderModalOpen(false)
                queryClient.invalidateQueries({ queryKey: queryKeys.cards.orders })
              },
            },
          })

          rzp.on('payment.failed', (response: any) => {
            toast.error(`Payment failed: ${response?.error?.description || 'Transaction declined'}`)
          })

          rzp.open()
          return
        } catch (clientErr) {
          console.warn('Razorpay SDK modal error, switching to Test Sandbox Simulator:', clientErr)
        }
      }
    }

    // Open Test Sandbox Simulator Modal (active when real Razorpay keys are not yet configured in server/.env)
    const originalPrice = order.originalAmount ? order.originalAmount / 100 : activeEdition.originalPrice
    const discountAmount = order.discountAmount ? order.discountAmount / 100 : 100
    const salePrice = order.totalAmount ? order.totalAmount / 100 : (order.amount ? (order.amount > 5000 ? order.amount / 100 : order.amount) : activeEdition.salePrice)

    setSimulatorOrder({
      order,
      orderId,
      razorpayOrderId: rzpOrderId || `order_mock_${Date.now()}`,
      amount: salePrice,
      currency: order.currency || 'INR',
      designTier: order.designTier || activeEdition.designTier,
      editionName: activeEdition.name,
      originalPrice,
      discountAmount,
      salePrice,
    })

    setIsOrderModalOpen(false)
    setIsSimulatorOpen(true)
  }

  // Order creation mutation
  const createOrderMutation = useMutation({
    mutationFn: () => {
      return cardsApi.createOrder({
        cardType: activeEdition.cardType,
        designTier: activeEdition.designTier,
        currency: activeEdition.currency,
        quantity: 1,
        shippingAddress: {
          recipientName: fullName,
          fullName,
          addressLine1: line1,
          line1,
          city,
          state: stateName,
          postalCode,
          country,
          phone,
        },
      })
    },
    onSuccess: async (res) => {
      const order = res.data.order
      const razorpayOrder = res.data.razorpayOrder
      toast.success(`Order created! Opening Razorpay Test Mode checkout for ₹${activeEdition.salePrice}...`)
      await launchRazorpayCheckout(order, razorpayOrder)
    },
    onError: (err: unknown) => {
      const apiErr = err as { message?: string }
      toast.error(apiErr.message || 'Failed to place order')
    },
  })

  // Cancel order mutation (only allowed while order is in CREATED / Payment Pending state)
  const cancelOrderMutation = useMutation({
    mutationFn: (orderId: string) => cardsApi.cancelOrder(orderId),
    onSuccess: () => {
      toast.success('Order has been cancelled successfully.')
      queryClient.invalidateQueries({ queryKey: queryKeys.cards.orders })
    },
    onError: (err: unknown) => {
      const apiErr = err as { message?: string }
      toast.error(apiErr.message || 'Failed to cancel order.')
    },
  })

  // Pay existing unpaid order
  const handlePayExistingOrder = async (order: CardOrder) => {
    const rawAmt = order.amount ?? order.totalAmount ?? 0
    const amtInPaise = rawAmt > 5000 ? rawAmt : rawAmt * 100
    await launchRazorpayCheckout(order, {
      id: order.razorpayOrderId || `order_mock_${Date.now()}`,
      amount: amtInPaise,
      currency: order.currency || 'INR',
      keyId: null,
      isConfigured: false,
      isTestMode: true,
    })
  }

  if (isLoading) {
    return <LoadingScreen message="Loading your orders..." />
  }

  return (
    <div className="space-y-6 text-left max-w-5xl mx-auto pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-0.5">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Order NFC Cards
          </h1>
          <p className="text-xs text-muted-foreground">
            Custom physical NFC smart cards linked directly to your digital profile.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link to="/app/cards">
            <Button size="sm" variant="outline" leftIcon={<ArrowLeft className="h-4 w-4" />}>
              Manage Cards
            </Button>
          </Link>
          <Button
            onClick={() => setIsOrderModalOpen(true)}
            size="sm"
            leftIcon={<Plus className="h-4 w-4" />}
          >
            Order Card
          </Button>
        </div>
      </div>

      {/* Editions Showcase with ₹100 discount tags */}
      <section className="space-y-4">
        <NfcCardEditions
          selectedEditionId={selectedEditionId}
          onSelectEdition={(edition) => {
            setSelectedEditionId(edition.id)
            setIsOrderModalOpen(true)
          }}
          showOrderAction={true}
        />
      </section>

      {/* Orders List */}
      <section className="space-y-6 pt-4 border-t border-border">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            <span>Order History</span>
          </h2>
          {orders.length > 0 && (
            <Badge variant="subtle" className="font-mono text-xs">
              {orders.length} {orders.length === 1 ? 'Order' : 'Orders'}
            </Badge>
          )}
        </div>

        {orders.length === 0 ? (
          <EmptyState
            icon={<Package className="h-8 w-8" />}
            title="No orders yet"
            description="Choose a PVC, Wooden, or Metallic NFC Card above with ₹100 discount applied to start your order."
            actionLabel="Order Your Card Now"
            onAction={() => setIsOrderModalOpen(true)}
          />
        ) : (
          <div className="space-y-4">
            {orders.map((order: any) => {
              const oId = order._id || order.id
              const isINR = (order.currency || 'INR') === 'INR'
              const symbol = isINR ? '₹' : (order.currency || '₹')
              const rawAmt = order.amount ?? order.totalAmount ?? 0
              const displayAmt = rawAmt > 5000 ? Math.round(rawAmt / 100) : rawAmt
              const isPaid = ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'].includes(order.state)
              const isCreatedPending = order.state === 'CREATED'
              const isCancelled = order.state === 'CANCELLED'

              const statusMeta: Record<
                string,
                { label: string; badgeClass: string; icon: React.ReactNode }
              > = {
                CREATED: {
                  label: 'Payment Pending',
                  badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
                  icon: <AlertCircle className="h-3.5 w-3.5" />,
                },
                PAID: {
                  label: 'Order Confirmed',
                  badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
                  icon: <CheckCircle2 className="h-3.5 w-3.5" />,
                },
                PROCESSING: {
                  label: 'In Production',
                  badgeClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
                  icon: <Package className="h-3.5 w-3.5" />,
                },
                SHIPPED: {
                  label: 'Dispatched & In Transit',
                  badgeClass: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
                  icon: <Truck className="h-3.5 w-3.5" />,
                },
                DELIVERED: {
                  label: 'Delivered',
                  badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
                  icon: <CheckCircle2 className="h-3.5 w-3.5" />,
                },
                CANCELLED: {
                  label: 'Order Cancelled',
                  badgeClass: 'bg-zinc-500/10 text-zinc-500 dark:text-zinc-400 border-zinc-500/20',
                  icon: <AlertCircle className="h-3.5 w-3.5" />,
                },
              }

              const currentStatus = statusMeta[order.state] || {
                label: order.state,
                badgeClass: 'bg-muted text-muted-foreground border-border',
                icon: <Package className="h-3.5 w-3.5" />,
              }

              const tierNameMap: Record<string, string> = {
                PVC: 'PVC Card',
                WOODEN: 'Wooden Card',
                METALLIC: 'Metallic Card',
                pvc: 'PVC Card',
                wooden: 'Wooden Card',
                metallic: 'Metallic Card',
                MATTE_BLACK: 'Matte Black Card',
                CLASSIC_PURPLE: 'Classic Purple Card',
                METALLIC_WHITE: 'Metallic White Card',
                TITANIUM: 'Metallic Titanium Card',
              }

              const displayTier = tierNameMap[order.designTier] || order.designTier || 'OneWinq Smart Card'

              return (
                <div
                  key={oId}
                  className="p-6 rounded-3xl border border-border bg-card shadow-sm space-y-4 text-left"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
                    <div>
                      <div className="text-xs font-mono text-muted-foreground">
                        ORDER ID: {order.orderNumber || oId}
                      </div>
                      <h3 className="text-base font-bold text-foreground mt-0.5">
                        {displayTier} — Quantity {order.quantity || 1}
                      </h3>
                      {order.discountAmount ? (
                        <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 mt-0.5">
                          <span>Includes ₹{(order.discountAmount / 100).toLocaleString('en-IN')} promotional discount</span>
                        </div>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold border ${currentStatus.badgeClass}`}>
                        {currentStatus.icon}
                        {currentStatus.label}
                      </span>

                      <span className="text-base font-black text-foreground">
                        {symbol}{displayAmt.toLocaleString('en-IN')}
                      </span>

                      {/* Pay Now Button (Only shown while Payment Pending) */}
                      {isCreatedPending && (
                        <Button
                          size="sm"
                          className="h-8 text-xs font-bold bg-primary hover:bg-primary/90"
                          leftIcon={<CreditCard className="h-3.5 w-3.5" />}
                          onClick={() => handlePayExistingOrder(order)}
                          isLoading={isProcessingPayment}
                        >
                          Pay with Razorpay
                        </Button>
                      )}

                      {/* Cancel Order Button */}
                      {!isCancelled && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!isCreatedPending || cancelOrderMutation.isPending}
                          isLoading={cancelOrderMutation.isPending && cancelOrderMutation.variables === oId}
                          onClick={() => {
                            if (window.confirm('Are you sure you want to cancel this order?')) {
                              cancelOrderMutation.mutate(oId)
                            }
                          }}
                          className={`h-8 text-xs font-semibold ${isCreatedPending
                              ? 'border-rose-500/40 text-rose-600 hover:bg-rose-500/10 dark:text-rose-400'
                              : 'opacity-50 cursor-not-allowed'
                            }`}
                          title={
                            isCreatedPending
                              ? 'Cancel this order'
                              : 'Order is confirmed and in production. Cancellation disabled.'
                          }
                        >
                          {isCreatedPending ? 'Cancel Order' : 'Cancel '}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Delivery Stepper */}
                  {!isCancelled && (
                    <div className="py-2 px-1">
                      <div className="grid grid-cols-4 gap-2 text-center text-[10px] sm:text-[11px]">
                        {/* Step 1: Order Placed */}
                        <div className="space-y-1">
                          <div className="h-1.5 w-full rounded-full bg-primary" />
                          <span className="font-bold text-foreground block">1. Order Placed</span>
                        </div>

                        {/* Step 2: In Production */}
                        <div className="space-y-1">
                          <div
                            className={`h-1.5 w-full rounded-full ${isPaid ? 'bg-primary' : 'bg-muted'
                              }`}
                          />
                          <span
                            className={`font-semibold block ${isPaid ? 'text-foreground font-bold' : 'text-muted-foreground'
                              }`}
                          >
                            2. In Production
                          </span>
                        </div>

                        {/* Step 3: Dispatched */}
                        <div className="space-y-1">
                          <div
                            className={`h-1.5 w-full rounded-full ${['SHIPPED', 'DELIVERED'].includes(order.state)
                                ? 'bg-primary'
                                : 'bg-muted'
                              }`}
                          />
                          <span
                            className={`font-semibold block ${['SHIPPED', 'DELIVERED'].includes(order.state)
                                ? 'text-foreground font-bold'
                                : 'text-muted-foreground'
                              }`}
                          >
                            3. Dispatched
                          </span>
                        </div>

                        {/* Step 4: Delivered */}
                        <div className="space-y-1">
                          <div
                            className={`h-1.5 w-full rounded-full ${order.state === 'DELIVERED' ? 'bg-primary' : 'bg-muted'
                              }`}
                          />
                          <span
                            className={`font-semibold block ${order.state === 'DELIVERED' ? 'text-foreground font-bold' : 'text-muted-foreground'
                              }`}
                          >
                            4. Delivered
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Linked Physical NFC Card Banner */}
                  {order.assignedCardUids && order.assignedCardUids.length > 0 && (
                    <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                          <Wifi className="h-4 w-4 animate-pulse" />
                        </div>
                        <div>
                          <span className="font-bold text-foreground block">
                            Physical Smart Card Bound & Activated:
                          </span>
                          <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                            {order.assignedCardUids.join(', ')}
                          </span>
                        </div>
                      </div>
                      <Link to="/app/cards">
                        <Button size="sm" variant="outline" className="text-xs h-7 border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                          View in My Cards
                        </Button>
                      </Link>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-muted-foreground pt-1">
                    <div>
                      <span className="font-semibold text-foreground">Shipping To:</span>
                      <div className="mt-0.5">
                        {order.shippingAddress?.fullName || order.shippingAddress?.recipientName}
                        <br />
                        {order.shippingAddress?.line1 || order.shippingAddress?.addressLine1}
                        {order.shippingAddress?.city && `, ${order.shippingAddress.city}`}
                        <br />
                        {order.shippingAddress?.state || order.shippingAddress?.stateName}{' '}
                        {order.shippingAddress?.postalCode},{' '}
                        {order.shippingAddress?.country}
                      </div>
                    </div>

                    <div className="space-y-1">
                      {order.razorpayPaymentId && (
                        <div>
                          <span className="font-semibold text-foreground">Razorpay Payment ID:</span>
                          <div className="font-mono text-xs text-muted-foreground truncate">
                            {order.razorpayPaymentId}
                          </div>
                        </div>
                      )}

                      {order.trackingNumber && (
                        <div>
                          <span className="font-semibold text-foreground">Courier Tracking:</span>
                          <div className="mt-0.5 font-mono text-primary flex items-center gap-1.5 font-bold">
                            <Truck className="h-4 w-4" />
                            <span>{order.carrier || 'Courier'}: {order.trackingNumber}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Order Modal with ₹100 Discount */}
      <Dialog open={isOrderModalOpen} onOpenChange={setIsOrderModalOpen}>
        <DialogHeader>
          <DialogTitle>Order Physical OneWinq Card</DialogTitle>
          <DialogDescription>
            Select your preferred material edition and complete checkout via Razorpay Test Mode.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2 max-h-[60vh] overflow-y-auto custom-scrollbar pr-1">
          {/* Card Edition Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Select Hardware Edition
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {NFC_CARD_EDITIONS.map((ed) => (
                <button
                  key={ed.id}
                  type="button"
                  onClick={() => setSelectedEditionId(ed.id)}
                  className={`p-3 rounded-2xl border text-left transition-all ${selectedEditionId === ed.id
                      ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                      : 'border-border bg-card hover:border-border/80'
                    }`}
                >
                  <div className="text-xs font-bold text-foreground truncate">{ed.name}</div>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-xs font-black text-primary">
                      ₹{ed.salePrice.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[10px] text-muted-foreground line-through opacity-70">
                      ₹{ed.originalPrice.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">
                    ₹100 OFF
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Pricing & Discount Breakdown Card */}
          <div className="p-4 rounded-2xl bg-muted/40 border border-border space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{activeEdition.name} Base Price:</span>
              <span className="font-semibold text-foreground">₹{activeEdition.originalPrice.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
              <span className="font-medium flex items-center gap-1">
                Promotional Card Discount:
              </span>
              <span className="font-bold">-₹100</span>
            </div>
            <div className="pt-2 border-t border-border flex items-center justify-between text-sm">
              <span className="font-extrabold text-foreground">Total Payable Amount:</span>
              <span className="font-black text-primary text-base">₹{activeEdition.salePrice.toLocaleString('en-IN')}</span>
            </div>
            <div className="pt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              <span>Razorpay Test Mode Active • No real money charged</span>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Full Name</label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Siddharth Rao"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Street Address</label>
            <Input
              value={line1}
              onChange={(e) => setLine1(e.target.value)}
              placeholder="Apartment / Street / Suite"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">City</label>
              <Input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">State / Region</label>
              <Input
                value={stateName}
                onChange={(e) => setStateName(e.target.value)}
                placeholder="State"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Postal Code</label>
              <Input
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                placeholder="Postal / PIN Code"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Country</label>
              <Input
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="Country"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Contact Phone</label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone number for courier delivery & updates"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOrderModalOpen(false)}>
            Cancel
          </Button>
          <Button
            isLoading={createOrderMutation.isPending || isProcessingPayment}
            disabled={!fullName || !line1 || !city || !postalCode}
            onClick={() => createOrderMutation.mutate()}
            leftIcon={<CreditCard className="h-4 w-4" />}
          >
            Pay with Razorpay (₹{activeEdition.salePrice.toLocaleString('en-IN')})
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Razorpay Test Mode Sandbox Simulator Modal */}
      <Dialog open={isSimulatorOpen} onOpenChange={setIsSimulatorOpen}>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <CreditCard className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-extrabold flex items-center gap-2">
                <span>Razorpay Checkout</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  Test Mode Sandbox
                </span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Simulated Razorpay gateway payment environment.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {simulatorOrder && (
          <div className="space-y-4 pt-2 text-xs">
            {/* Order & Discount Summary */}
            <div className="p-4 rounded-2xl bg-card border border-border space-y-2.5">
              <div className="flex items-center justify-between font-bold text-foreground">
                <span>{simulatorOrder.editionName} Smart NFC Card</span>
                <span className="font-mono text-xs">{simulatorOrder.designTier}</span>
              </div>

              <div className="flex items-center justify-between text-muted-foreground">
                <span>Original Price</span>
                <span>₹{simulatorOrder.originalPrice.toLocaleString('en-IN')}</span>
              </div>

              <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                <span className="flex items-center gap-1">
                  Account Card Discount
                </span>
                <span>-₹{simulatorOrder.discountAmount.toLocaleString('en-IN')}</span>
              </div>

              <div className="pt-2 border-t border-border flex items-center justify-between text-sm">
                <span className="font-extrabold text-foreground">Net Payable</span>
                <span className="text-lg font-black text-primary">
                  ₹{simulatorOrder.salePrice.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Test Payment Methods */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Select Test Payment Method
              </label>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-2xl border border-primary/40 bg-primary/5 flex items-center gap-2.5">
                  <Smartphone className="h-4 w-4 text-primary" />
                  <div>
                    <div className="font-bold text-foreground text-xs">Test UPI / QR</div>
                    <div className="text-[10px] text-muted-foreground">Instant approval</div>
                  </div>
                </div>

                <div className="p-3 rounded-2xl border border-border bg-card flex items-center gap-2.5">
                  <QrCode className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-bold text-foreground text-xs">Test Cards / Netbanking</div>
                    <div className="text-[10px] text-muted-foreground">Mock gateway</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Test Notice */}
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 flex items-start gap-2 text-[11px]">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
              <span>
                Razorpay Test Mode is active. Clicking <strong>Authorize Test Payment</strong> will simulate an approved transaction ID and instantly transition your order to <strong>PAID</strong>.
              </span>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => {
              setIsSimulatorOpen(false)
              toast.info('Test payment was cancelled.')
              queryClient.invalidateQueries({ queryKey: queryKeys.cards.orders })
            }}
          >
            Cancel
          </Button>

          <Button
            variant="default"
            isLoading={isProcessingPayment}
            onClick={() => {
              if (!simulatorOrder) return
              const testPaymentId = `pay_test_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
              handleVerifyPayment(simulatorOrder.orderId, {
                razorpayOrderId: simulatorOrder.razorpayOrderId,
                razorpayPaymentId: testPaymentId,
                razorpaySignature: `sig_test_${Date.now()}`,
              })
            }}
            leftIcon={<ShieldCheck className="h-4 w-4" />}
          >
            Authorize Test Payment (₹{simulatorOrder?.salePrice.toLocaleString('en-IN')})
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
