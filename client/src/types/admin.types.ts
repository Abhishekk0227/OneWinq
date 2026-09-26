import type { AccountState, AdminRole } from '@/constants/app.constants'

export interface AdminMetrics {
  totalUsers: number
  activeUsers: number
  pendingVerificationUsers: number
  totalProfiles: number
  publishedProfiles: number
  activeCards: number
  totalConnections: number
  totalConversations: number
}

export interface AdminUserListItem {
  _id: string
  id?: string
  email: string
  username: string
  displayName: string
  accountState: AccountState
  emailVerified: boolean
  role: AdminRole
  createdAt: string
  lastLoginAt?: string | null
}

export interface AuditLogItem {
  _id: string
  id?: string
  actorId: string
  actorEmail?: string
  action: string
  targetType: string
  targetId?: string
  metadata?: Record<string, unknown>
  createdAt: string
}
