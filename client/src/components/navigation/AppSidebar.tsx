import { NavLink } from 'react-router-dom'
import { BrandLogo } from './BrandLogo'
import {
  LayoutDashboard,
  UserCircle,
  Compass,
  Users,
  MessageSquare,
  Bell,
  BarChart3,
  CreditCard,
  Package,
  Settings,
  ShieldAlert,
  ExternalLink,
  Home,
  LayoutTemplate,
  Plus,
  Wifi,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { notificationsApi } from '@/features/notifications/api/notifications.api'
import { cardsApi } from '@/features/cards/api/cards.api'
import { queryKeys } from '@/lib/query/queryKeys'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'
import { cn } from '@/lib/utils/cn'

export function AppSidebar() {
  const { user } = useAuthStore()
  const { isSidebarCollapsed, openModal } = useUIStore()
  const isStaff = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' || user?.role === 'SUPPORT'

  const { data: unreadData } = useQuery({
    queryKey: queryKeys.notifications.unreadCount,
    queryFn: () => notificationsApi.getUnreadCount(),
    refetchInterval: 30000,
  })
  const unreadCount = unreadData?.data?.unreadCount ?? unreadData?.data?.count ?? 0

  // Card-first identity: resolve public link from active card (data cached by DashboardPage/ProfilePage)
  const { data: cardsData } = useQuery({
    queryKey: queryKeys.cards.list,
    queryFn: () => cardsApi.listCards(),
    staleTime: 60_000,
  })
  const cards = (cardsData?.data as any)?.cards || []
  const activeCard = cards.find((c: any) => c.state === 'ACTIVE' || c.status === 'ACTIVE')
  const activeCardCode = activeCard?.cardCode?.toLowerCase() || activeCard?.cardUid?.toLowerCase()

  const navItems = [
    { label: 'Home Feed', to: '/app', icon: Home, end: true },
    { label: 'Dashboard & Stats', to: '/app/dashboard', icon: LayoutDashboard },
    { label: 'Discover People', to: '/app/network', icon: Compass },
    { label: 'My Profile', to: '/app/profile', icon: UserCircle },
    { label: 'Profile Templates', to: '/app/templates', icon: LayoutTemplate },
    { label: 'Connections', to: '/app/connections', icon: Users },
    { label: 'Messages', to: '/app/messages', icon: MessageSquare },
    { label: 'Notifications', to: '/app/notifications', icon: Bell },
    { label: 'Analytics', to: '/app/analytics', icon: BarChart3 },
    { label: 'Manage Cards', to: '/app/cards', icon: CreditCard },
    { label: 'Orders', to: '/app/orders', icon: Package },
    { label: 'Settings', to: '/app/settings', icon: Settings },
  ]

  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col border-r border-border bg-card transition-all duration-300 select-none z-30 h-screen sticky top-0',
        isSidebarCollapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Sidebar Header */}
      <div
        className={cn(
          'flex h-16 items-center border-b border-border overflow-hidden',
          isSidebarCollapsed ? 'px-2 justify-center' : 'px-6'
        )}
      >
        {isSidebarCollapsed ? (
          <BrandLogo collapsed />
        ) : (
          <BrandLogo showTagline />
        )}
      </div>

      {/* Prominent "+ New Post" Action Button */}
      <div className={cn('px-3 pt-4 pb-1', isSidebarCollapsed && 'px-2')}>
        <button
          type="button"
          onClick={() => openModal('CREATE_POST')}
          className={cn(
            'flex items-center justify-center gap-2 rounded-2xl font-bold transition-all shadow-md active:scale-95 cursor-pointer',
            'bg-gradient-to-r from-primary via-primary-600 to-primary-700 text-white shadow-primary/20 hover:shadow-primary/35 hover:brightness-105',
            isSidebarCollapsed ? 'h-11 w-11 mx-auto' : 'w-full py-2.5 px-4 text-sm'
          )}
          title="Create New Post"
          aria-label="Create New Post"
        >
          <Plus className={cn('h-5 w-5 stroke-[2.5]', !isSidebarCollapsed && 'h-4 w-4')} />
          {!isSidebarCollapsed && <span>New Post</span>}
        </button>
      </div>

      {/* Navigation links */}
      <div className="flex-1 overflow-y-auto py-3 px-3 space-y-1 custom-scrollbar">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group relative',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/25 font-semibold'
                    : 'text-muted-foreground hover:bg-primary-soft hover:text-primary'
                )
              }
            >
              {({ isActive }) => {
                const isNotif = item.to === '/app/notifications'
                const hasNotifBadge = isNotif && unreadCount > 0

                return (
                  <>
                    <div className="relative shrink-0 flex items-center justify-center">
                      <Icon className="h-5 w-5 transition-transform group-hover:scale-105" />
                      {hasNotifBadge && isSidebarCollapsed && (
                        <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-card animate-pulse" />
                      )}
                    </div>
                    {!isSidebarCollapsed && (
                      <div className="flex items-center justify-between flex-1 min-w-0">
                        <span className="truncate">{item.label}</span>
                        {hasNotifBadge && (
                          <span
                            className={cn(
                              'ml-2 flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold shadow-xs',
                              isActive
                                ? 'bg-primary-foreground text-primary'
                                : 'bg-primary text-primary-foreground'
                            )}
                          >
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </span>
                        )}
                      </div>
                    )}
                  </>
                )
              }}
            </NavLink>
          )
        })}

        {isStaff && (
          <div className="pt-4 mt-4 border-t border-border">
            <div className={cn('px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1', isSidebarCollapsed && 'hidden')}>
              Administration
            </div>
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                cn(
                  'flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all group',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/25'
                    : 'text-primary bg-primary-soft/50 hover:bg-primary-soft hover:text-primary'
                )
              }
            >
              <div className="flex items-center gap-3.5">
                <ShieldAlert className="h-5 w-5 shrink-0" />
                {!isSidebarCollapsed && (
                  <span>{user?.role === 'SUPPORT' ? 'Staff Console' : 'Admin Console'}</span>
                )}
              </div>
              {!isSidebarCollapsed && (
                <span className={cn(
                  'text-[10px] font-bold font-mono px-1.5 py-0.5 rounded uppercase',
                  user?.role === 'SUPPORT'
                    ? 'bg-sky-500/20 text-sky-500'
                    : 'bg-primary/20 text-primary'
                )}>
                  {user?.role === 'SUPER_ADMIN' ? 'Root' : user?.role === 'SUPPORT' ? 'Support' : 'Admin'}
                </span>
              )}
            </NavLink>
          </div>
        )}
      </div>

      {/* User public link quick action — card-first identity */}
      {!isSidebarCollapsed && (
        <div className="p-4 border-t border-border">
          {activeCardCode ? (
            <a
              href={`/p/c/${activeCardCode}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 rounded-xl bg-primary-soft/60 hover:bg-primary-soft text-primary text-xs font-semibold transition-colors group"
            >
              <span className="flex items-center gap-1.5 min-w-0">
                <Wifi className="h-3 w-3 shrink-0" />
                <span className="truncate">onewinq.me/p/c/{activeCardCode}</span>
              </span>
              <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-70 group-hover:opacity-100" />
            </a>
          ) : (
            <NavLink
              to="/app/cards"
              className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/15 text-amber-600 dark:text-amber-400 text-xs font-semibold transition-colors group"
            >
              <span className="truncate">Activate card to go live</span>
              <CreditCard className="h-3.5 w-3.5 shrink-0 opacity-70 group-hover:opacity-100" />
            </NavLink>
          )}
        </div>
      )}
    </aside>
  )
}
