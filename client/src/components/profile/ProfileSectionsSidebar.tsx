import * as React from 'react'
import { Link } from 'react-router-dom'
import {
  X,
  ChevronRight,
  Layers,
  Share2,
  Edit3,
  Sun,
  Moon,
  ExternalLink,
} from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { useTheme } from '@/app/providers/ThemeProvider'
import { cn } from '@/lib/utils/cn'

export interface ProfileSectionTab {
  id: string
  label: string
  icon: React.ReactNode
  count?: number
  description?: string
}

export interface ProfileSectionsSidebarProps {
  isOpen: boolean
  onClose: () => void
  tabs: ProfileSectionTab[]
  activeTab: string
  onSelectTab: (tabId: string) => void
  user: {
    displayName?: string
    username?: string
    avatarUrl?: string
    headline?: string
  }
  isSelf?: boolean
  onShareClick?: () => void
  editProfileUrl?: string
}

function getDefaultTabDescription(tabId: string, label: string): string {
  switch (tabId) {
    case 'home':
      return 'Main identity card, headline & bio'
    case 'experience':
      return 'Work history & career timeline'
    case 'education':
      return 'Academic qualifications & degrees'
    case 'portfolio':
      return 'Featured projects & services'
    case 'media':
      return 'Featured videos & publications'
    case 'documents':
      return 'Private files & documents'
    case 'posts':
      return 'Community posts & activity'
    case 'custom':
      return 'Custom profile section blocks'
    default:
      return `View ${label.toLowerCase()}`
  }
}

export function ProfileSectionsSidebar({
  isOpen,
  onClose,
  tabs,
  activeTab,
  onSelectTab,
  user,
  isSelf,
  onShareClick,
  editProfileUrl = '/app/profile/edit',
}: ProfileSectionsSidebarProps) {
  const { resolvedTheme, toggleTheme } = useTheme()

  // Close on Escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Lock body scroll when sidebar is open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50" aria-modal="true" role="dialog">
      {/* Backdrop Overlay */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar Drawer Panel (Slides in from the left) */}
      <aside className="fixed inset-y-0 left-0 w-[86vw] max-w-sm bg-card text-foreground border-r border-border shadow-2xl flex flex-col z-50 animate-in slide-in-from-left duration-300 ease-out">
        {/* Sidebar Header: User Identity Preview */}
        <div className="p-4 sm:p-5 border-b border-border bg-gradient-to-b from-primary/10 via-primary/5 to-transparent flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar
              src={user.avatarUrl}
              fallback={user.displayName || 'User'}
              className="h-12 w-12 rounded-full ring-2 ring-primary/30 shrink-0 shadow-sm"
            />
            <div className="min-w-0 flex-1">
              <h2 className="font-bold text-sm sm:text-base text-foreground truncate leading-snug">
                {user.displayName || 'User Profile'}
              </h2>
              {user.username && (
                <p className="text-xs text-muted-foreground truncate leading-snug">
                  @{user.username}
                </p>
              )}
              {user.headline && (
                <p className="text-[11px] text-muted-foreground/90 truncate leading-snug pt-0.5">
                  {user.headline}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors shrink-0"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Section Heading Bar */}
        <div className="px-4 sm:px-5 py-2.5 flex items-center justify-between border-b border-border/60 bg-muted/30">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            <Layers className="h-3.5 w-3.5 text-primary" />
            <span>Profile Sections</span>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
            {tabs.length} tabs
          </span>
        </div>

        {/* Navigation Tabs List */}
        <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-3 space-y-1.5 custom-scrollbar">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id
            const description = tab.description || getDefaultTabDescription(tab.id, tab.label)

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  onSelectTab(tab.id)
                  onClose()
                }}
                className={cn(
                  'w-full flex items-center justify-between p-3 rounded-2xl border text-left transition-all cursor-pointer group',
                  isActive
                    ? 'border-primary bg-primary text-white font-bold shadow-md shadow-primary/25'
                    : 'border-border/60 bg-card hover:bg-muted hover:border-border text-foreground'
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={cn(
                      'p-2 rounded-xl shrink-0 transition-colors',
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-primary/10 text-primary group-hover:bg-primary/15'
                    )}
                  >
                    {tab.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm font-bold truncate">{tab.label}</div>
                    <div
                      className={cn(
                        'text-[10px] sm:text-[11px] truncate',
                        isActive ? 'text-white/80' : 'text-muted-foreground'
                      )}
                    >
                      {description}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-2">
                  {tab.count !== undefined && (
                    <span
                      className={cn(
                        'text-[10px] px-2 py-0.5 rounded-full font-mono font-bold',
                        isActive
                          ? 'bg-white/25 text-white'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {tab.count}
                    </span>
                  )}
                  <ChevronRight
                    className={cn(
                      'h-4 w-4 transition-transform',
                      isActive
                        ? 'text-white translate-x-0.5'
                        : 'text-muted-foreground group-hover:text-foreground'
                    )}
                  />
                </div>
              </button>
            )
          })}
        </div>

        {/* Sidebar Footer with Quick Actions */}
        <div className="p-3 sm:p-4 border-t border-border bg-card/60 space-y-2">
          <div className="flex items-center gap-2">
            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-border bg-muted/40 hover:bg-muted text-xs font-semibold text-foreground transition-all cursor-pointer"
            >
              {resolvedTheme === 'dark' ? (
                <>
                  <Sun className="h-4 w-4 text-amber-400" />
                  <span>Light Mode</span>
                </>
              ) : (
                <>
                  <Moon className="h-4 w-4 text-purple-600" />
                  <span>Dark Mode</span>
                </>
              )}
            </button>

            {/* Share Profile Button */}
            {onShareClick && (
              <button
                type="button"
                onClick={() => {
                  onShareClick()
                  onClose()
                }}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-border bg-muted/40 hover:bg-muted text-xs font-semibold text-foreground transition-all cursor-pointer"
                title="Share Profile"
              >
                <Share2 className="h-4 w-4" />
                <span>Share</span>
              </button>
            )}
          </div>

          {/* Edit Profile Link (If owner) */}
          {isSelf && (
            <Link
              to={editProfileUrl}
              onClick={onClose}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold transition-all"
            >
              <Edit3 className="h-3.5 w-3.5" />
              <span>Edit Profile Details</span>
            </Link>
          )}

          <div className="pt-1 text-center">
            <span className="text-[10px] text-muted-foreground/70">
              OneWinq Digital Identity Network
            </span>
          </div>
        </div>
      </aside>
    </div>
  )
}
