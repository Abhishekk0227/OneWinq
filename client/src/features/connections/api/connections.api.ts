import { apiClient } from '@/lib/api/client'
import type { ApiResponse } from '@/types/api.types'
import type { ConnectionItem, ConnectionUserSummary } from '@/types/networking.types'

export const connectionsApi = {
  getConnections: (params?: { page?: number; limit?: number }) =>
    apiClient.get<never, ApiResponse<{ connections: ConnectionItem[]; total?: number }>>(
      '/connections',
      { params }
    ),

  getPendingRequests: (direction: 'incoming' | 'outgoing' = 'incoming') =>
    apiClient.get<never, ApiResponse<{ requests: ConnectionItem[] }>>('/connections/pending', {
      params: { direction, type: direction },
    }),

  getBlockedUsers: () =>
    apiClient.get<never, ApiResponse<{ blockedUsers: ConnectionUserSummary[] }>>('/connections/blocks'),

  getMutualConnections: (targetUserId: string) =>
    apiClient.get<never, ApiResponse<{ mutualConnections: ConnectionUserSummary[] }>>(
      `/connections/mutual/${targetUserId}`
    ),

  sendRequest: (targetUserId: string, note?: string) =>
    apiClient.post<never, ApiResponse<{ connection: ConnectionItem }>>('/connections/request', {
      targetUserId,
      recipientId: targetUserId,
      note,
    }),

  acceptRequest: (connectionId: string) =>
    apiClient.post<never, ApiResponse<{ connection: ConnectionItem }>>(
      `/connections/${connectionId}/accept`,
      {}
    ),

  rejectRequest: (connectionId: string) =>
    apiClient.post<never, ApiResponse<null>>(`/connections/${connectionId}/reject`, {}),

  withdrawRequest: (connectionId: string) =>
    apiClient.post<never, ApiResponse<null>>(`/connections/${connectionId}/withdraw`, {}),

  removeConnection: (targetUserId: string) =>
    apiClient.delete<never, ApiResponse<null>>(`/connections/${targetUserId}`),

  blockUser: (targetUserId: string) =>
    apiClient.post<never, ApiResponse<null>>(`/connections/block/${targetUserId}`, {}),

  unblockUser: (targetUserId: string) =>
    apiClient.delete<never, ApiResponse<null>>(`/connections/block/${targetUserId}`),
}
