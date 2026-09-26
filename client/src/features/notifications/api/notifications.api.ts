import { apiClient } from '@/lib/api/client'
import type { ApiResponse } from '@/types/api.types'
import type { NotificationItemData, NotificationPreferences } from '@/types/notifications.types'

export const notificationsApi = {
  list: (params?: { page?: number; limit?: number }) =>
    apiClient.get<never, ApiResponse<{ notifications: NotificationItemData[]; total?: number }>>(
      '/notifications',
      { params }
    ),

  getUnreadCount: () =>
    apiClient.get<never, ApiResponse<{ count: number; unreadCount?: number }>>('/notifications/unread-count'),

  markAllAsRead: () =>
    apiClient.post<never, ApiResponse<null>>('/notifications/read-all', {}),

  markAsRead: (id: string) =>
    apiClient.patch<never, ApiResponse<{ notification: NotificationItemData }>>(
      `/notifications/${id}/read`,
      {}
    ),

  getPreferences: () =>
    apiClient.get<never, ApiResponse<{ preferences: NotificationPreferences }>>('/notifications/preferences'),

  updatePreferences: (preferences: Partial<NotificationPreferences>) =>
    apiClient.patch<never, ApiResponse<{ preferences: NotificationPreferences }>>(
      '/notifications/preferences',
      preferences
    ),
}
