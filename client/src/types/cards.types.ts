import type { CardState, OrderState } from '@/constants/app.constants'

export interface OneWinqCard {
  _id: string
  id?: string
  cardId?: string
  cardCode?: string
  cardUid: string
  url?: string
  nfcUid?: string | null
  userId: string
  assignedUser?: string
  assignedTo?: string
  firstAssignedTo?: string | null
  firstAssignedAt?: string | null
  everAssigned?: boolean
  state: CardState
  status?: CardState
  designTier: 'PVC' | 'WOODEN' | 'METALLIC' | 'MATTE_BLACK' | 'CLASSIC_PURPLE' | 'METALLIC_WHITE' | 'TITANIUM' | string
  edition?: string
  material?: string
  label?: string
  nickname?: string | null
  customSlug?: string | null
  tapCount?: number
  qrScanCount?: number
  lastTappedAt?: string | null
  lastScannedAt?: string | null
  modeOverride?: string | null
  activatedAt?: string | null
  assignedAt?: string | null
  createdAt: string
  updatedAt: string
}

export interface CardOrder {
  _id: string
  id?: string
  orderNumber?: string
  userId: string
  cardType: string
  designTier: string
  quantity: number
  amount: number
  totalAmount?: number
  originalAmount?: number
  discountAmount?: number
  currency: string
  paymentGateway?: string
  razorpayOrderId?: string | null
  razorpayPaymentId?: string | null
  paymentVerifiedAt?: string | null
  state: OrderState
  shippingAddress: {
    fullName?: string
    recipientName?: string
    line1?: string
    addressLine1?: string
    line2?: string
    addressLine2?: string
    city: string
    state?: string
    postalCode: string
    country: string
    phone?: string
  }
  assignedCardUids?: string[]
  carrier?: string
  trackingNumber?: string
  createdAt: string
  updatedAt: string
}
