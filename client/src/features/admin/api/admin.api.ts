import { apiClient } from '@/lib/api/client'
import type { ApiResponse } from '@/types/api.types'
import type { AdminMetrics, AdminUserListItem, AuditLogItem } from '@/types/admin.types'

export const adminApi = {
  getMetrics: () =>
    apiClient.get<never, ApiResponse<{ metrics: AdminMetrics }>>('/admin/metrics'),

  listUsers: (params?: { page?: number; limit?: number; search?: string; status?: string; q?: string }) =>
    apiClient.get<never, ApiResponse<{ users: AdminUserListItem[]; total: number }>>('/admin/users', {
      params,
    }),

  updateUserStatus: (id: string, status: string, reason = 'Admin action') =>
    apiClient.patch<never, ApiResponse<{ user: AdminUserListItem }>>(`/admin/users/${id}/status`, {
      status,
      reason,
    }),

  updateUserRole: (id: string, role: string) =>
    apiClient.patch<never, ApiResponse<{ user: AdminUserListItem }>>(`/admin/users/${id}/role`, {
      role,
    }),

  createCardBatch: (payload: { batchNumber: string; cardType: 'pvc' | 'metal' | 'bamboo'; totalCards: number }) =>
    apiClient.post<never, ApiResponse<{ batch: any; cardsGenerated: number }>>('/admin/batches', payload),

  getAuditLogs: (params?: { page?: number; limit?: number; action?: string }) =>
    apiClient.get<never, ApiResponse<{ auditLogs: AuditLogItem[]; total: number }>>('/admin/audit-logs', {
      params,
    }),

  listReports: (params?: { status?: string; targetType?: string; limit?: number }) =>
    apiClient.get<never, ApiResponse<{ reports: any[] }>>('/admin/reports', { params }),

  resolveReport: (id: string, payload: { status: 'RESOLVED' | 'DISMISSED'; adminNotes?: string; actionTaken?: string }) =>
    apiClient.patch<never, ApiResponse<{ report: any }>>(`/admin/reports/${id}`, payload),

  listTickets: (params?: { status?: string; priority?: string; limit?: number }) =>
    apiClient.get<never, ApiResponse<{ tickets: any[] }>>('/admin/support/tickets', { params }),

  updateTicket: (id: string, payload: { status?: string; assignedTo?: string; internalNote?: string; replyText?: string }) =>
    apiClient.patch<never, ApiResponse<{ ticket: any }>>(`/admin/support/tickets/${id}`, payload),

  // Profile Templates Admin
  listTemplates: () =>
    apiClient.get<never, ApiResponse<{ templates: import('@/types/profile.types').ProfileTemplate[] }>>('/admin/templates'),

  createTemplate: (payload: any) =>
    apiClient.post<never, ApiResponse<{ template: import('@/types/profile.types').ProfileTemplate }>>('/admin/templates', payload),

  updateTemplate: (id: string, payload: any) =>
    apiClient.patch<never, ApiResponse<{ template: import('@/types/profile.types').ProfileTemplate }>>(`/admin/templates/${id}`, payload),

  toggleTemplateLock: (id: string, isLocked: boolean) =>
    apiClient.patch<never, ApiResponse<{ template: import('@/types/profile.types').ProfileTemplate }>>(
      `/admin/templates/${id}/lock`,
      { isLocked }
    ),

  bulkLockTemplates: (isLocked: boolean, templateIds?: string[]) =>
    apiClient.post<never, ApiResponse<{ modifiedCount: number; isLocked: boolean; message: string }>>(
      '/admin/templates/bulk-lock',
      { isLocked, templateIds }
    ),

  deleteTemplate: (id: string) =>
    apiClient.delete<never, ApiResponse<{ message: string }>>(`/admin/templates/${id}`),

  listCards: (params?: { page?: number; limit?: number; status?: string; search?: string }) =>
    apiClient.get<never, ApiResponse<{ cards: any[]; stats: any; total: number; page: number; limit: number }>>('/admin/cards', { params }),

  getCardStats: () =>
    apiClient.get<never, ApiResponse<{ stats: { total: number; active: number; unassigned: number; inactive: number; blocked: number } }>>('/admin/cards/stats'),

  getCardDetails: (cardCode: string) =>
    apiClient.get<never, ApiResponse<{ card: any; auditLogs: any[] }>>(`/admin/cards/${cardCode}`),

  generateCards: (payload: { count: number; material?: 'pvc' | 'metal' | 'bamboo' | 'wooden' | 'metallic'; notes?: string }) =>
    apiClient.post<never, ApiResponse<{ count: number; cards: Array<{ cardId: string; url: string; edition: string; status: string }>; csv: string; stats: any }>>('/admin/cards/generate', payload),

  assignCard: (cardCode: string, payload: { userId: string }) =>
    apiClient.post<never, ApiResponse<{ card: any; auditLogs: any[] }>>(`/admin/cards/${cardCode}/assign`, payload),

  unassignCard: (cardCode: string) =>
    apiClient.post<never, ApiResponse<{ card: any; auditLogs: any[] }>>(`/admin/cards/${cardCode}/unassign`),

  updateCardState: (cardCode: string, payload: { state: string; reason?: string }) =>
    apiClient.patch<never, ApiResponse<{ card: any; auditLogs: any[] }>>(`/admin/cards/${cardCode}/state`, payload),

  listOrders: (params?: { page?: number; limit?: number; status?: string; q?: string }) =>
    apiClient.get<
      never,
      ApiResponse<{
        orders: any[]
        stats: {
          totalOrders: number
          created: number
          paid: number
          processing: number
          shipped: number
          delivered: number
          cancelled: number
          totalRevenue: number
        }
        pagination: { total: number; page: number; limit: number; totalPages: number }
      }>
    >('/admin/orders', { params }),

  getOrder: (id: string) =>
    apiClient.get<never, ApiResponse<{ order: any }>>(`/admin/orders/${id}`),

  updateOrder: (id: string, payload: { state?: string; carrier?: string; trackingNumber?: string }) =>
    apiClient.patch<never, ApiResponse<{ order: any }>>(`/admin/orders/${id}`, payload),

  fulfillOrder: (id: string, payload: { cardCode?: string; carrier?: string; trackingNumber?: string; state?: string }) =>
    apiClient.post<never, ApiResponse<{ order: any; card?: any }>>(`/admin/orders/${id}/fulfill`, payload),
}
