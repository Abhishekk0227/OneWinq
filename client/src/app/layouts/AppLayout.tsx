import * as React from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useOrganizationContextStore } from '@/stores/organizationContextStore'
import { AppSidebar } from '@/components/navigation/AppSidebar'
import { AppHeader } from '@/components/navigation/AppHeader'
import { MobileNav } from '@/components/navigation/MobileNav'
import { MobileMenuDrawer } from '@/components/navigation/MobileMenuDrawer'
import { CreatePostModal } from '@/components/posts/CreatePostModal'

export function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { activeContext } = useOrganizationContextStore()

  // Guard: If browsing an organization-specific route while in Personal workspace mode,
  // automatically redirect to personal app dashboard rather than displaying empty states.
  React.useEffect(() => {
    if (location.pathname.startsWith('/app/org') && activeContext.type === 'PERSONAL') {
      navigate('/app', { replace: true })
    }
  }, [location.pathname, activeContext.type, navigate])

  return (
    <div className="min-h-screen flex bg-background text-foreground w-full overflow-x-clip">
      {/* Sidebar for Desktop */}
      <AppSidebar />

      {/* Main Workspace Area */}
      <div className="flex flex-1 flex-col min-w-0 pb-16 lg:pb-0 overflow-x-clip">
        <AppHeader />
        <main className="flex-1 p-3.5 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto animate-in fade-in-50 duration-200 min-w-0">
          <Outlet />
        </main>
      </div>

      {/* Mobile Slide-Out Navigation Drawer */}
      <MobileMenuDrawer />

      {/* Bottom Navigation for Mobile */}
      <MobileNav />

      {/* Global Post Creation Modal */}
      <CreatePostModal />
    </div>
  )
}
