import { apiClient } from '@/lib/api/client'
import type { ApiResponse } from '@/types/api.types'
import type { SubscriptionPlan, UserSubscription } from '@/types/subscriptions.types'

export const settingsApi = {
  // Privacy & GDPR
  requestDataExport: () =>
    apiClient.post<never, ApiResponse<{ exportId?: string; message: string }>>('/privacy/export', {}),

  getLatestExport: () =>
    apiClient.get<never, ApiResponse<{ exportUrl?: string; status: string; requestedAt: string }>>('/privacy/export/latest'),

  updatePrivacySettings: (payload: { appearInDiscovery?: boolean; connectionRequestVisibility?: 'EVERYONE' | 'NOBODY' }) =>
    apiClient.patch<never, ApiResponse<{ user: unknown }>>('/users/me/privacy', payload),

  requestEmailChange: (newEmail: string) =>
    apiClient.post<never, ApiResponse<{ message: string }>>('/auth/email/change-request', { newEmail }),

  verifyEmailChange: (newEmail: string, otp: string) =>
    apiClient.post<never, ApiResponse<{ message: string }>>('/auth/email/change-verify', { newEmail, otp }),

  deactivateAccount: () =>
    apiClient.post<never, ApiResponse<{ message: string }>>('/privacy/deactivate', {}),

  reactivateAccount: () =>
    apiClient.post<never, ApiResponse<{ message: string }>>('/privacy/reactivate', {}),

  deleteAccount: (payload: { reason?: string; confirmPassword?: string }) =>
    apiClient.post<never, ApiResponse<{ message: string; scheduledDeletionDate: string }>>(
      '/privacy/delete-account',
      payload
    ),

  restoreAccount: () =>
    apiClient.post<never, ApiResponse<{ message: string }>>('/privacy/restore-account', {}),

  // Subscriptions & Plans
  getPlans: () =>
    apiClient.get<never, ApiResponse<{ plans: SubscriptionPlan[] }>>('/subscriptions/plans'),

  getMySubscription: () =>
    apiClient.get<never, ApiResponse<{ subscription: UserSubscription }>>('/subscriptions/me'),

  createCheckout: (planTier: string, billingCycle: 'MONTHLY' | 'YEARLY') =>
    apiClient.post<never, ApiResponse<{ checkoutUrl?: string; orderId?: string }>>('/subscriptions/checkout', {
      planTier,
      billingCycle,
    }),

  cancelSubscription: () =>
    apiClient.post<never, ApiResponse<{ message: string }>>('/subscriptions/cancel', {}),

  resumeSubscription: () =>
    apiClient.post<never, ApiResponse<{ message: string }>>('/subscriptions/resume', {}),
}
