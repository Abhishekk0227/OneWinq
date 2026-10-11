import { create } from 'zustand'
import type { User } from '@/types/auth.types'
import { queryClient } from '@/lib/query/queryClient'
import { useOrganizationContextStore } from '@/stores/organizationContextStore'

interface AuthState {
  user: User | null
  accessToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  setAuth: (user: User, accessToken: string) => void
  setUser: (user: User) => void
  setAccessToken: (accessToken: string) => void
  setLoading: (isLoading: boolean) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: true,

  setAuth: (user, accessToken) => {
    const prevUser = get().user
    const isDifferentUser = !prevUser || prevUser._id !== user._id

    // If switching account or logging in fresh, cancel all queries and clear any residual data
    if (isDifferentUser) {
      try {
        queryClient.cancelQueries()
        queryClient.clear()
        queryClient.removeQueries()
      } catch {
        // ignore
      }

      try {
        useOrganizationContextStore.getState().clearContext()
        localStorage.removeItem('onewinq-org-context')
        useOrganizationContextStore.getState().fetchMemberships()
      } catch {
        // ignore
      }
    }

    set({
      user,
      accessToken,
      isAuthenticated: true,
      isLoading: false,
    })
  },

  setUser: (user) =>
    set({
      user,
      isAuthenticated: true,
    }),

  setAccessToken: (accessToken) =>
    set({
      accessToken,
      isAuthenticated: true,
    }),

  setLoading: (isLoading) =>
    set({
      isLoading,
    }),

  logout: () => {
    // 1. Purge all React Query cached data and cancel pending queries
    try {
      queryClient.cancelQueries()
      queryClient.clear()
      queryClient.removeQueries()
    } catch {
      // ignore
    }

    // 2. Wipe active organization context and remove persisted storage
    try {
      useOrganizationContextStore.getState().clearContext()
      localStorage.removeItem('onewinq-org-context')
    } catch {
      // ignore
    }

    // 3. Clear auth store state
    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
    })
  },
}))
