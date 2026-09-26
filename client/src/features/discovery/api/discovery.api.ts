import { apiClient } from '@/lib/api/client'
import type { ApiResponse } from '@/types/api.types'
import type { DiscoveryUserCard, DiscoverySearchParams } from '@/types/networking.types'

export const discoveryApi = {
  search: (params: DiscoverySearchParams) =>
    apiClient.get<never, ApiResponse<{ users: DiscoveryUserCard[]; results?: DiscoveryUserCard[]; nextCursor?: string | null }>>(
      '/discovery/search',
      { params }
    ),
}
