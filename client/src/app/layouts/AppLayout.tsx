import * as React from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useOrganizationContextStore } from '@/stores/organizationContextStore'
import { AppSidebar } from '@/components/navigation/AppSidebar'
import { AppHeader } from '@/components/navigation/AppHeader'
import { MobileNav } from '@/components/navigation/MobileNav'
import { MobileMenuDrawer } from '@/components/navigation/MobileMenuDrawer'
import { CreatePostModal } from '@/components/posts/CreatePostModal'
import { cn } from '@/lib/utils/cn'

export function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { activeContext } = useOrganizationContextStore()

  const isMobileActiveChat =
    location.pathname.startsWith('/app/messages') &&
    Boolean(new URLSearchParams(location.search).get('cid'))

  // Guard:
  // 1. If browsing an organization-specific workspace route (/app/org/...) while in Personal workspace mode,
  //    redirect to personal app feed (/app).
  //    (Do NOT match /app/organizations/create so personal users can create new organizations)
  // 2. If in Organization workspace mode and navigating to the general public feed (/app),
  //    redirect directly to Company Posts (/app/org/posts) so the company never sees the public feed.
  React.useEffect(() => {
    const isOrgWorkspaceRoute =
      location.pathname.startsWith('/app/org/') || location.pathname === '/app/org'

    if (isOrgWorkspaceRoute && activeContext.type === 'PERSONAL') {
      navigate('/app', { replace: true })
    } else if ((location.pathname === '/app' || location.pathname === '/app/') && activeContext.type === 'ORGANIZATION') {
      navigate('/app/org/profile', { replace: true })
    }
  }, [location.pathname, activeContext.type, navigate])

  return (
    <div
      className={cn(
        'min-h-screen flex bg-background text-foreground w-full overflow-x-clip',
        isMobileActiveChat && 'h-[100dvh] overflow-hidden md:h-auto md:overflow-visible'
      )}
    >
      {/* Sidebar for Desktop */}
      <AppSidebar />

      {/* Main Workspace Area */}
      <div
        className={cn(
          'flex flex-1 flex-col min-w-0 overflow-x-clip',
          isMobileActiveChat ? 'pb-0' : 'pb-16 lg:pb-0'
        )}
      >
        <div className={cn(isMobileActiveChat && 'hidden md:block')}>
          <AppHeader />
        </div>
        <main
          className={cn(
            'flex-1 max-w-7xl w-full mx-auto animate-in fade-in-50 duration-200 min-w-0 flex flex-col',
            isMobileActiveChat
              ? 'p-0 md:p-6 lg:p-8 h-full md:h-auto'
              : 'p-3.5 sm:p-6 lg:p-8'
          )}
        >
          <Outlet />
        </main>
      </div>

      {/* Mobile Slide-Out Navigation Drawer */}
      <MobileMenuDrawer />

      {/* Bottom Navigation for Mobile */}
      {!isMobileActiveChat && <MobileNav />}

      {/* Global Post Creation Modal */}
      <CreatePostModal />
    </div>
  )
}
