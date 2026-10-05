import * as React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Menu,
  Bell,
  LogOut,
  Settings,
  UserCircle,
  ExternalLink,
  Shield,
  HelpCircle,
  Plus,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { notificationsApi } from '@/features/notifications/api/notifications.api'
import { queryKeys } from '@/lib/query/queryKeys'
import { authApi } from '@/features/auth/api/auth.api'
import { toast } from '@/stores/toastStore'
import { disconnectSocket } from '@/lib/socket/socketClient'
import { cn } from '@/lib/utils/cn'
import { BrandLogo } from './BrandLogo'

export function AppHeader() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const { toggleSidebar, setMobileMenuOpen, openModal } = useUIStore()
  const [isUserMenuOpen, setIsUserMenuOpen] = React.useState(false)
  const isStaff = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' || user?.role === 'SUPPORT'
  const { data: unreadData } = useQuery({
    queryKey: queryKeys.notifications.unreadCount,
    queryFn: () => notificationsApi.getUnreadCount(),
    refetchInterval: 30000, // Background poll every 30s
  })

  const unreadCount = unreadData?.data?.unreadCount ?? unreadData?.data?.count ?? 0


  const handleLogout = async () => {
    try {
      await authApi.logout()
    } catch {
      // Clean up even if request fails
    } finally {
      disconnectSocket()
      logout()
      toast.default('You have been signed out.')
      navigate('/login')
    }
  }

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-border bg-card/85 px-3 sm:px-6 backdrop-blur-md">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Mobile Hamburger Menu Button */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="rounded-xl p-2 text-foreground bg-muted/60 hover:bg-muted active:scale-95 transition-all lg:hidden flex items-center justify-center border border-border/60 shadow-xs shrink-0"
          aria-label="Open navigation menu"
          title="Open Menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Desktop Sidebar Toggle */}
        <button
          type="button"
          onClick={toggleSidebar}
          className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground hidden lg:inline-flex transition-colors"
          aria-label="Toggle sidebar"
          title="Toggle Sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Mobile Brand Logo */}
        <BrandLogo to="/app" className="lg:hidden shrink-0" imgClassName="h-6 sm:h-7" />

        {/* Workspace Title & Badge — desktop only */}
        <div className="hidden sm:flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground hidden lg:inline">
            Workspace
          </span>
          <span className="text-muted-foreground text-xs hidden lg:inline">/</span>
          {isStaff ? (
            <Link to="/admin">
              <Badge
                variant={user?.role === 'SUPPORT' ? 'default' : 'destructive'}
                className={cn(
                  'text-[11px] font-bold tracking-wide cursor-pointer hover:opacity-90 flex items-center gap-1',
                  user?.role === 'SUPPORT' && 'bg-sky-500 hover:bg-sky-600 text-white'
                )}
              >
                <Shield className="h-3 w-3" />
                <span>
                  {user?.role === 'SUPER_ADMIN'
                    ? 'SUPER ADMIN'
                    : user?.role === 'SUPPORT'
                    ? 'SUPPORT'
                    : 'ADMIN'}
                </span>
              </Badge>
            </Link>
          ) : (
            <Badge variant="subtle" className="text-[11px] font-medium tracking-wide">
              PRO MEMBER
            </Badge>
          )}
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-1.5 sm:gap-3">
        {/* Admin/Staff Console Direct Button — hidden on mobile (accessible via drawer) */}
        {isStaff && (
          <Link
            to="/admin"
            className={cn(
              'hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white shadow-sm transition-all',
              user?.role === 'SUPPORT'
                ? 'bg-sky-600 hover:bg-sky-700'
                : 'bg-primary hover:bg-primary-hover'
            )}
          >
            <Shield className="h-3.5 w-3.5" />
            <span>{user?.role === 'SUPPORT' ? 'Staff Console' : 'Admin Console'}</span>
          </Link>
        )}

        {/* Quick view public profile */}
        {user?.username && (
          <a
            href={`/u/${user.username}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-primary bg-primary-soft hover:bg-primary-muted transition-colors"
          >
            <span>View Profile</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        )}

        {/* Quick New Post Action */}
        <button
          type="button"
          onClick={() => openModal('CREATE_POST')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-primary to-primary-600 hover:from-primary-600 hover:to-primary-700 shadow-sm shadow-primary/20 transition-all active:scale-95 cursor-pointer"
          title="Create New Post"
        >
          <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
          <span className="hidden sm:inline">Post</span>
        </button>

        {/* Notifications Icon with Unread Badge */}
        <Link
          to="/app/notifications"
          className="relative rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white shadow-sm">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>

        {/* User Avatar Menu Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-2 rounded-full ring-2 ring-transparent hover:ring-primary/20 transition-all p-0.5 focus:outline-none"
          >
            <Avatar
              size="sm"
              src={user?.avatarUrl}
              fallback={user?.displayName || user?.username}
              alt={user?.displayName}
            />
          </button>

          {isUserMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsUserMenuOpen(false)}
              />
              <div className="absolute right-0 top-12 z-50 w-60 rounded-2xl border border-border bg-card p-2 shadow-2xl animate-in fade-in-0 zoom-in-95">
                <div className="px-3 py-2.5 border-b border-border mb-1 flex items-center gap-3">
                  <Avatar
                    size="sm"
                    src={user?.avatarUrl}
                    fallback={user?.displayName || user?.username}
                    alt={user?.displayName}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-foreground truncate">
                      {user?.displayName}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      @{user?.username}
                    </div>
                  </div>
                </div>

                <Link
                  to="/app/profile"
                  onClick={() => setIsUserMenuOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-foreground/80 hover:bg-primary-soft hover:text-primary transition-colors"
                >
                  <UserCircle className="h-4 w-4" />
                  <span>My Profile</span>
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    setIsUserMenuOpen(false)
                    setMobileMenuOpen(true)
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-foreground/80 hover:bg-primary-soft hover:text-primary transition-colors lg:hidden text-left"
                >
                  <Menu className="h-4 w-4" />
                  <span>All Sections & Menu</span>
                </button>

                <Link
                  to="/app/settings"
                  onClick={() => setIsUserMenuOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-foreground/80 hover:bg-primary-soft hover:text-primary transition-colors"
                >
                  <Settings className="h-4 w-4" />
                  <span>Settings & Privacy</span>
                </Link>

                <Link
                  to="/app/support"
                  onClick={() => setIsUserMenuOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-foreground/80 hover:bg-primary-soft hover:text-primary transition-colors"
                >
                  <HelpCircle className="h-4 w-4" />
                  <span>Support Tickets</span>
                </Link>

                {(user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
                  <Link
                    to="/admin"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-primary font-medium hover:bg-primary-soft transition-colors"
                  >
                    <Shield className="h-4 w-4" />
                    <span>Admin Panel</span>
                  </Link>
                )}

                <div className="pt-1 mt-1 border-t border-border">
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false)
                      handleLogout()
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
