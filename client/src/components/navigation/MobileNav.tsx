import { NavLink, useLocation } from 'react-router-dom'
import {
  BarChart3,
  UserCircle,
  Home,
  Compass,
  Plus,
  Building2,
  Users,
  Briefcase,
} from 'lucide-react'
import { useUIStore } from '@/stores/uiStore'
import { useOrganizationContextStore } from '@/stores/organizationContextStore'
import { cn } from '@/lib/utils/cn'

export function MobileNav() {
  const location = useLocation()
  const { openModal } = useUIStore()
  const { activeContext } = useOrganizationContextStore()

  const isOrgRoute =
    location.pathname.startsWith('/app/org') ||
    location.pathname.startsWith('/app/organizations')
  const isOrgMode = activeContext.type === 'ORGANIZATION' || isOrgRoute

  // 1. ORGANIZATION WORKSPACE MODE: strictly org-related tabs
  if (isOrgMode) {
    return (
      <nav className="fixed bottom-0 left-0 right-0 z-30 flex h-16 items-center justify-around border-t border-border/60 bg-background/95 px-2 backdrop-blur-md lg:hidden">
        {/* Org Profile Studio */}
        <NavLink
          to="/app/org/profile"
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center justify-center py-1 px-2 text-[10px] font-medium transition-colors',
              isActive
                ? 'text-primary font-bold'
                : 'text-muted-foreground hover:text-foreground'
            )
          }
        >
          <Building2 className="h-5 w-5 mb-0.5" />
          <span>Org Profile</span>
        </NavLink>

        {/* Team Members / Directory */}
        <NavLink
          to="/app/org/members"
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center justify-center py-1 px-2 text-[10px] font-medium transition-colors',
              isActive
                ? 'text-primary font-bold'
                : 'text-muted-foreground hover:text-foreground'
            )
          }
        >
          <Users className="h-5 w-5 mb-0.5" />
          <span>Team</span>
        </NavLink>

        {/* Center Post Action Button */}
        <button
          type="button"
          onClick={() => openModal('CREATE_POST')}
          className="flex flex-col items-center justify-center -mt-5 cursor-pointer"
          title="Create New Organization Post"
          aria-label="Create New Organization Post"
        >
          <div className="h-12 w-12 rounded-full bg-gradient-to-tr from-primary via-primary-600 to-primary-700 text-white flex items-center justify-center shadow-lg shadow-primary/30 ring-4 ring-card active:scale-95 transition-all">
            <Plus className="h-6 w-6 stroke-[2.5]" />
          </div>
        </button>

        {/* Job Postings & Hiring */}
        <NavLink
          to="/app/org/jobs"
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center justify-center py-1 px-2 text-[10px] font-medium transition-colors',
              isActive
                ? 'text-primary font-bold'
                : 'text-muted-foreground hover:text-foreground'
            )
          }
        >
          <Briefcase className="h-5 w-5 mb-0.5" />
          <span>Jobs</span>
        </NavLink>

        {/* Organization Operations Analytics */}
        <NavLink
          to="/app/org/analytics"
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center justify-center py-1 px-2 text-[10px] font-medium transition-colors',
              isActive
                ? 'text-primary font-bold'
                : 'text-muted-foreground hover:text-foreground'
            )
          }
        >
          <BarChart3 className="h-5 w-5 mb-0.5" />
          <span>Analytics</span>
        </NavLink>
      </nav>
    )
  }

  // 2. USER / PERSONAL MODE: strictly personal-related tabs
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 flex h-16 items-center justify-around border-t border-border/60 bg-background/95 px-3 backdrop-blur-md lg:hidden">
      {/* Personal Home / Feed */}
      <NavLink
        to="/app"
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
        <Home className="h-5 w-5 mb-0.5" />
        <span>Home</span>
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
        className="flex flex-col items-center justify-center -mt-5 cursor-pointer"
        title="Create New Post"
        aria-label="Create New Post"
      >
        <div className="h-12 w-12 rounded-full bg-gradient-to-tr from-primary via-primary-600 to-primary-700 text-white flex items-center justify-center shadow-lg shadow-primary/30 ring-4 ring-card active:scale-95 transition-all">
          <Plus className="h-6 w-6 stroke-[2.5]" />
        </div>
      </button>

      {/* Personal Analytics */}
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

      {/* Personal User Profile */}
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
