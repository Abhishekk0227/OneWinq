import { apiClient } from '@/lib/api/client'
import type { ApiResponse } from '@/types/api.types'
import type { Post, FeedResponse, PostComment } from '@/types/posts.types'

export const postsApi = {
  getFeed: (params?: { page?: number; limit?: number; filter?: 'all' | 'my' | 'saved' | 'archived'; authorUsername?: string }) =>
    apiClient.get<never, ApiResponse<FeedResponse>>('/posts', { params }),

  createPost: (payload: { content?: string; media?: { type: 'IMAGE' | 'VIDEO'; url: string; mediaId?: string | null }[]; visibility?: string }) =>
    apiClient.post<never, ApiResponse<{ post: Post }>>('/posts', payload),

  getPost: (id: string) =>
    apiClient.get<never, ApiResponse<{ post: Post }>>(`/posts/${id}`),

  updatePost: (id: string, payload: { content: string }) =>
    apiClient.patch<never, ApiResponse<{ post: Post }>>(`/posts/${id}`, payload),

  deletePost: (id: string) =>
    apiClient.delete<never, ApiResponse<{ message: string }>>(`/posts/${id}`),

  toggleArchive: (id: string) =>
    apiClient.patch<never, ApiResponse<{ state: string; isArchived: boolean }>>(`/posts/${id}/archive`),

  toggleLike: (id: string) =>
    apiClient.post<never, ApiResponse<{ isLiked: boolean; likesCount: number }>>(`/posts/${id}/like`),

  toggleSave: (id: string) =>
    apiClient.post<never, ApiResponse<{ isSaved: boolean; savesCount: number }>>(`/posts/${id}/save`),

  sharePost: (id: string) =>
    apiClient.post<never, ApiResponse<{ sharesCount: number }>>(`/posts/${id}/share`),

  getComments: (postId: string) =>
    apiClient.get<never, ApiResponse<{ comments: PostComment[] }>>(`/posts/${postId}/comments`),

  addComment: (postId: string, payload: { content: string; parentId?: string | null }) =>
    apiClient.post<never, ApiResponse<{ comment: PostComment }>>(`/posts/${postId}/comments`, payload),

  deleteComment: (postId: string, commentId: string) =>
    apiClient.delete<never, ApiResponse<{ message: string }>>(`/posts/${postId}/comments/${commentId}`),
}
