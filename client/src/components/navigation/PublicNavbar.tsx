import { Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { ArrowRight, LayoutDashboard } from 'lucide-react'
import { BrandLogo } from './BrandLogo'

export function PublicNavbar() {
  const { isAuthenticated, user } = useAuthStore()

  return (
    <header className="sticky top-0 z-50 w-full bg-transparent">
      <div className="container mx-auto flex h-20 items-center justify-between px-6 lg:px-12">
        {/* Brand Logo */}
        <BrandLogo to="/" variant="white" imgClassName="h-7 sm:h-8" />

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center space-x-9 text-sm font-medium text-white/80">
          <a href="#why" className="hover:text-white transition-colors">
            Why OneWinq
          </a>
          <a href="#profiles" className="hover:text-white transition-colors">
            Profiles
          </a>
          <a href="#sharing" className="hover:text-white transition-colors">
            Sharing
          </a>
          <a href="#network" className="hover:text-white transition-colors">
            Network
          </a>
          <a href="#organizations" className="hover:text-white transition-colors">
            For Organizations
          </a>
        </nav>

        {/* Action Button */}
        <div className="flex items-center space-x-4">
          {isAuthenticated ? (
            <Link to="/app">
              <button className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium bg-white/15 hover:bg-white/25 text-white backdrop-blur-md border border-white/20 transition-all">
                <LayoutDashboard className="h-4 w-4" />
                <span>Dashboard ({user?.displayName?.split(' ')[0] || 'App'})</span>
              </button>
            </Link>
          ) : (
            <Link to="/signup">
              <button className="inline-flex items-center gap-1.5 rounded-full px-5 py-2 text-sm font-medium bg-gradient-to-r from-purple-500/80 to-purple-400/80 hover:from-purple-500 hover:to-purple-400 text-white backdrop-blur-md shadow-md shadow-purple-900/30 transition-all active:scale-95">
                <span>Get started</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
