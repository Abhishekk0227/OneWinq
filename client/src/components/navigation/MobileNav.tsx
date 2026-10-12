import { NavLink } from 'react-router-dom'
import { BarChart3, UserCircle, Home, Compass, Plus, FileText } from 'lucide-react'
import { useUIStore } from '@/stores/uiStore'
import { useOrganizationContextStore } from '@/stores/organizationContextStore'
import { cn } from '@/lib/utils/cn'

export function MobileNav() {
  const { openModal } = useUIStore()
  const { activeContext } = useOrganizationContextStore()
  const isOrgMode = activeContext.type === 'ORGANIZATION'

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 flex h-16 items-center justify-around border-t border-border/60 bg-background/95 px-3 backdrop-blur-md lg:hidden">
      {/* Home / Feed or Company Posts */}
      <NavLink
        to={isOrgMode ? '/app/org/posts' : '/app'}
        end
        className={({ isActive }) =>
          cn(
            'flex flex-col items-center justify-center py-1 px-2 text-[11px] font-medium transition-colors',
            isActive
              ? 'text-primary font-bold'
              : 'text-muted-foreground hover:text-foreground'
          )
        }
      >
        {isOrgMode ? <FileText className="h-5 w-5 mb-0.5" /> : <Home className="h-5 w-5 mb-0.5" />}
        <span>{isOrgMode ? 'Posts' : 'Home'}</span>
      </NavLink>

      {/* Network / Discover */}
      <NavLink
        to="/app/network"
        className={({ isActive }) =>
          cn(
            'flex flex-col items-center justify-center py-1 px-2 text-[11px] font-medium transition-colors',
            isActive
              ? 'text-primary font-bold'
              : 'text-muted-foreground hover:text-foreground'
          )
        }
      >
        <Compass className="h-5 w-5 mb-0.5" />
        <span>Network</span>
      </NavLink>

      {/* Center Post Action Button */}
      <button
        type="button"
        onClick={() => openModal('CREATE_POST')}
        className="flex flex-col items-center justify-center -mt-5"
        title="Create New Post"
        aria-label="Create New Post"
      >
        <div className="h-12 w-12 rounded-full bg-gradient-to-tr from-primary via-primary-600 to-primary-700 text-white flex items-center justify-center shadow-lg shadow-primary/30 ring-4 ring-card active:scale-95 transition-all">
          <Plus className="h-6 w-6 stroke-[2.5]" />
        </div>
      </button>

      {/* Analytics & Metrics */}
      <NavLink
        to="/app/analytics"
        className={({ isActive }) =>
          cn(
            'flex flex-col items-center justify-center py-1 px-2 text-[11px] font-medium transition-colors',
            isActive
              ? 'text-primary font-bold'
              : 'text-muted-foreground hover:text-foreground'
          )
        }
      >
        <BarChart3 className="h-5 w-5 mb-0.5" />
        <span>Analytics</span>
      </NavLink>

      {/* Profile */}
      <NavLink
        to="/app/profile"
        className={({ isActive }) =>
          cn(
            'flex flex-col items-center justify-center py-1 px-2 text-[11px] font-medium transition-colors',
            isActive
              ? 'text-primary font-bold'
              : 'text-muted-foreground hover:text-foreground'
          )
        }
      >
        <UserCircle className="h-5 w-5 mb-0.5" />
        <span>Profile</span>
      </NavLink>
    </nav>
  )
}
