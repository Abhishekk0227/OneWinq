import { apiClient } from '@/lib/api/client'
import type { ApiResponse } from '@/types/api.types'
import type { AnalyticsOverview, ProfileAnalyticsData } from '@/types/analytics.types'

export const analyticsApi = {
  trackLinkClick: (payload: { profileUserId: string; linkUrl: string; label?: string }) =>
    apiClient.post<never, ApiResponse<null>>('/analytics/events/link-click', payload),

  getOverview: (range: '7d' | '30d' | '90d' = '30d') =>
    apiClient.get<never, ApiResponse<{ overview: AnalyticsOverview }>>('/analytics/overview', {
      params: { range },
    }),

  getProfileAnalytics: (range: '7d' | '30d' | '90d' = '30d') =>
    apiClient.get<never, ApiResponse<{ analytics: ProfileAnalyticsData }>>('/analytics/profile', {
      params: { range },
    }),

  getCardAnalytics: (cardUid: string, range: '7d' | '30d' | '90d' = '30d') =>
    apiClient.get<never, ApiResponse<{ analytics: unknown }>>(`/analytics/cards/${cardUid}`, {
      params: { range },
    }),
}
