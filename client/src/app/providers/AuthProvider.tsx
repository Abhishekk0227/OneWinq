import * as React from 'react'
import { useAuthStore } from '@/stores/authStore'
import { authApi } from '@/features/auth/api/auth.api'
import { connectSocket, disconnectSocket } from '@/lib/socket/socketClient'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setAuth, logout, setLoading } = useAuthStore()

  React.useEffect(() => {
    let isMounted = true

    async function initializeSession() {
      try {
        // Attempt silent refresh via HTTP-only cookie
        const refreshRes = await authApi.refresh()
        const token = refreshRes.data?.accessToken

        if (token && isMounted) {
          useAuthStore.getState().setAccessToken(token)
          // Fetch current user details
          const meRes = await authApi.getMe()
          if (isMounted && meRes.data?.user) {
            setAuth(meRes.data.user, token)
            connectSocket(token)
          }
        }
      } catch {
        // No active session or cookie expired
        if (isMounted) {
          logout()
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    initializeSession()

    return () => {
      isMounted = false
    }
  }, [setAuth, logout, setLoading])

  // Handle socket cleanup on logout
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  React.useEffect(() => {
    if (!isAuthenticated) {
      disconnectSocket()
    }
  }, [isAuthenticated])

  return <>{children}</>
}
