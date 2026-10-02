import * as React from 'react'
import { NavLink, Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  X,
  LayoutDashboard,
  Flame,
  Compass,
  UserCircle,
  LayoutTemplate,
  Users,
  MessageSquare,
  Bell,
  BarChart3,
  CreditCard,
  Package,
  Settings,
  HelpCircle,
  ShieldAlert,
  LogOut,
  ExternalLink,
  Plus,
  Edit3,
  Download,
} from 'lucide-react'
import { triggerPWAInstall } from '@/components/pwa/InstallAppPrompt'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { BrandLogo } from './BrandLogo'
import { notificationsApi } from '@/features/notifications/api/notifications.api'
import { queryKeys } from '@/lib/query/queryKeys'
import { authApi } from '@/features/auth/api/auth.api'
import { toast } from '@/stores/toastStore'
import { disconnectSocket } from '@/lib/socket/socketClient'
import { cn } from '@/lib/utils/cn'

interface NavItem {
  label: string
  to: string
  icon: React.ComponentType<{ className?: string }>
  end?: boolean
  badge?: string
  highlight?: boolean
}

interface NavGroup {
  title: string
  items: NavItem[]
}

export function MobileMenuDrawer() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const { isMobileMenuOpen, setMobileMenuOpen, openModal } = useUIStore()
  const isStaff = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' || user?.role === 'SUPPORT'

  // Unread notifications count
  const { data: unreadData } = useQuery({
    queryKey: queryKeys.notifications.unreadCount,
    queryFn: () => notificationsApi.getUnreadCount(),
    refetchInterval: 30000,
  })

  const unreadCount = unreadData?.data?.unreadCount ?? unreadData?.data?.count ?? 0

  // Close drawer on ESC key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileMenuOpen) {
        setMobileMenuOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isMobileMenuOpen, setMobileMenuOpen])

  // Lock body scroll when drawer is open
  React.useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isMobileMenuOpen])

  const handleClose = () => {
    setMobileMenuOpen(false)
  }

  const handleLogout = async () => {
    handleClose()
    try {
      await authApi.logout()
    } catch {
      // ignore
    } finally {
      disconnectSocket()
      logout()
      toast.default('You have been signed out.')
      navigate('/login')
    }
  }

  const navGroups: NavGroup[] = [
    {
      title: 'Workspace',
      items: [
        { label: 'Home Feed', to: '/app', icon: Flame, end: true },
        { label: 'Dashboard & Stats', to: '/app/dashboard', icon: LayoutDashboard },
        { label: 'Discover People', to: '/app/network', icon: Compass },
        { label: 'My Profile', to: '/app/profile', icon: UserCircle },
        { label: 'Profile Templates', to: '/app/templates', icon: LayoutTemplate, highlight: true },
      ],
    },
    {
      title: 'Networking & Connect',
      items: [
        { label: 'Connections', to: '/app/connections', icon: Users },
        { label: 'Messages', to: '/app/messages', icon: MessageSquare },
        {
          label: 'Notifications',
          to: '/app/notifications',
          icon: Bell,
          badge: unreadCount > 0 ? (unreadCount > 9 ? '9+' : `${unreadCount}`) : undefined,
        },
      ],
    },
    {
      title: 'Digital Cards & Assets',
      items: [
        { label: 'Analytics', to: '/app/analytics', icon: BarChart3 },
        { label: 'Manage Cards', to: '/app/cards', icon: CreditCard },
        { label: 'Orders & Hardware', to: '/app/orders', icon: Package },
      ],
    },
    {
      title: 'Account & Support',
      items: [
        { label: 'Settings', to: '/app/settings', icon: Settings },
        { label: 'Help & Support', to: '/app/support', icon: HelpCircle },
      ],
    },
  ]

  if (!isMobileMenuOpen) return null

  return (
    <div className="fixed inset-0 z-50 lg:hidden" aria-modal="true" role="dialog">
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Drawer content panel */}
      <aside className="fixed inset-y-0 left-0 w-[84vw] max-w-sm bg-card border-r border-border shadow-2xl flex flex-col z-50 animate-in slide-in-from-left duration-300 ease-out">
        {/* Drawer Header */}
        <div className="flex h-16 items-center justify-between px-5 border-b border-border bg-card/50">
          <BrandLogo showTagline />
          <button
            type="button"
            onClick={handleClose}
            className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* User Profile Card */}
        <div className="p-4 border-b border-border bg-muted/20">
          <div className="flex items-center gap-3">
            <Avatar
              size="md"
              src={user?.avatarUrl}
              fallback={user?.displayName || user?.username}
              alt={user?.displayName}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-foreground text-sm truncate">
                  {user?.displayName || user?.username}
                </span>
                {isStaff ? (
                  <Badge
                    variant={user?.role === 'SUPPORT' ? 'default' : 'destructive'}
                    className={cn(
                      'text-[10px] px-1.5 py-0 font-bold shrink-0',
                      user?.role === 'SUPPORT' && 'bg-sky-500 text-white'
                    )}
                  >
                    {user?.role === 'SUPER_ADMIN' ? 'SUPER ADMIN' : user?.role === 'SUPPORT' ? 'SUPPORT' : 'ADMIN'}
                  </Badge>
                ) : (
                  <Badge variant="subtle" className="text-[10px] px-1.5 py-0 font-medium shrink-0">
                    PRO
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">
                @{user?.username}
              </p>
            </div>
          </div>

          {/* Quick profile actions */}
          <div className="mt-3 flex items-center gap-2">
            {user?.username && (
              <a
                href={`/u/${user.username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs font-semibold text-primary bg-primary-soft hover:bg-primary-muted transition-colors truncate"
              >
                <span className="truncate">View Public</span>
                <ExternalLink className="h-3 w-3 shrink-0" />
              </a>
            )}
            <Link
              to="/app/profile/edit"
              onClick={handleClose}
              className="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80 transition-colors"
            >
              <Edit3 className="h-3 w-3" />
              <span>Edit</span>
            </Link>
          </div>
        </div>

        {/* Prominent Action Button */}
        <div className="px-4 pt-3 pb-1">
          <button
            type="button"
            onClick={() => {
              handleClose()
              openModal('CREATE_POST')
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-primary via-primary-600 to-primary-700 shadow-md shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-[0.98] cursor-pointer"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span>Create New Post</span>
          </button>
        </div>

        {/* Navigation Sections List */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-4 custom-scrollbar">
          {navGroups.map((group) => (
            <div key={group.title} className="space-y-1">
              <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                {group.title}
              </div>
              {group.items.map((item) => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={handleClose}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/25 font-semibold'
                          : 'text-muted-foreground hover:bg-primary-soft hover:text-primary'
                      )
                    }
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </div>

                    {item.badge && (
                      <span className="flex h-5 min-w-5 px-1.5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white shadow-sm">
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                )
              })}
            </div>
          ))}

          {/* Admin / Staff Console Section if user is Staff */}
          {isStaff && (
            <div className="space-y-1 pt-2 border-t border-border">
              <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                Administration
              </div>
              <NavLink
                to="/admin"
                onClick={handleClose}
                className={({ isActive }) =>
                  cn(
                    'flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/25'
                      : 'text-primary bg-primary-soft/50 hover:bg-primary-soft hover:text-primary'
                  )
                }
              >
                <div className="flex items-center gap-3">
                  <ShieldAlert className="h-4 w-4 shrink-0" />
                  <span>{user?.role === 'SUPPORT' ? 'Staff Console' : 'Admin Console'}</span>
                </div>
                <span className={cn(
                  'text-[10px] font-bold font-mono px-1.5 py-0.5 rounded uppercase',
                  user?.role === 'SUPPORT'
                    ? 'bg-sky-500/20 text-sky-500'
                    : 'bg-primary/20 text-primary'
                )}>
                  {user?.role === 'SUPER_ADMIN' ? 'Root' : user?.role === 'SUPPORT' ? 'Support' : 'Admin'}
                </span>
              </NavLink>
            </div>
          )}
        </nav>

        {/* Install App Shortcut Banner */}
        <div className="px-3 py-2 border-t border-border bg-card/30">
          <button
            type="button"
            onClick={() => {
              handleClose()
              setTimeout(() => {
                triggerPWAInstall()
              }, 120)
            }}
            className="w-full flex items-center justify-between p-2.5 rounded-xl bg-primary/10 hover:bg-primary/15 border border-primary/25 text-primary text-xs font-semibold transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-1 rounded-lg bg-primary/20">
                <Download className="h-3.5 w-3.5" />
              </div>
              <div className="text-left">
                <div className="font-bold leading-tight">Install OneWinq App</div>
                <div className="text-[10px] text-muted-foreground font-normal">Fast, offline-ready home screen app</div>
              </div>
            </div>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary text-white">
              Install
            </span>
          </button>
        </div>

        {/* Drawer Footer with Logout */}
        <div className="p-4 border-t border-border bg-card/50 flex items-center justify-between">
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive/10 rounded-xl transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </button>
          <span className="text-[10px] font-medium text-muted-foreground">
            OneWinq v2.0
          </span>
        </div>
      </aside>
    </div>
  )
}
