import * as React from 'react'
import { Outlet, NavLink, Link, useNavigate, useLocation } from 'react-router-dom'
import { BrandLogo } from '@/components/navigation/BrandLogo'
import {
  LayoutDashboard,
  Users,
  CreditCard,
  History,
  ShieldAlert,
  HelpCircle,
  LayoutTemplate,
  ArrowLeft,
  LogOut,
  Package,
  Menu,
  X,
  Shield,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useAuthStore } from '@/stores/authStore'
import { authApi } from '@/features/auth/api/auth.api'
import { toast } from '@/stores/toastStore'
import { disconnectSocket } from '@/lib/socket/socketClient'

export function AdminLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuthStore()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false)

  React.useEffect(() => {
    document.documentElement.classList.add('dark')
    return () => {
      document.documentElement.classList.remove('dark')
    }
  }, [])

  // Auto-close mobile drawer on route change
  React.useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [location.pathname])

  // Close drawer on ESC key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileMenuOpen) {
        setIsMobileMenuOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isMobileMenuOpen])

  // Lock body scroll when mobile drawer is open
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

  const isSuperOrAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN'
  const roleBadgeLabel = user?.role === 'SUPER_ADMIN' ? 'SUPER ADMIN' : user?.role === 'SUPPORT' ? 'SUPPORT' : 'ADMIN'
  const roleSubtitle = user?.role === 'SUPER_ADMIN' ? 'Super Administrator' : user?.role === 'SUPPORT' ? 'Support Agent' : 'Administrator'
  const roleBadgeBg = user?.role === 'SUPPORT' ? 'bg-sky-500' : 'bg-primary'

  const links = [
    { label: 'Overview', to: '/admin', end: true, icon: LayoutDashboard },
    { label: 'User Management', to: '/admin/users', icon: Users },
    { label: 'Profile Templates', to: '/admin/templates', icon: LayoutTemplate },
    { label: 'Manage Cards', to: '/admin/cards', icon: CreditCard },
    { label: 'Hardware Orders', to: '/admin/orders', icon: Package },
    { label: 'Abuse Reports', to: '/admin/reports', icon: ShieldAlert },
    { label: 'Support Tickets', to: '/admin/support', icon: HelpCircle },
    ...(isSuperOrAdmin ? [{ label: 'Audit Logs', to: '/admin/audit', icon: History }] : []),
  ]

  const handleLogout = async () => {
    setIsMobileMenuOpen(false)
    try {
      await authApi.logout()
    } finally {
      disconnectSocket()
      logout()
      toast.default('Signed out.')
      navigate('/login')
    }
  }

  return (
    <div className="dark min-h-screen flex flex-col md:flex-row bg-[#0b0b10] text-white w-full overflow-x-clip">
      {/* Mobile Top Header / Menu Bar */}
      <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-white/10 bg-[#101016]/95 px-4 backdrop-blur-md md:hidden">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="flex items-center justify-center p-2 rounded-xl text-white/80 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 active:scale-95 transition-all"
            aria-label="Toggle admin menu"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <div className="flex items-center gap-2">
            <BrandLogo to="/admin" variant="white" imgClassName="h-6 sm:h-7" />
            <span className={cn('text-[10px] font-bold tracking-wider px-2 py-0.5 rounded text-white uppercase', roleBadgeBg)}>
              {roleBadgeLabel}
            </span>
          </div>
        </div>

        <Link
          to="/app"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white/80 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>App</span>
        </Link>
      </header>

      {/* Mobile Slide-Out Navigation Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden" aria-modal="true" role="dialog">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer content */}
          <aside className="fixed inset-y-0 left-0 w-[84vw] max-w-xs bg-[#101016] border-r border-white/10 p-5 flex flex-col justify-between shadow-2xl z-50 animate-in slide-in-from-left duration-300 ease-out">
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <BrandLogo to="/admin" variant="white" imgClassName="h-6 sm:h-7" />
                  <span className={cn('text-[10px] font-bold tracking-wider px-2 py-0.5 rounded text-white uppercase', roleBadgeBg)}>
                    {roleBadgeLabel}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="rounded-full p-2 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Admin user info banner */}
              <div className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2.5">
                <Shield className={cn('h-4 w-4 shrink-0', user?.role === 'SUPPORT' ? 'text-sky-400' : 'text-primary')} />
                <div className="min-w-0 flex-1 text-xs">
                  <div className="font-semibold text-white truncate">
                    {user?.displayName || user?.username}
                  </div>
                  <div className="text-[11px] text-white/50 truncate">
                    {roleSubtitle}
                  </div>
                </div>
              </div>

              {/* Navigation links */}
              <nav className="space-y-1">
                {links.map((item) => {
                  const Icon = item.icon
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-primary text-white font-semibold shadow-sm shadow-primary/30'
                            : 'text-white/60 hover:bg-white/5 hover:text-white'
                        )
                      }
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{item.label}</span>
                    </NavLink>
                  )
                })}
              </nav>
            </div>

            <div className="pt-4 border-t border-white/10 space-y-2">
              <Link
                to="/app"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-white/70 hover:text-white hover:bg-white/5 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Return to User App</span>
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Desktop Sidebar (hidden on mobile) */}
      <aside className="hidden md:flex md:w-64 border-r border-white/10 bg-[#101016] p-4 flex-col justify-between h-screen sticky top-0 shrink-0 select-none">
        <div className="space-y-6">
          <div className="px-3 py-2 flex items-center justify-between">
            <BrandLogo to="/admin" variant="white" imgClassName="h-7 sm:h-8" />
            <span className={cn('text-[10px] font-bold tracking-wider px-2 py-0.5 rounded text-white uppercase', roleBadgeBg)}>
              {roleBadgeLabel}
            </span>
          </div>

          <nav className="space-y-1">
            {links.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary text-white font-semibold'
                        : 'text-white/60 hover:bg-white/5 hover:text-white'
                    )
                  }
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </NavLink>
              )
            })}
          </nav>
        </div>

        <div className="pt-4 border-t border-white/10 space-y-2">
          <Link
            to="/app"
            className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs text-white/60 hover:text-white hover:bg-white/5 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Return to User App</span>
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Admin Content View */}
      <main className="flex-1 min-w-0 p-3.5 sm:p-6 md:p-10 max-w-7xl w-full mx-auto overflow-y-auto overflow-x-clip">
        <Outlet />
      </main>
    </div>
  )
}
