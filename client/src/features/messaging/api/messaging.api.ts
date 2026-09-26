import { apiClient } from '@/lib/api/client'
import type { ApiResponse } from '@/types/api.types'
import type { Conversation, Message, ChatFolder, GroupDetails } from '@/types/messaging.types'

export const messagingApi = {
  getConversations: (params?: { limit?: number; cursor?: string }) =>
    apiClient.get<never, ApiResponse<{ conversations: Conversation[]; nextCursor?: string | null }>>(
      '/conversations',
      { params }
    ),

  getOrCreateConversation: (targetUserId: string) =>
    apiClient.post<never, ApiResponse<{ conversationId: string; conversation?: Conversation }>>('/conversations', {
      targetUserId,
    }),

  getMessages: (conversationId: string, params?: { limit?: number; cursor?: string }) =>
    apiClient.get<never, ApiResponse<{ messages: Message[]; nextCursor?: string | null }>>(
      `/conversations/${conversationId}/messages`,
      { params }
    ),

  sendMessage: (
    conversationId: string,
    payload: { text?: string; content?: string; attachments?: Array<{ url: string; filename?: string; mimeType?: string; sizeBytes?: number }> }
  ) =>
    apiClient.post<never, ApiResponse<{ message: Message }>>(
      `/conversations/${conversationId}/messages`,
      {
        text: payload.text || payload.content || '',
        attachments: payload.attachments || [],
      }
    ),

  editMessage: (messageId: string, text: string) =>
    apiClient.put<never, ApiResponse<{ message: Message }>>(`/conversations/messages/${messageId}`, {
      text,
    }),

  deleteMessage: (messageId: string, mode: 'for-me' | 'for-everyone' = 'for-everyone') =>
    apiClient.delete<never, ApiResponse<null>>(`/conversations/messages/${messageId}`, {
      params: { mode },
    }),

  markAsRead: (conversationId: string) =>
    apiClient.post<never, ApiResponse<null>>(`/conversations/${conversationId}/read`, {}),

  deleteConversation: (conversationId: string) =>
    apiClient.delete<never, ApiResponse<null>>(`/conversations/${conversationId}`),

  // Chat Folders
  getFolders: () =>
    apiClient.get<never, ApiResponse<{ folders: ChatFolder[] }>>('/conversations/folders'),

  createFolder: (payload: { name: string; color?: string; icon?: string; memberUserIds?: string[] }) =>
    apiClient.post<never, ApiResponse<{ folder: ChatFolder }>>('/conversations/folders', payload),

  updateFolder: (folderId: string, payload: { name?: string; color?: string; icon?: string; memberUserIds?: string[] }) =>
    apiClient.put<never, ApiResponse<{ folder: ChatFolder }>>(`/conversations/folders/${folderId}`, payload),

  deleteFolder: (folderId: string) =>
    apiClient.delete<never, ApiResponse<null>>(`/conversations/folders/${folderId}`),

  toggleFolderMember: (folderId: string, memberUserId: string) =>
    apiClient.post<never, ApiResponse<{ folderId: string; memberUserId: string; isMember: boolean; memberCount: number }>>(
      `/conversations/folders/${folderId}/members`,
      { memberUserId }
    ),

  setUserFolders: (targetUserId: string, folderIds: string[]) =>
    apiClient.post<never, ApiResponse<{ folders: ChatFolder[] }>>('/conversations/folders/user-folders', {
      targetUserId,
      folderIds,
    }),

  // Group Chats
  createGroup: (payload: { title: string; description?: string; avatarUrl?: string | null; memberUserIds?: string[] }) =>
    apiClient.post<never, ApiResponse<{ conversation: GroupDetails }>>('/conversations/groups', payload),

  getConversationDetails: (conversationId: string) =>
    apiClient.get<never, ApiResponse<GroupDetails>>(`/conversations/${conversationId}/details`),

  addGroupMembers: (conversationId: string, memberUserIds: string[]) =>
    apiClient.post<never, ApiResponse<GroupDetails>>(`/conversations/${conversationId}/members`, {
      memberUserIds,
    }),

  removeGroupMember: (conversationId: string, memberId: string) =>
    apiClient.delete<never, ApiResponse<GroupDetails>>(`/conversations/${conversationId}/members/${memberId}`),

  updateMemberRole: (conversationId: string, payload: { targetUserId: string; role: 'ADMIN' | 'MEMBER' }) =>
    apiClient.put<never, ApiResponse<GroupDetails>>(`/conversations/${conversationId}/admins`, payload),

  updateGroupInfo: (conversationId: string, payload: { title?: string; description?: string; avatarUrl?: string | null }) =>
    apiClient.put<never, ApiResponse<GroupDetails>>(`/conversations/${conversationId}/group`, payload),

  leaveGroup: (conversationId: string) =>
    apiClient.post<never, ApiResponse<null>>(`/conversations/${conversationId}/leave`),
}
