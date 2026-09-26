import { apiClient } from '@/lib/api/client'
import type { ApiResponse } from '@/types/api.types'

export interface SubmitReportPayload {
  reportedUser?: string
  targetType: 'USER' | 'PROFILE' | 'MESSAGE' | 'CARD'
  targetId: string
  reason: string
  description?: string
  evidenceMedia?: string[]
}

export const moderationApi = {
  submitReport: (payload: SubmitReportPayload) =>
    apiClient.post<never, ApiResponse<{ report: any }>>('/reports', payload),

  getMyReports: () =>
    apiClient.get<never, ApiResponse<{ reports: any[] }>>('/reports/me'),
}
