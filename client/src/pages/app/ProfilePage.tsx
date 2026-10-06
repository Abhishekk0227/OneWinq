import * as React from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { profileApi } from '@/features/profile/api/profile.api'
import { queryKeys } from '@/lib/query/queryKeys'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog'
import { LoadingScreen } from '@/components/common/LoadingScreen'
import { ErrorState } from '@/components/common/ErrorState'
import { toast } from '@/stores/toastStore'
import { VISIBILITY_MODE, type VisibilityMode } from '@/constants/app.constants'
import {
  Edit3,
  ExternalLink,
  Eye,
  Briefcase,
  Lock,
  Clock,
  CheckCircle2,
  Award,
  Layers,
  Sparkles,
  XCircle,
  Share2,
  Crown,
  GraduationCap,
  MapPin,
  Globe,
  Mail,
  Phone,
  FileText,
  LayoutTemplate,
  Wifi,
  ChevronDown,
  Flame,
  Home,
  ArrowLeft,
  ChevronRight,
  Menu,
  Code,
  Video,
} from 'lucide-react'
import { cardsApi } from '@/features/cards/api/cards.api'
import { postsApi } from '@/features/posts/api/posts.api'
import { PostCard } from '@/components/posts/PostCard'
import { formatDateRange, formatMonthYear } from '@/utils/dateFormatter'

function SocialBrandIcon({ platform, url, className = "h-4 w-4" }: { platform?: string; url?: string; className?: string }) {
  const name = (platform || url || '').toLowerCase()

  if (name.includes('instagram')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="24" height="24" rx="6" fill="url(#ig-grad-app)" />
        <path d="M12 7.5C9.51472 7.5 7.5 9.51472 7.5 12C7.5 14.4853 9.51472 16.5 12 16.5C14.4853 16.5 16.5 14.4853 16.5 12C16.5 9.51472 14.4853 7.5 12 7.5ZM12 15C10.3431 15 9 13.6569 9 12C9 10.3431 10.3431 9 12 9C13.6569 9 15 10.3431 15 12C15 13.6569 13.6569 15 12 15Z" fill="white"/>
        <circle cx="16.5" cy="7.5" r="1" fill="white"/>
        <rect x="4.5" y="4.5" width="15" height="15" rx="4.5" stroke="white" strokeWidth="1.5"/>
        <defs>
          <radialGradient id="ig-grad-app" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(6 22) rotate(-55) scale(25 25)">
            <stop stopColor="#FFDD55"/>
            <stop offset="0.2" stopColor="#FF543E"/>
            <stop offset="0.4" stopColor="#C837AB"/>
            <stop offset="0.7" stopColor="#5851DB"/>
          </radialGradient>
        </defs>
      </svg>
    )
  }

  if (name.includes('linkedin')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="#0A66C2">
        <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
      </svg>
    )
  }

  if (name.includes('twitter') || name.includes('x.com') || name.includes(' x ')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    )
  }

  if (name.includes('github')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
      </svg>
    )
  }

  if (name.includes('youtube')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="#FF0000">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    )
  }

  if (name.includes('facebook')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="#1877F2">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    )
  }

  if (name.includes('whatsapp')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="#25D366">
        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-1.199 4.38 4.542-1.192z"/>
      </svg>
    )
  }

  if (name.includes('telegram')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="#24A1DE">
        <path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm5.562 8.161c-.18 1.897-.962 6.502-1.359 8.627-.168.9-.5 1.201-.82 1.23-.697.064-1.226-.461-1.901-.903-1.056-.692-1.653-1.123-2.678-1.799-1.185-.781-.417-1.21.258-1.911.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.324-.437.893-.663 3.498-1.524 5.831-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635.099-.002.321.023.465.141.119.098.152.228.166.331.016.118.034.349.02.542z"/>
      </svg>
    )
  }

  if (name.includes('site') || name.includes('web') || name.includes('http')) {
    return <Globe className={`${className} text-sky-500`} />
  }

  return <Share2 className={`${className} text-primary`} />
}

export default function ProfilePage() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  // Active Section Tab Tracker
  const [activeTab, setActiveTab] = React.useState<string>('home')
  const [isMenuDropdownOpen, setIsMenuDropdownOpen] = React.useState(false)

  // State for Temporary Mode Modal
  const [isTempModalOpen, setIsTempModalOpen] = React.useState(false)
  const [tempMode, setTempMode] = React.useState<VisibilityMode>(VISIBILITY_MODE.PROFESSIONAL)
  const [tempHours, setTempHours] = React.useState<number>(4)
  const [tempFallback, setTempFallback] = React.useState<VisibilityMode>(VISIBILITY_MODE.PUBLIC)

  // State for Preview Modal
  const [isPreviewOpen, setIsPreviewOpen] = React.useState(false)
  const [previewMode, setPreviewMode] = React.useState<VisibilityMode>(VISIBILITY_MODE.PUBLIC)

  // Active presentation mode state for instant UI responsiveness
  const [selectedMode, setSelectedMode] = React.useState<VisibilityMode | null>(null)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.profile.me,
    queryFn: () => profileApi.getMyProfile(),
  })

  const { data: userCardsData } = useQuery({
    queryKey: ['cards', 'my'],
    queryFn: () => cardsApi.listCards(),
  })
  const userCards = (userCardsData?.data as any)?.cards || []
  const activeUserCard = userCards.find((c: any) => c.state === 'ACTIVE' || c.status === 'ACTIVE')

  // Template & Recommendations Query
  const { data: recData } = useQuery({
    queryKey: ['profile-recommendations'],
    queryFn: () => profileApi.getRecommendations(),
  })
  const currentTemplate = recData?.data?.activeTemplate || (data?.data?.profile as any)?.templateId

  // Mode Switch Mutation
  const setModeMutation = useMutation({
    mutationFn: (mode: VisibilityMode) => profileApi.setActiveMode(mode),
    onSuccess: (res) => {
      const newMode = (res.data?.profile?.activeMode || res.data?.activeMode) as VisibilityMode | undefined
      if (newMode) setSelectedMode(newMode)
      queryClient.setQueryData(queryKeys.profile.me, (old: any) => {
        if (!old) return res
        return {
          ...old,
          data: {
            ...old.data,
            profile: {
              ...(old.data?.profile || {}),
              activeMode: newMode,
            },
          },
        }
      })
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.me })
      toast.success(`Switched active presentation to ${newMode || 'selected'} mode.`)
    },
    onError: (err: unknown) => {
      const apiErr = err as { message?: string }
      toast.error(apiErr.message || 'Failed to update active mode')
    },
  })

  // Publish Mutation
  const publishMutation = useMutation({
    mutationFn: () => profileApi.publish(),
    onSuccess: (res) => {
      queryClient.setQueryData(queryKeys.profile.me, res)
      toast.success('Your profile changes are now published live!')
    },
    onError: (err: unknown) => {
      const apiErr = err as { message?: string }
      toast.error(apiErr.message || 'Failed to publish profile')
    },
  })

  // Set Temporary Mode Mutation
  const setTemporaryModeMutation = useMutation({
    mutationFn: () =>
      profileApi.setTemporaryMode({
        mode: tempMode,
        durationHours: tempHours,
        fallbackMode: tempFallback,
      }),
    onSuccess: (res) => {
      queryClient.setQueryData(queryKeys.profile.me, res)
      setIsTempModalOpen(false)
      toast.success(`Temporary ${tempMode} mode set for ${tempHours} hours!`)
    },
    onError: (err: unknown) => {
      const apiErr = err as { message?: string }
      toast.error(apiErr.message || 'Failed to activate temporary mode')
    },
  })

  // Cancel Temporary Mode Mutation
  const cancelTemporaryModeMutation = useMutation({
    mutationFn: () => profileApi.cancelTemporaryMode(),
    onSuccess: (res) => {
      queryClient.setQueryData(queryKeys.profile.me, res)
      toast.default('Temporary mode cancelled. Reverted to standard mode.')
    },
    onError: (err: unknown) => {
      const apiErr = err as { message?: string }
      toast.error(apiErr.message || 'Failed to cancel temporary mode')
    },
  })

  // Preview Query
  const { data: previewData, isLoading: isPreviewLoading, refetch: refetchPreview } = useQuery({
    queryKey: ['profile-preview', previewMode],
    queryFn: () => profileApi.getPreview(previewMode),
    enabled: isPreviewOpen,
  })

  const profile = data?.data?.profile
  const identities: any[] = (data?.data as any)?.identities || profile?.identities || []
  const rawMode = selectedMode || profile?.activeMode || VISIBILITY_MODE.PUBLIC
  const currentMode: VisibilityMode =
    String(rawMode).toUpperCase() === VISIBILITY_MODE.PRIVATE
      ? VISIBILITY_MODE.PRIVATE
      : String(rawMode).toUpperCase() === VISIBILITY_MODE.PROFESSIONAL
      ? VISIBILITY_MODE.PROFESSIONAL
      : VISIBILITY_MODE.PUBLIC

  // Profile Section Tabs configuration
  const experiences = profile?.experience || profile?.sections?.experience || []
  const education = profile?.education || profile?.sections?.education || []
  const projects = profile?.projects || profile?.sections?.projects || []
  const services = profile?.services || profile?.sections?.services || []
  const certifications = profile?.certifications || profile?.sections?.certifications || []
  const skills = profile?.skills || profile?.sections?.skills || []
  const awards = profile?.awards || profile?.sections?.awards || []
  const publications = profile?.publications || profile?.sections?.publications || []
  const customSections = profile?.customSections || []

  const hasExperience = experiences.length > 0
  const hasEducation = education.length > 0
  const hasPortfolio = projects.length > 0 || services.length > 0
  const hasMedia = certifications.length > 0 || skills.length > 0 || awards.length > 0 || publications.length > 0
  const hasCustom = customSections.length > 0

  const [isSectionsDrawerOpen, setIsSectionsDrawerOpen] = React.useState(false)

  const profileTabs = React.useMemo(() => {
    if (!profile) return []
    return [
      { id: 'home', label: 'Home', icon: <Home className="h-4 w-4" /> },
      ...(hasExperience ? [{ id: 'experience', label: 'Experience', icon: <Briefcase className="h-4 w-4" />, count: experiences.length }] : []),
      ...(hasEducation ? [{ id: 'education', label: 'Education', icon: <GraduationCap className="h-4 w-4" />, count: education.length }] : []),
      ...(hasPortfolio ? [{ id: 'portfolio', label: 'Work', icon: <Sparkles className="h-4 w-4" />, count: projects.length + services.length }] : []),
      ...(hasMedia ? [{ id: 'media', label: 'Credentials', icon: <Award className="h-4 w-4" />, count: certifications.length + skills.length + awards.length + publications.length }] : []),
      { id: 'posts', label: 'Posts & Activity', icon: <Flame className="h-4 w-4" /> },
      ...(hasCustom ? [{ id: 'custom', label: 'Custom', icon: <Layers className="h-4 w-4" />, count: customSections.length }] : []),
    ]
  }, [profile, hasExperience, hasEducation, hasPortfolio, hasMedia, hasCustom, experiences.length, education.length, projects.length, services.length, certifications.length, skills.length, awards.length, publications.length, customSections.length])

  if (isLoading) {
    return <LoadingScreen message="Loading your identity..." />
  }

  if (error || !profile) {
    return (
      <ErrorState
        title="Could not load profile"
        message="There was an issue fetching your profile details."
        onRetry={() => refetch()}
      />
    )
  }

  return (
    <div className="space-y-6 text-left max-w-6xl mx-auto pb-24 transition-colors duration-300">
      {/* Slim Top Alert: Card Activation Required (Only if card not active) */}
      {!activeUserCard && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-950 dark:text-amber-200 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
            <span>
              <strong>Physical NFC Smart Card Required to Go Live</strong> — Your profile is currently private.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link to="/app/cards">
              <Button size="xs" variant="default" className="text-xs h-7 px-3">
                Activate Card
              </Button>
            </Link>
            <Link to="/app/orders">
              <Button size="xs" variant="outline" className="text-xs h-7 px-3">
                Order Card
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Main Profile Canvas with Desktop Sidebar Navigation */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Desktop Navigation Sidebar */}
        <div className="hidden md:block md:col-span-3 space-y-4">
          <div className="sticky top-20 rounded-3xl border border-border bg-card p-4 shadow-sm space-y-3">
            <div className="px-2 py-1 text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border/60 pb-2">
              Profile Sections
            </div>

            <div className="space-y-1">
              {profileTabs.map((tab) => {
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all text-left cursor-pointer ${
                      isActive
                        ? 'bg-primary text-white shadow-md'
                        : 'text-foreground/80 hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      {tab.icon}
                      <span className="truncate">{tab.label}</span>
                    </div>
                    {tab.count !== undefined && (
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                          isActive ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {tab.count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Sidebar Compact User Pill */}
            <div className="pt-3 border-t border-border/60 flex items-center gap-2.5">
              <Avatar
                src={profile.avatarUrl}
                fallback={user?.displayName}
                alt={user?.displayName}
                size="sm"
                className="rounded-xl ring-1 ring-border shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-foreground truncate">{user?.displayName}</div>
                <div className="text-[10px] font-mono text-muted-foreground truncate">@{user?.username}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Main Content Canvas */}
        <div className="md:col-span-9 space-y-5 min-w-0 max-w-full">
          {/* Dedicated Header for Non-Home Tabs (Responsive & Compact) */}
          {activeTab !== 'home' && (
            <div className="rounded-3xl border border-border bg-card p-4 sm:p-5 shadow-sm flex flex-col xs:flex-row xs:items-center justify-between gap-3 sm:gap-4 min-w-0 max-w-full overflow-hidden">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('home')}
                  className="p-2 rounded-xl bg-muted hover:bg-muted/80 text-foreground transition-all cursor-pointer shrink-0"
                  title="Back to Profile Home"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="min-w-0 flex-1">
                  <h1 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-1.5 truncate">
                    {profileTabs.find((t) => t.id === activeTab)?.icon}
                    <span className="truncate">{profileTabs.find((t) => t.id === activeTab)?.label}</span>
                  </h1>
                  <p className="text-[11px] sm:text-xs text-muted-foreground truncate">
                    Dedicated {profileTabs.find((t) => t.id === activeTab)?.label.toLowerCase()} view
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('home')}
                className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-primary/10 text-primary hover:bg-primary/20 transition-all cursor-pointer shrink-0 self-start xs:self-auto"
              >
                <span>Profile Home</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Intro / Hero Card (ONLY SHOWN ON HOME TAB) */}
          {activeTab === 'home' && (
            <div className="rounded-3xl border border-border bg-card shadow-sm overflow-hidden">
              {/* Cover Banner */}
              {profile.coverUrl ? (
                <div className="w-full aspect-[2.6/1] xs:aspect-[2.8/1] sm:aspect-auto sm:h-56 md:h-64 bg-muted relative overflow-hidden flex items-center justify-center">
                  <img
                    src={profile.coverUrl}
                    alt="Cover Banner"
                    className="w-full h-full object-cover object-center"
                  />
                </div>
              ) : (
                <div className="w-full h-28 sm:h-32 bg-gradient-to-r from-primary/10 via-primary/5 to-muted border-b border-border" />
              )}

              <div className="px-4 sm:px-8 pb-6 sm:pb-8 pt-0 space-y-6">
                {/* Avatar and Top Actions Bar */}
                <div className="flex flex-wrap items-end justify-between gap-3 sm:gap-4 -mt-10 sm:-mt-16">
                  <Avatar
                    src={profile.avatarUrl}
                    fallback={user?.displayName}
                    alt={user?.displayName}
                    size="2xl"
                    className="w-20 h-20 sm:w-28 sm:h-28 rounded-2xl sm:rounded-3xl ring-4 ring-card shadow-xl bg-card shrink-0"
                  />

                  {/* Canvas Actions Bar */}
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    {/* Presentation Mode Pills */}
                    <div className="inline-flex rounded-xl bg-muted/80 p-0.5 text-xs font-semibold border border-border/50">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedMode(VISIBILITY_MODE.PUBLIC)
                          setModeMutation.mutate(VISIBILITY_MODE.PUBLIC)
                        }}
                        disabled={setModeMutation.isPending}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all text-xs cursor-pointer ${
                          currentMode === VISIBILITY_MODE.PUBLIC
                            ? 'bg-card text-foreground shadow-xs font-bold'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                        title="Visitors see your Public profile"
                      >
                        <Eye className="h-3 w-3 text-primary" />
                        <span>Public</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedMode(VISIBILITY_MODE.PROFESSIONAL)
                          setModeMutation.mutate(VISIBILITY_MODE.PROFESSIONAL)
                        }}
                        disabled={setModeMutation.isPending}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all text-xs cursor-pointer ${
                          currentMode === VISIBILITY_MODE.PROFESSIONAL
                            ? 'bg-card text-primary shadow-xs font-bold'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                        title="Visitors see your Professional profile"
                      >
                        <Briefcase className="h-3 w-3 text-primary" />
                        <span>Professional</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedMode(VISIBILITY_MODE.PRIVATE)
                          setModeMutation.mutate(VISIBILITY_MODE.PRIVATE)
                        }}
                        disabled={setModeMutation.isPending}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all text-xs cursor-pointer ${
                          currentMode === VISIBILITY_MODE.PRIVATE
                            ? 'bg-card text-foreground shadow-xs font-bold'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                        title="Profile is hidden / private"
                      >
                        <Lock className="h-3 w-3 text-primary" />
                        <span>Private</span>
                      </button>
                    </div>

                    {/* Temporary Mode Trigger */}
                    {profile.temporaryMode && profile.temporaryMode.mode ? (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-[11px] font-medium border border-primary/20">
                        <Clock className="h-3 w-3 shrink-0" />
                        <span>Temp <strong>{profile.temporaryMode.mode}</strong></span>
                        <button
                          disabled={cancelTemporaryModeMutation.isPending}
                          onClick={() => cancelTemporaryModeMutation.mutate()}
                          className="text-destructive hover:underline ml-1 font-semibold"
                          title="Cancel temporary mode"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsTempModalOpen(true)}
                        className="text-xs h-7 px-2 text-muted-foreground hover:text-foreground"
                        title="Set timed presentation mode"
                      >
                        <Clock className="h-3.5 w-3.5" />
                      </Button>
                    )}

                    {/* Preview Live */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsPreviewOpen(true)
                        refetchPreview()
                      }}
                      leftIcon={<Eye className="h-3.5 w-3.5" />}
                      className="text-xs h-8"
                    >
                      Preview
                    </Button>

                    {/* Edit Profile */}
                    <Link to="/app/profile/edit">
                      <Button
                        variant="subtle"
                        size="sm"
                        leftIcon={<Edit3 className="h-3.5 w-3.5" />}
                        className="text-xs h-8"
                      >
                        Edit Profile
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Header Info */}
                <div id="section-overview" className="scroll-mt-28 space-y-3">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                      {user?.displayName}
                    </h2>
                    <Badge variant="subtle" className="text-xs">@{user?.username}</Badge>

                    {activeUserCard ? (
                      <a
                        href={`/u/${user?.username}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary font-semibold hover:underline inline-flex items-center gap-1.5 text-xs ml-auto"
                      >
                        <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 text-[10px] font-semibold flex items-center gap-1">
                          <Wifi className="h-2.5 w-2.5" />
                          <span>NFC Active</span>
                        </Badge>
                        <span className="hidden sm:inline font-mono text-[11px] text-muted-foreground">
                          /u/{user?.username}
                        </span>
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                    ) : (
                      <Badge variant="outline" className="border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10 text-[10px] font-semibold flex items-center gap-1 ml-auto">
                        <span>Card Activation Pending</span>
                      </Badge>
                    )}
                  </div>

                  {profile.headline ? (
                    <p className="text-base font-semibold text-primary break-words [overflow-wrap:anywhere] min-w-0">
                      {profile.headline}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      No headline set. Add a headline to describe what you do.
                    </p>
                  )}

                  {/* Professional Identities */}
                  {identities && identities.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-2 pt-1 max-w-full">
                      {identities
                        .filter((id: any, idx: number, arr: any[]) => {
                          if (!id.customTitle?.trim()) return false
                          const norm = id.customTitle.trim().toLowerCase()
                          if (profile?.headline && norm === profile.headline.trim().toLowerCase()) return false
                          return arr.findIndex((other: any) => other.customTitle?.trim().toLowerCase() === norm) === idx
                        })
                        .map((id: any, idx: number) => (
                        <span
                          key={id._id || id.id || idx}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-muted text-foreground/80 border border-border/60 max-w-full break-words [overflow-wrap:anywhere]"
                        >
                          {id.isPrimary ? (
                            <Crown className="h-3 w-3 text-amber-300 shrink-0" />
                          ) : (
                            <Briefcase className="h-3 w-3 text-muted-foreground shrink-0" />
                          )}
                          <span className="break-words [overflow-wrap:anywhere] min-w-0">{id.customTitle}</span>
                          {id.isPrimary && (
                            <span className="text-[9px] bg-white/20 px-1 py-0.2 rounded font-bold uppercase tracking-wider shrink-0">
                              Primary
                            </span>
                          )}
                        </span>
                      ))}
                      <Link
                        to="/app/profile/edit"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium ml-1 shrink-0"
                      >
                        Edit
                      </Link>
                    </div>
                  ) : (
                    <div className="pt-1">
                      <Link
                        to={`/app/profile/edit?mode=${currentMode.toLowerCase()}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all shadow-xs cursor-pointer"
                      >
                        {currentMode === VISIBILITY_MODE.PRIVATE ? (
                          <Lock className="h-3 w-3 text-primary shrink-0" />
                        ) : currentMode === VISIBILITY_MODE.PROFESSIONAL ? (
                          <Briefcase className="h-3 w-3 text-primary shrink-0" />
                        ) : (
                          <Eye className="h-3 w-3 text-primary shrink-0" />
                        )}
                        <span>
                          {currentMode === VISIBILITY_MODE.PRIVATE
                            ? 'Set Up Private Profile'
                            : currentMode === VISIBILITY_MODE.PROFESSIONAL
                            ? 'Set Up Professional Profile'
                            : 'Set Up Public Profile'}
                        </span>
                      </Link>
                    </div>
                  )}

                  {/* Profile Template Presentation Section */}
                  <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0 max-w-full">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <LayoutTemplate className="h-4.5 w-4.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs font-bold text-foreground break-words [overflow-wrap:anywhere] min-w-0">
                            Profile Template: {currentTemplate?.name || 'Basic Universal Template'}
                          </span>
                          <Badge variant="subtle" className="text-[10px] text-emerald-600 bg-emerald-500/10 border-emerald-500/20 font-bold shrink-0">
                            Active
                          </Badge>
                        </div>
                        <span className="text-[11px] text-muted-foreground block line-clamp-1 min-w-0">
                          {currentMode === VISIBILITY_MODE.PRIVATE
                            ? 'Private Presentation: Sensitive personal & credential fields are shielded.'
                            : currentMode === VISIBILITY_MODE.PROFESSIONAL
                            ? 'Professional Presentation: Tailored for career, client networking, and credentials.'
                            : 'Public Presentation: Universal identity, bio, and social channels visible to all.'}
                        </span>
                      </div>
                    </div>

                    <Link to="/app/templates">
                      <Button variant="outline" size="sm" className="text-xs shrink-0 gap-1.5 h-8">
                        <Lock className="h-3 w-3 text-amber-500" />
                        <span>Templates (Coming Soon)</span>
                      </Button>
                    </Link>
                  </div>

                  {profile.bio && (
                    <p className="text-sm text-foreground/80 leading-relaxed pt-2 break-words [overflow-wrap:anywhere] min-w-0">
                      {profile.bio}
                    </p>
                  )}

                  {/* Location & Contact Details */}
                  {/* Sleek Contact & Social Icon Buttons */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 min-w-0 max-w-full">
                    {profile.contact?.website && (
                      <a
                        href={profile.contact.website.startsWith('http') ? profile.contact.website : `https://${profile.contact.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={`Website: ${profile.contact.website}`}
                        className="p-2 sm:p-2.5 rounded-2xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition-all hover:scale-105 active:scale-95 shadow-2xs cursor-pointer"
                      >
                        <Globe className="h-4 w-4" />
                      </a>
                    )}

                    {profile.contact?.email && (
                      <a
                        href={`mailto:${profile.contact.email}`}
                        title={`Email: ${profile.contact.email}`}
                        className="p-2 sm:p-2.5 rounded-2xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 transition-all hover:scale-105 active:scale-95 shadow-2xs cursor-pointer"
                      >
                        <Mail className="h-4 w-4" />
                      </a>
                    )}

                    {profile.contact?.phone && (
                      <a
                        href={`tel:${profile.contact.phone}`}
                        title={`Phone: ${profile.contact.phone}`}
                        className="p-2 sm:p-2.5 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 transition-all hover:scale-105 active:scale-95 shadow-2xs cursor-pointer"
                      >
                        <Phone className="h-4 w-4" />
                      </a>
                    )}

                    {profile.location && (profile.location.city || profile.location.country) && (
                      <div
                        title={`Location: ${[profile.location.city, profile.location.country].filter(Boolean).join(', ')}`}
                        className="px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1.5 text-xs font-semibold"
                      >
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate max-w-[130px]">{[profile.location.city, profile.location.country].filter(Boolean).join(', ')}</span>
                      </div>
                    )}

                    {profile.socialLinks && profile.socialLinks.map((s: any, idx: number) => (
                      <a
                        key={s.id || idx}
                        href={s.url.startsWith('http') ? s.url : `https://${s.url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={s.label || s.platform || 'Social Link'}
                        className="p-2 sm:p-2.5 rounded-2xl bg-card hover:bg-muted text-foreground border border-border/80 transition-all hover:scale-105 active:scale-95 shadow-2xs cursor-pointer"
                      >
                        <SocialBrandIcon platform={s.platform} url={s.url} />
                      </a>
                    ))}
                  </div>
                </div>

                {/* Quick Metrics Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-border">
                  <div className="p-4 rounded-2xl bg-muted/30 text-center">
                    <div className="text-2xl font-extrabold text-foreground">
                      {experiences.length}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">Experiences</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-muted/30 text-center">
                    <div className="text-2xl font-extrabold text-foreground">
                      {projects.length}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">Projects</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-muted/30 text-center">
                    <div className="text-2xl font-extrabold text-foreground">
                      {certifications.length}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">Certifications</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-muted/30 text-center">
                    <div className="text-2xl font-extrabold text-foreground">
                      {skills.length}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">Skills</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Overview Cards when on Home tab */}
          {activeTab === 'home' && (
            <div className="space-y-4">
              {skills.length > 0 && (
                <div className="p-4 sm:p-5 rounded-2xl border border-border bg-card shadow-sm space-y-3">
                  <h3 className="text-xs sm:text-sm font-bold text-foreground flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                      <span>Top Skills</span>
                    </span>
                    {hasMedia && (
                      <button
                        type="button"
                        onClick={() => setActiveTab('media')}
                        className="text-xs text-primary font-semibold hover:underline cursor-pointer"
                      >
                        View all &rarr;
                      </button>
                    )}
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {skills.slice(0, 8).map((skill: any, idx: number) => (
                      <Badge key={skill.id || idx} variant="subtle" className="text-[11px] font-medium py-0.5 px-2.5">
                        {skill.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {experiences.length > 0 && (
                <div className="p-4 sm:p-5 rounded-2xl border border-border bg-card shadow-sm space-y-3">
                  <h3 className="text-xs sm:text-sm font-bold text-foreground flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Briefcase className="h-3.5 w-3.5 text-primary" />
                      <span>Recent Experience</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveTab('experience')}
                      className="text-xs text-primary font-semibold hover:underline cursor-pointer"
                    >
                      View all ({experiences.length}) &rarr;
                    </button>
                  </h3>
                  <div className="space-y-2">
                    {experiences.slice(0, 2).map((exp: any, idx: number) => (
                      <div key={exp.id || idx} className="p-3 rounded-xl bg-muted/40 border border-border/60">
                        <div className="font-semibold text-xs text-foreground">{exp.role}</div>
                        <div className="text-[11px] text-primary font-medium">{exp.company}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* DEDICATED TAB: Work Experience */}
          {activeTab === 'experience' && (
            <div className="space-y-4">
              {experiences.length > 0 ? (
                <div className="p-4 sm:p-5 rounded-2xl border border-border bg-card shadow-sm space-y-3">
                  <h3 className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-2">
                    <Briefcase className="h-3.5 w-3.5 text-primary" />
                    <span>Work Experience</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {experiences.map((exp: any, idx: number) => {
                      const dateStr = formatDateRange(
                        exp.startMonth,
                        exp.startYear,
                        exp.endMonth,
                        exp.endYear,
                        exp.current,
                        exp.startDate,
                        exp.endDate
                      )
                      return (
                        <div key={exp.id || idx} className="p-3 rounded-xl border border-border bg-muted/10 space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="font-semibold text-xs text-foreground">{exp.role}</div>
                            {dateStr && (
                              <span className="text-[10px] font-mono text-muted-foreground bg-muted/70 px-1.5 py-0.2 rounded whitespace-nowrap">
                                {dateStr}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-primary font-medium">
                            {exp.company}
                            {exp.location ? ` • ${exp.location}` : ''}
                          </div>
                          {exp.description && (
                            <p className="text-[11px] text-muted-foreground pt-0.5 line-clamp-2">{exp.description}</p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div className="p-6 rounded-2xl border border-dashed border-border bg-card text-center space-y-2">
                  <Briefcase className="h-6 w-6 text-muted-foreground mx-auto" />
                  <div className="text-xs font-semibold text-foreground">No Work Experience Added</div>
                  <p className="text-[11px] text-muted-foreground">Work history items will appear here once added to your profile.</p>
                </div>
              )}
            </div>
          )}

          {/* DEDICATED TAB: Education & Academics */}
          {activeTab === 'education' && (
            <div className="space-y-4">
              {education.length > 0 ? (
                <div className="p-4 sm:p-5 rounded-2xl border border-border bg-card shadow-sm space-y-3">
                  <h3 className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-2">
                    <GraduationCap className="h-3.5 w-3.5 text-primary" />
                    <span>Education & Academics</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {education.map((edu: any, idx: number) => {
                      const dateStr = formatDateRange(
                        edu.startMonth,
                        edu.startYear,
                        edu.endMonth,
                        edu.endYear,
                        edu.current,
                        edu.startDate,
                        edu.endDate
                      )
                      return (
                        <div key={edu.id || idx} className="p-3 rounded-xl border border-border bg-muted/10 space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="font-semibold text-xs text-foreground">{edu.institution}</div>
                            {dateStr && (
                              <span className="text-[10px] font-mono text-muted-foreground bg-muted/70 px-1.5 py-0.2 rounded whitespace-nowrap">
                                {dateStr}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-primary font-medium">
                            {[edu.degree, edu.fieldOfStudy].filter(Boolean).join(' • ')}
                          </div>
                          {edu.description && (
                            <p className="text-[11px] text-muted-foreground pt-0.5 line-clamp-2">{edu.description}</p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div className="p-6 rounded-2xl border border-dashed border-border bg-card text-center space-y-2">
                  <GraduationCap className="h-6 w-6 text-muted-foreground mx-auto" />
                  <div className="text-xs font-semibold text-foreground">No Education Added</div>
                  <p className="text-[11px] text-muted-foreground">Academic qualifications will appear here once added to your profile.</p>
                </div>
              )}
            </div>
          )}

          {/* DEDICATED TAB: Work / Portfolio */}
          {activeTab === 'portfolio' && (
            <div className="space-y-4">
              {projects.length > 0 && (
                <div className="p-4 sm:p-5 rounded-2xl border border-border bg-card shadow-sm space-y-3">
                  <h3 className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-2">
                    <Layers className="h-3.5 w-3.5 text-primary" />
                    <span>Featured Projects</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {projects.map((proj: any, idx: number) => {
                      const dateStr = formatDateRange(
                        proj.startMonth,
                        proj.startYear,
                        proj.endMonth,
                        proj.endYear,
                        proj.current,
                        proj.startDate,
                        proj.endDate
                      )
                      return (
                        <div key={proj.id || idx} className="p-3 rounded-xl border border-border bg-muted/10 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-semibold text-xs text-foreground">{proj.title}</div>
                            <div className="flex items-center gap-2">
                              {dateStr && (
                                <span className="text-[10px] font-mono text-muted-foreground bg-muted/70 px-1.5 py-0.2 rounded whitespace-nowrap">
                                  {dateStr}
                                </span>
                              )}
                              {proj.url && (
                                <a
                                  href={proj.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline text-[11px] flex items-center gap-1"
                                >
                                  <span>Link</span>
                                  <ExternalLink className="h-2.5 w-2.5" />
                                </a>
                              )}
                            </div>
                          </div>
                          {proj.description && (
                            <p className="text-[11px] text-muted-foreground pt-0.5 line-clamp-2">{proj.description}</p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {services.length > 0 && (
                <div className="p-4 sm:p-5 rounded-2xl border border-border bg-card shadow-sm space-y-3">
                  <h3 className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    <span>Services Provided</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {services.map((s: any, idx: number) => (
                      <div key={s.id || idx} className="p-3 rounded-xl border border-border bg-muted/10 space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-semibold text-foreground">{s.title}</span>
                          {s.priceRange && <span className="text-[10px] font-bold text-primary">{s.priceRange}</span>}
                        </div>
                        {s.description && <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{s.description}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* DEDICATED TAB: Credentials & Media */}
          {activeTab === 'media' && (
            <div className="space-y-4">
              {certifications.length > 0 && (
                <div className="p-4 sm:p-5 rounded-2xl border border-border bg-card shadow-sm space-y-3">
                  <h3 className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-2">
                    <Award className="h-3.5 w-3.5 text-primary" />
                    <span>Certifications</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {certifications.map((c: any, idx: number) => (
                      <div key={c.id || idx} className="p-3 rounded-xl border border-border bg-muted/10 space-y-0.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="text-xs font-semibold text-foreground">{c.name}</div>
                          {(c.issueYear || c.issueDate) && (
                            <span className="text-[10px] font-mono text-muted-foreground whitespace-nowrap bg-muted/70 px-1.5 py-0.2 rounded">
                              {c.doesNotExpire
                                ? 'No Expiration'
                                : formatMonthYear(c.issueMonth, c.issueYear, c.issueDate)}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-muted-foreground">{c.issuer}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {skills.length > 0 && (
                <div className="p-4 sm:p-5 rounded-2xl border border-border bg-card shadow-sm space-y-3">
                  <h3 className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    <span>Verified Skills</span>
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {skills.map((skill: any, idx: number) => (
                      <Badge key={skill.id || idx} variant="subtle" className="text-[11px] font-medium py-0.5 px-2.5">
                        {skill.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {awards.length > 0 && (
                <div className="p-4 sm:p-5 rounded-2xl border border-border bg-card shadow-sm space-y-3">
                  <h3 className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-2">
                    <Award className="h-3.5 w-3.5 text-primary" />
                    <span>Awards & Honors</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {awards.map((award: any, idx: number) => (
                      <div key={award.id || idx} className="p-3 rounded-xl border border-border bg-muted/10 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-semibold text-xs text-foreground">{award.title}</div>
                          {(award.year || award.date) && (
                            <span className="text-[10px] font-mono text-muted-foreground bg-muted/70 px-1.5 py-0.2 rounded whitespace-nowrap">
                              {formatMonthYear(award.month, award.year, award.date)}
                            </span>
                          )}
                        </div>
                        {award.issuer && <div className="text-[11px] text-primary font-medium">{award.issuer}</div>}
                        {award.description && (
                          <p className="text-[11px] text-muted-foreground pt-0.5">{award.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {publications.length > 0 && (
                <div className="p-4 sm:p-5 rounded-2xl border border-border bg-card shadow-sm space-y-3">
                  <h3 className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5 text-primary" />
                    <span>Publications</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {publications.map((pub: any, idx: number) => (
                      <div key={pub.id || idx} className="p-3 rounded-xl border border-border bg-muted/10 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-semibold text-xs text-foreground">{pub.title}</div>
                          {(pub.year || pub.date) && (
                            <span className="text-[10px] font-mono text-muted-foreground bg-muted/70 px-1.5 py-0.2 rounded whitespace-nowrap">
                              {formatMonthYear(pub.month, pub.year, pub.date)}
                            </span>
                          )}
                        </div>
                        {pub.publisher && <div className="text-[11px] text-primary font-medium">{pub.publisher}</div>}
                        {pub.url && (
                          <a
                            href={pub.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline pt-0.5"
                          >
                            <span>View Publication</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* DEDICATED TAB: Posts & Activity */}
          {activeTab === 'posts' && (
            <ProfilePostsSection />
          )}

          {/* DEDICATED TAB: Custom Sections */}
          {activeTab === 'custom' && (
            <div className="space-y-4">
              {customSections.map((sec: any, idx: number) => (
                <div key={sec.id || idx} className="p-4 sm:p-5 rounded-2xl border border-border bg-card shadow-sm space-y-3">
                  <h3 className="text-xs sm:text-sm font-bold text-foreground">{sec.title}</h3>
                  {sec.description && <p className="text-[11px] text-muted-foreground">{sec.description}</p>}
                  <div className="p-3 rounded-xl border border-border bg-muted/10 space-y-1.5">
                    {sec.blocks?.map((block: any, bIdx: number) => (
                      <div key={bIdx} className="text-xs text-foreground/80 leading-relaxed whitespace-pre-line">
                        {block.content}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* All Profile Sections Drawer Modal */}
      <Dialog open={isSectionsDrawerOpen} onOpenChange={setIsSectionsDrawerOpen}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Menu className="h-4 w-4 text-primary" />
            <span>All Profile Sections</span>
          </DialogTitle>
          <DialogDescription>
            Select any section to jump directly to its dedicated content.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2 max-h-[60vh] overflow-y-auto pr-1">
          {profileTabs.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id)
                  setIsSectionsDrawerOpen(false)
                }}
                className={`w-full flex items-center justify-between p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  isActive
                    ? 'bg-primary text-white border-primary shadow-md'
                    : 'bg-card border-border hover:bg-muted text-foreground'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`p-2 rounded-xl shrink-0 ${isActive ? 'bg-white/20 text-white' : 'bg-muted text-primary'}`}>
                    {tab.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold truncate">{tab.label}</div>
                    <div className={`text-[10px] truncate ${isActive ? 'text-white/80' : 'text-muted-foreground'}`}>
                      {tab.id === 'home'
                        ? 'Main identity overview & intro hero card'
                        : tab.id === 'experience'
                        ? 'Work history & professional roles'
                        : tab.id === 'education'
                        ? 'Academic qualifications & degrees'
                        : tab.id === 'portfolio'
                        ? 'Featured projects & services'
                        : tab.id === 'media'
                        ? 'Certifications, skills & awards'
                        : tab.id === 'posts'
                        ? 'Community posts & activity'
                        : 'Custom section blocks'}
                    </div>
                  </div>
                </div>

                {tab.count !== undefined && (
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-mono font-bold shrink-0 ${
                      isActive ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </Dialog>

      {/* Temporary Mode Configuration Modal */}
      <Dialog open={isTempModalOpen} onOpenChange={setIsTempModalOpen}>
        <DialogHeader>
          <DialogTitle>Configure Temporary Mode</DialogTitle>
          <DialogDescription>
            Temporarily switch your presentation level (e.g. for an interview, conference, or private session). It will automatically revert when expired.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Target Temporary Mode</label>
            <select
              value={tempMode}
              onChange={(e) => setTempMode(e.target.value as VisibilityMode)}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm font-semibold"
            >
              <option value={VISIBILITY_MODE.PUBLIC}>PUBLIC</option>
              <option value={VISIBILITY_MODE.PROFESSIONAL}>PROFESSIONAL</option>
              <option value={VISIBILITY_MODE.PRIVATE}>PRIVATE</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Duration</label>
            <select
              value={tempHours}
              onChange={(e) => setTempHours(Number(e.target.value))}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm font-semibold"
            >
              <option value={1}>1 Hour</option>
              <option value={4}>4 Hours</option>
              <option value={12}>12 Hours</option>
              <option value={24}>24 Hours (1 Day)</option>
              <option value={72}>3 Days</option>
              <option value={168}>7 Days</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Fallback Mode (After Expiry)</label>
            <select
              value={tempFallback}
              onChange={(e) => setTempFallback(e.target.value as VisibilityMode)}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm font-semibold"
            >
              <option value={VISIBILITY_MODE.PUBLIC}>PUBLIC</option>
              <option value={VISIBILITY_MODE.PROFESSIONAL}>PROFESSIONAL</option>
              <option value={VISIBILITY_MODE.PRIVATE}>PRIVATE</option>
            </select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsTempModalOpen(false)}>
            Cancel
          </Button>
          <Button
            isLoading={setTemporaryModeMutation.isPending}
            onClick={() => setTemporaryModeMutation.mutate()}
          >
            Activate Temporary Mode
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Preview Mode Modal */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogHeader>
          <DialogTitle>Live Profile Preview</DialogTitle>
          <DialogDescription>
            Preview how visitors see your profile across Public, Professional, or Private mode.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-2 p-1 rounded-2xl bg-muted text-xs font-bold">
            {(['PUBLIC', 'PROFESSIONAL', 'PRIVATE'] as VisibilityMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setPreviewMode(mode)}
                className={`flex-1 py-1.5 rounded-xl transition-all ${
                  previewMode === mode
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          {isPreviewLoading ? (
            <div className="p-8 text-center text-xs text-muted-foreground">Generating preview snapshot...</div>
          ) : (
            <div className="space-y-3">
              {/* Mini Profile Card Preview */}
              <div className="rounded-2xl border border-border bg-card overflow-hidden text-left shadow-sm">
                {profile.coverUrl ? (
                  <div className="w-full h-20 bg-muted overflow-hidden">
                    <img src={profile.coverUrl} alt="Banner" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-full h-14 bg-gradient-to-r from-primary/20 via-primary/10 to-muted" />
                )}
                <div className="p-4 pt-0 space-y-2">
                  <div className="flex items-end justify-between -mt-6">
                    <Avatar
                      src={profile.avatarUrl}
                      fallback={user?.displayName}
                      alt={user?.displayName}
                      size="lg"
                      className="rounded-2xl ring-4 ring-card shadow-md bg-card shrink-0"
                    />
                    <Badge variant={previewMode === 'PROFESSIONAL' ? 'subtle' : previewMode === 'PUBLIC' ? 'success' : 'outline'} className="text-[10px] font-bold uppercase">
                      {previewMode} Mode
                    </Badge>
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-foreground leading-tight">{user?.displayName}</h4>
                    <span className="text-xs text-muted-foreground font-mono">@{user?.username}</span>
                  </div>
                  <p className="text-xs font-medium text-foreground/90">
                    {previewData?.data?.preview?.profile?.headline || profile.headline || 'No headline set yet'}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {previewData?.data?.preview?.profile?.bio || profile.bio || 'No bio added yet'}
                  </p>
                </div>
              </div>

              {/* Mode Explanation */}
              <div className="p-3 rounded-xl bg-muted/50 border border-border/60 text-xs text-muted-foreground text-left">
                {previewMode === 'PUBLIC' && (
                  <span><strong>Public Mode:</strong> Visible to anyone on the web. Visitors see your core identity, bio, social links, and public sections.</span>
                )}
                {previewMode === 'PROFESSIONAL' && (
                  <span><strong>Professional Mode:</strong> Optimized for networking. Visitors see your career credentials, professional contact, and portfolio.</span>
                )}
                {previewMode === 'PRIVATE' && (
                  <span><strong>Private Mode:</strong> Your profile is locked/hidden from general public browsing. Only accessible via smart NFC card tap or direct approval.</span>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          {user?.username && (
            <Link
              to={`/u/${user.username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto"
            >
              <Button variant="outline" size="sm" className="w-full text-xs gap-1.5">
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Open Live Public Page</span>
              </Button>
            </Link>
          )}
          <Button size="sm" onClick={() => setIsPreviewOpen(false)} className="w-full sm:w-auto text-xs">
            Done Previewing
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Fixed Bottom Navigation Bar for Profile Sections */}
      {profileTabs.length > 1 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-xl border-t border-border shadow-2xl px-3 py-1.5 flex items-center justify-around gap-1 min-w-0">
          {profileTabs.slice(0, 3).map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center justify-center gap-0.5 py-1 px-2.5 rounded-xl text-[10px] sm:text-xs font-bold transition-all cursor-pointer flex-1 max-w-[100px] ${
                  isActive
                    ? 'text-primary font-extrabold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <div className={`p-1 rounded-lg transition-colors ${isActive ? 'bg-primary/15 text-primary' : ''}`}>
                  {tab.icon}
                </div>
                <span className="truncate max-w-full">{tab.label}</span>
              </button>
            )
          })}

          <button
            type="button"
            onClick={() => setIsSectionsDrawerOpen(true)}
            className="flex flex-col items-center justify-center gap-0.5 py-1 px-2.5 rounded-xl text-[10px] sm:text-xs font-bold text-primary hover:text-primary/90 transition-all cursor-pointer flex-1 max-w-[100px]"
          >
            <div className="p-1 rounded-lg bg-primary/10 text-primary border border-primary/20">
              <Menu className="h-4 w-4" />
            </div>
            <span className="truncate max-w-full">All ({profileTabs.length})</span>
          </button>
        </div>
      )}
    </div>
  )
}

/**
 * Profile Posts Section with Tabs for My Posts, Saved, and Archived
 */
function ProfilePostsSection() {
  const [activeTab, setActiveTab] = React.useState<'my' | 'saved' | 'archived'>('my')

  const { data: postsData, isLoading, refetch } = useQuery({
    queryKey: ['profile-posts', activeTab],
    queryFn: () => postsApi.getFeed({ filter: activeTab }),
  })

  const posts = postsData?.data?.posts || []

  return (
    <div id="section-posts" className="scroll-mt-28 space-y-4 pt-6 border-t border-border">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h3 className="text-base font-bold text-foreground flex items-center gap-2">
          <Flame className="h-4 w-4 text-primary" />
          <span>Activity & Posts</span>
        </h3>

        {/* Post filters: My Posts, Saved, Archived */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-muted/60 border border-border text-xs font-semibold w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveTab('my')}
            className={`flex-1 sm:flex-none py-1.5 px-3.5 rounded-xl transition-all ${
              activeTab === 'my'
                ? 'bg-card text-foreground shadow-xs font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            My Posts
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('saved')}
            className={`flex-1 sm:flex-none py-1.5 px-3.5 rounded-xl transition-all ${
              activeTab === 'saved'
                ? 'bg-card text-foreground shadow-xs font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Saved
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('archived')}
            className={`flex-1 sm:flex-none py-1.5 px-3.5 rounded-xl transition-all ${
              activeTab === 'archived'
                ? 'bg-card text-foreground shadow-xs font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Archived
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-xs text-muted-foreground">Loading posts...</div>
      ) : posts.length === 0 ? (
        <div className="p-8 rounded-2xl border border-dashed border-border text-center space-y-2">
          <div className="text-sm font-semibold text-foreground">
            {activeTab === 'saved'
              ? 'No saved posts yet'
              : activeTab === 'archived'
              ? 'No archived posts'
              : 'You haven’t posted yet'}
          </div>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {activeTab === 'saved'
              ? 'Bookmark interesting posts from colleagues to read them later.'
              : activeTab === 'archived'
              ? 'Archived posts remain private and are stored safely here.'
              : 'Share updates, projects, or questions on the Community Feed!'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard key={post._id} post={post} onRefresh={() => refetch()} />
          ))}
        </div>
      )}
    </div>
  )
}
