import { apiClient } from '@/lib/api/client'
import type { ApiResponse } from '@/types/api.types'
import type {
  Profile,
  ProfilePersona,
  ProfessionalIdentity,
  PublicProfileResponse,
  ProfileVisibilitySettings,
} from '@/types/profile.types'
import type { VisibilityMode } from '@/constants/app.constants'

export const profileApi = {
  getMyProfile: (params?: { personaId?: string }) =>
    apiClient.get<never, ApiResponse<{ profile: Profile; personas?: ProfilePersona[]; identities?: ProfessionalIdentity[]; user?: { id: string; username: string; displayName: string; avatarUrl?: string | null } }>>('/profiles/me', { params }),

  listPersonas: () =>
    apiClient.get<never, ApiResponse<{ personas: ProfilePersona[] }>>('/profiles/me/personas'),

  createPersona: (payload: { personaName: string; professionTitle?: string; templateSlug?: string; copyFromActive?: boolean }) =>
    apiClient.post<never, ApiResponse<{ persona: ProfilePersona }>>('/profiles/me/personas', payload),

  switchActivePersona: (personaId: string) =>
    apiClient.post<never, ApiResponse<{ persona: ProfilePersona }>>(`/profiles/me/personas/${personaId}/activate`, {}),

  deletePersona: (personaId: string) =>
    apiClient.delete<never, ApiResponse<null>>(`/profiles/me/personas/${personaId}`),

  updateDraft: (data: Partial<Profile> & { displayName?: string; personaId?: string }, personaId?: string) =>
    apiClient.put<never, ApiResponse<{ profile: Profile; user?: any }>>('/profiles/me', data, {
      params: (personaId || data.personaId) ? { personaId: personaId || data.personaId } : {},
    }),

  publish: (personaId?: string) =>
    apiClient.post<never, ApiResponse<{ profile: Profile }>>('/profiles/me/publish', {}, {
      params: personaId ? { personaId } : {},
    }),

  updateVisibility: (visibility: ProfileVisibilitySettings) =>
    apiClient.put<never, ApiResponse<{ profile: Profile }>>('/profiles/me/visibility', visibility),

  setActiveMode: (mode: VisibilityMode) =>
    apiClient.post<never, ApiResponse<{ profile: Profile }>>('/profiles/me/mode', { mode }),

  setTemporaryMode: (payload: { mode: VisibilityMode; durationHours?: number; fallbackMode?: VisibilityMode }) =>
    apiClient.post<never, ApiResponse<{ profile: Profile }>>('/profiles/me/mode/temporary', payload),

  cancelTemporaryMode: () =>
    apiClient.delete<never, ApiResponse<{ profile: Profile }>>('/profiles/me/mode/temporary'),

  getPreview: (mode?: VisibilityMode) =>
    apiClient.get<never, ApiResponse<{ preview: any }>>('/profiles/me/preview', {
      params: mode ? { mode } : {},
    }),

  getRecommendedSections: () =>
    apiClient.get<never, ApiResponse<{ recommended: string[] }>>('/profiles/me/recommended-sections'),

  changeUsername: (username: string) =>
    apiClient.post<never, ApiResponse<{ username: string }>>('/profiles/me/username', { username }),

  // Identities
  getIdentities: () =>
    apiClient.get<never, ApiResponse<{ identities: ProfessionalIdentity[] }>>('/profiles/me/identities'),

  createIdentity: (payload: { customTitle: string; professionId?: string | null; isPrimary?: boolean; displayOrder?: number }) =>
    apiClient.post<never, ApiResponse<{ identity: ProfessionalIdentity }>>('/profiles/me/identities', payload),

  updateIdentity: (id: string, payload: Partial<ProfessionalIdentity>) =>
    apiClient.put<never, ApiResponse<{ identity: ProfessionalIdentity }>>(`/profiles/me/identities/${id}`, payload),

  deleteIdentity: (id: string) =>
    apiClient.delete<never, ApiResponse<null>>(`/profiles/me/identities/${id}`),

  // Public Profile — by username
  getPublicProfile: (username: string) =>
    apiClient.get<never, ApiResponse<PublicProfileResponse>>(`/public/u/${username}`),

  // Public Profile — by physical card code (card-first identity URL: /p/c/:cardCode)
  getPublicProfileByCard: (cardCode: string) =>
    apiClient.get<never, ApiResponse<PublicProfileResponse>>(`/public/p/c/${cardCode}`),

  // Profile Templates & Dynamic Recommendations
  getTemplates: (params?: { category?: string }) =>
    apiClient.get<never, ApiResponse<{ templates: import('@/types/profile.types').ProfileTemplate[] }>>(
      '/profile-templates',
      { params },
    ),

  getTemplateBySlug: (slug: string) =>
    apiClient.get<never, ApiResponse<{ template: import('@/types/profile.types').ProfileTemplate }>>(
      `/profile-templates/${slug}`,
    ),

  updateTemplate: (payload: { templateId?: string; templateSlug?: string; personaId?: string }) =>
    apiClient.patch<
      never,
      ApiResponse<{
        profile: Profile
        template: import('@/types/profile.types').ProfileTemplate
        recommendations: import('@/types/profile.types').ProfileRecommendationResponse
      }>
    >('/profiles/me/template', payload),

  getRecommendations: (params?: { templateId?: string; templateSlug?: string }) =>
    apiClient.get<never, ApiResponse<import('@/types/profile.types').ProfileRecommendationResponse>>(
      '/profiles/me/recommendations',
      { params },
    ),
}
