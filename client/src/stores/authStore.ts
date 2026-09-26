import { create } from 'zustand'
import type { User } from '@/types/auth.types'
import { queryClient } from '@/lib/query/queryClient'

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
    // If switching account or logging in fresh, clear any residual query cache from a previous user
    if (!prevUser || prevUser._id !== user._id) {
      queryClient.clear()
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
    // Clear all React Query cache so previous user data is never leaked or displayed
    queryClient.clear()
    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
    })
  },
}))
