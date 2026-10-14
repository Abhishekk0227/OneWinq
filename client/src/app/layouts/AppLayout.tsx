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

  // Guard:
  // 1. If browsing an organization-specific route while in Personal workspace mode,
  //    redirect to personal app feed (/app).
  // 2. If in Organization workspace mode and navigating to the general public feed (/app),
  //    redirect directly to Company Posts (/app/org/posts) so the company never sees the public feed.
  React.useEffect(() => {
    if (location.pathname.startsWith('/app/org') && activeContext.type === 'PERSONAL') {
      navigate('/app', { replace: true })
    } else if ((location.pathname === '/app' || location.pathname === '/app/') && activeContext.type === 'ORGANIZATION') {
      navigate('/app/org/profile', { replace: true })
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
