import { apiClient } from '@/lib/api/client'
import type { ApiResponse } from '@/types/api.types'

export interface SupportTicket {
  _id: string
  id?: string
  userId: string
  subject: string
  category: string
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'
  priority: 'LOW' | 'MEDIUM' | 'HIGH'
  messages: Array<{
    senderId: string
    senderRole: string
    message: string
    createdAt: string
  }>
  createdAt: string
  updatedAt: string
}

export const supportApi = {
  createTicket: (payload: { subject: string; category: string; message: string; priority?: string }) =>
    apiClient.post<never, ApiResponse<{ ticket: SupportTicket }>>('/support/tickets', payload),

  listTickets: () =>
    apiClient.get<never, ApiResponse<{ tickets: SupportTicket[] }>>('/support/tickets'),

  getTicket: (id: string) =>
    apiClient.get<never, ApiResponse<{ ticket: SupportTicket }>>(`/support/tickets/${id}`),

  replyTicket: (id: string, message: string) =>
    apiClient.post<never, ApiResponse<{ ticket: SupportTicket }>>(`/support/tickets/${id}/reply`, {
      message,
    }),

  closeTicket: (id: string) =>
    apiClient.post<never, ApiResponse<{ ticket: SupportTicket }>>(`/support/tickets/${id}/close`, {}),
}
