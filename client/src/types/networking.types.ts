import type { ConnectionState } from '@/constants/app.constants'

export interface Profession {
  _id: string
  id?: string
  name: string
  title?: string
  slug: string
  categoryId?: string | ProfessionCategory | null
  category?: string
  description?: string
  subtitle?: string
  aliases?: string[]
  recommendedSectionTypes?: string[]
  isOfficial: boolean
  isActive?: boolean
  isCustom?: boolean
  isVerified?: boolean
  status?: string
  createdAt?: string
  updatedAt?: string
}

export interface ProfessionCategory {
  _id: string
  id?: string
  name: string
  slug: string
  icon?: string
  displayOrder?: number
  isActive?: boolean
  count?: number
  createdAt?: string
  updatedAt?: string
}

export interface ConnectionUserSummary {
  _id: string
  id?: string
  username: string
  displayName: string
  avatarUrl?: string
  headline?: string
  primaryProfession?: string
}

export interface ConnectionItem {
  _id: string
  id?: string
  requesterId: string | ConnectionUserSummary
  recipientId: string | ConnectionUserSummary
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN'
  connectedAt?: string
  createdAt: string
  user?: ConnectionUserSummary
}

export interface DiscoveryUserCard {
  id: string
  userId?: string
  username: string
  displayName: string
  avatarUrl?: string | null
  headline?: string
  primaryProfession?: string | null
  otherProfessions?: string[]
  identities?: Array<{ customTitle: string }>
  skills?: Array<{ name: string }>
  topSkills?: string[]
  location?: { city?: string; country?: string; isRemote?: boolean } | null
  connectionState?: ConnectionState
  connectionStatus?: string
  connectionId?: string | null
  hasActiveCard?: boolean
}

export interface DiscoverySearchParams {
  q?: string
  profession?: string
  category?: string
  skills?: string
  location?: string
  remoteOnly?: boolean
  limit?: number
  cursor?: string
}
