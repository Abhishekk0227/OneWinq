import { apiClient } from '@/lib/api/client'
import type { ApiResponse } from '@/types/api.types'
import type { AnalyticsOverview, ProfileAnalyticsData } from '@/types/analytics.types'

export const analyticsApi = {
  trackLinkClick: (payload: { profileUserId?: string; targetUserId?: string; organizationId?: string; linkUrl: string; label?: string }) =>
    apiClient.post<never, ApiResponse<null>>('/analytics/events/link-click', payload),

  getOverview: (range: '7d' | '30d' | '90d' = '30d') =>
    apiClient.get<never, ApiResponse<{ overview: AnalyticsOverview }>>('/analytics/overview', {
      params: { range },
    }),

  getProfileAnalytics: (range: '7d' | '30d' | '90d' = '30d') =>
    apiClient.get<never, ApiResponse<{ analytics: ProfileAnalyticsData }>>('/analytics/profile', {
      params: { range },
    }),

  getOrganizationAnalytics: (organizationId: string, range: '7d' | '30d' | '90d' = '30d') =>
    apiClient.get<never, ApiResponse<{
      period: string;
      overview: AnalyticsOverview;
      timeSeries: Array<{ date: string; views: number; nfcTaps: number; qrScans: number; clicks: number }>;
      deviceBreakdown: { mobile: number; desktop: number; tablet: number };
      topLinks: Array<{ url: string; label: string; count: number }>;
    }>>(`/analytics/organization/${organizationId}`, {
      params: { range },
    }),

  getCardAnalytics: (cardUid: string, range: '7d' | '30d' | '90d' = '30d') =>
    apiClient.get<never, ApiResponse<{ analytics: unknown }>>(`/analytics/cards/${cardUid}`, {
      params: { range },
    }),
}
