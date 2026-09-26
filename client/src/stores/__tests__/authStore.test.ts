import { describe, it, expect, beforeEach } from 'vitest'
import { useAuthStore } from '../authStore'
import type { User } from '@/types/auth.types'

describe('AuthStore', () => {
  beforeEach(() => {
    useAuthStore.getState().logout()
  })

  it('initializes in unauthenticated state', () => {
    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(false)
    expect(state.user).toBeNull()
    expect(state.accessToken).toBeNull()
  })

  it('updates state upon successful authentication', () => {
    const mockUser: User = {
      _id: 'user-123',
      email: 'siddharth@onewinq.me',
      username: 'siddharth',
      displayName: 'Siddharth Rao',
      accountState: 'ACTIVE',
      emailVerified: true,
      role: 'USER',
      appearInDiscovery: true,
      connectionRequestVisibility: 'EVERYONE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    useAuthStore.getState().setAuth(mockUser, 'mock-access-token-xyz')

    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(true)
    expect(state.accessToken).toBe('mock-access-token-xyz')
    expect(state.user?.username).toBe('siddharth')
  })

  it('resets memory on logout', () => {
    useAuthStore.getState().setAccessToken('token')
    useAuthStore.getState().logout()

    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(false)
    expect(state.accessToken).toBeNull()
  })
})
