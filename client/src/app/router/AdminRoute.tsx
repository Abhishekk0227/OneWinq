import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { LoadingScreen } from '@/components/common/LoadingScreen'

export function AdminRoute() {
  const { user, isAuthenticated, isLoading } = useAuthStore()

  if (isLoading) {
    return <LoadingScreen message="Checking admin permissions..." />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  const isStaff = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' || user?.role === 'SUPPORT'
  if (!isStaff) {
    return <Navigate to="/app" replace />
  }

  return <Outlet />
}
