import { NavLink } from 'react-router-dom'
import { LayoutDashboard, UserCircle, Home, Compass, Plus } from 'lucide-react'
import { useUIStore } from '@/stores/uiStore'
import { cn } from '@/lib/utils/cn'

export function MobileNav() {
  const { openModal } = useUIStore()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 flex h-16 items-center justify-around border-t border-border bg-card/95 px-3 backdrop-blur-md lg:hidden">
      {/* Home / Feed (Instagram-style default) */}
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
        className="flex flex-col items-center justify-center -mt-5"
        title="Create New Post"
        aria-label="Create New Post"
      >
        <div className="h-12 w-12 rounded-full bg-gradient-to-tr from-primary via-primary-600 to-primary-700 text-white flex items-center justify-center shadow-lg shadow-primary/30 ring-4 ring-card active:scale-95 transition-all">
          <Plus className="h-6 w-6 stroke-[2.5]" />
        </div>
      </button>

      {/* Dashboard & Metrics */}
      <NavLink
        to="/app/dashboard"
        className={({ isActive }) =>
          cn(
            'flex flex-col items-center justify-center py-1 px-2 text-[11px] font-medium transition-colors',
            isActive
              ? 'text-primary font-bold'
              : 'text-muted-foreground hover:text-foreground'
          )
        }
      >
        <LayoutDashboard className="h-5 w-5 mb-0.5" />
        <span>Stats</span>
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
