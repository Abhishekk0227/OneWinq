import { apiClient } from '@/lib/api/client'
import type { ApiResponse } from '@/types/api.types'
import type { OneWinqCard, CardOrder } from '@/types/cards.types'

export const cardsApi = {
  listCards: () =>
    apiClient.get<never, ApiResponse<{ cards: OneWinqCard[] }>>('/cards'),

  resolveTap: (cardUid: string) =>
    apiClient.get<
      never,
      ApiResponse<{
        cardUid: string
        username: string
        displayName: string
        redirectUrl: string
        customSlug?: string | null
      }>
    >(`/cards/tap/${cardUid}`),

  resolveScan: (cardUid: string) =>
    apiClient.get<
      never,
      ApiResponse<{
        cardUid: string
        username: string
        displayName: string
        redirectUrl: string
        customSlug?: string | null
      }>
    >(`/cards/scan/${cardUid}`),

  getCardDetails: (cardUid: string) =>
    apiClient.get<never, ApiResponse<{ card: OneWinqCard }>>(`/cards/${cardUid}`),

  activateCard: (payload: { cardCode?: string; cardUid?: string; activationCode: string; label?: string; nickname?: string }) =>
    apiClient.post<never, ApiResponse<{ card: OneWinqCard }>>('/cards/activate', payload),

  updateSettings: (cardUid: string, payload: { label?: string; nickname?: string; modeOverride?: string | null; customSlug?: string | null }) =>
    apiClient.patch<never, ApiResponse<{ card: OneWinqCard }>>(`/cards/${cardUid}`, payload),

  updateCardState: (cardUid: string, state: 'ACTIVE' | 'BLOCKED' | 'LOST') =>
    apiClient.patch<never, ApiResponse<{ card: OneWinqCard }>>(`/cards/${cardUid}/state`, { state }),

  // Hardware Orders
  createOrder: (payload: {
    cardType: string
    designTier?: string
    currency?: string
    quantity?: number
    shippingAddress: {
      recipientName?: string
      fullName?: string
      addressLine1?: string
      line1?: string
      addressLine2?: string
      line2?: string
      city: string
      state?: string
      stateName?: string
      postalCode: string
      country: string
      phone?: string
    }
  }) =>
    apiClient.post<
      never,
      ApiResponse<{
        order: CardOrder
        razorpayOrder?: {
          id: string
          amount: number
          currency: string
          keyId: string
          receipt?: string
          isTestMode?: boolean
        }
      }>
    >('/orders', {
      currency: payload.currency || 'INR',
      designTier: payload.designTier || payload.cardType?.toUpperCase(),
      items: [
        {
          cardType: payload.cardType.toLowerCase(),
          quantity: payload.quantity || 1,
        },
      ],
      shippingAddress: {
        recipientName: payload.shippingAddress.recipientName || payload.shippingAddress.fullName || '',
        addressLine1: payload.shippingAddress.addressLine1 || payload.shippingAddress.line1 || '',
        addressLine2: payload.shippingAddress.addressLine2 || payload.shippingAddress.line2 || '',
        city: payload.shippingAddress.city,
        state: payload.shippingAddress.state || payload.shippingAddress.stateName || '',
        postalCode: payload.shippingAddress.postalCode,
        country: payload.shippingAddress.country,
        phone: payload.shippingAddress.phone || '',
      },
    }),

  verifyPayment: (
    orderId: string,
    payload: {
      razorpayOrderId?: string
      razorpayPaymentId: string
      razorpaySignature?: string
    },
  ) =>
    apiClient.post<never, ApiResponse<{ order: CardOrder }>>(
      `/orders/${orderId}/verify-payment`,
      payload,
    ),

  getPaymentConfig: () =>
    apiClient.get<
      never,
      ApiResponse<{
        razorpayKeyId: string
        isConfigured: boolean
        isTestMode: boolean
        currency: string
      }>
    >('/payments/config'),

  verifyModularPayment: (payload: {
    razorpayOrderId: string
    razorpayPaymentId: string
    razorpaySignature: string
    purpose?: 'CARD_PURCHASE' | 'MEMBERSHIP' | 'TEMPLATE_PURCHASE' | string
    orderId?: string
    metadata?: Record<string, any>
  }) => apiClient.post<never, ApiResponse<any>>('/payments/verify', payload),

  listOrders: () =>
    apiClient.get<never, ApiResponse<{ orders: CardOrder[] }>>('/orders'),

  getOrder: (id: string) =>
    apiClient.get<never, ApiResponse<{ order: CardOrder }>>(`/orders/${id}`),
}
