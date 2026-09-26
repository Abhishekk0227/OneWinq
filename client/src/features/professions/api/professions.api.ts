import { apiClient } from '@/lib/api/client'
import type { ApiResponse } from '@/types/api.types'
import type { Profession, ProfessionCategory } from '@/types/networking.types'

export const professionsApi = {
  getCategories: () =>
    apiClient.get<never, ApiResponse<{ categories: ProfessionCategory[] }>>('/professions/categories'),

  search: (params?: { query?: string; search?: string; category?: string; page?: number; limit?: number }) =>
    apiClient.get<never, ApiResponse<{ professions: Profession[]; total?: number }>>('/professions', {
      params: {
        query: params?.query || params?.search || '',
        category: params?.category || undefined,
        limit: params?.limit || 50,
      },
    }),

  createCustom: (payload: { name: string } | { title: string }) => {
    const name = 'name' in payload ? payload.name : payload.title
    return apiClient.post<never, ApiResponse<{ profession: Profession }>>('/professions/custom', { name })
  },

  // Admin APIs
  adminCreateCategory: (payload: { name: string; slug?: string; icon?: string; displayOrder?: number }) =>
    apiClient.post<never, ApiResponse<{ category: ProfessionCategory }>>('/professions/categories', payload),

  adminUpdateCategory: (id: string, payload: Partial<ProfessionCategory>) =>
    apiClient.patch<never, ApiResponse<{ category: ProfessionCategory }>>(`/professions/categories/${id}`, payload),

  adminDeleteCategory: (id: string) =>
    apiClient.delete<never, ApiResponse<{ message: string }>>(`/professions/categories/${id}`),

  adminCreateProfession: (payload: {
    name: string
    categoryId?: string | null
    recommendedSectionTypes?: string[]
    isOfficial?: boolean
  }) => apiClient.post<never, ApiResponse<{ profession: Profession }>>('/professions', payload),

  adminUpdateProfession: (id: string, payload: Partial<Profession>) =>
    apiClient.patch<never, ApiResponse<{ profession: Profession }>>(`/professions/${id}`, payload),

  adminDeleteProfession: (id: string) =>
    apiClient.delete<never, ApiResponse<{ message: string }>>(`/professions/${id}`),
}
