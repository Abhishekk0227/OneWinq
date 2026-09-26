import type { AccountState, AdminRole } from '@/constants/app.constants'

export interface User {
  _id: string
  id?: string
  email: string
  username: string
  displayName: string
  avatarUrl?: string | null
  accountState: AccountState
  emailVerified: boolean
  role: AdminRole
  appearInDiscovery: boolean
  connectionRequestVisibility: 'EVERYONE' | 'NOBODY'
  lastLoginAt?: string | null
  createdAt: string
  updatedAt: string
}

export interface AuthSession {
  _id: string
  id?: string
  userAgent?: string
  ipAddress?: string
  lastUsedAt: string
  isCurrent?: boolean
  createdAt: string
}

export interface AuthResponseData {
  user: User
  accessToken: string
}

export interface RefreshResponseData {
  accessToken: string
}
