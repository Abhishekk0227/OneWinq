import * as React from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { QRCodeSVG } from 'qrcode.react'
import { profileApi } from '@/features/profile/api/profile.api'
import { connectionsApi } from '@/features/connections/api/connections.api'
import { messagingApi } from '@/features/messaging/api/messaging.api'
import { analyticsApi } from '@/features/analytics/api/analytics.api'
import { postsApi } from '@/features/posts/api/posts.api'
import { useAuthStore } from '@/stores/authStore'
import { queryKeys } from '@/lib/query/queryKeys'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { BrandLogo } from '@/components/navigation/BrandLogo'
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/Dialog'
import { LoadingScreen } from '@/components/common/LoadingScreen'
import { ErrorState } from '@/components/common/ErrorState'
import { toast } from '@/stores/toastStore'
import {
  Share2,
  UserPlus,
  UserCheck,
  Check,
  Globe,
  Mail,
  Phone,
  MapPin,
  ExternalLink,
  Briefcase,
  GraduationCap,
  Award,
  Sparkles,
  Copy,
  FileText,
  Flame,
  Heart,
  MessageSquare,
  Building2,
  Video,
  Sun,
  Moon,
  Zap,
  ShoppingBag,
  ArrowRight,
  CreditCard,
  Wifi,
  LayoutGrid,
  User,
  Layers,
  Home,
  ArrowLeft,
  ChevronRight,
} from 'lucide-react'
import { formatDateRange, formatMonthYear } from '@/utils/dateFormatter'

export default function PublicProfilePage() {
  const navigate = useNavigate()
  const { username } = useParams<{ username: string }>()
  const { isAuthenticated, user: currentUser } = useAuthStore()
  const [isShareModalOpen, setIsShareModalOpen] = React.useState(false)
  const [isConnectModalOpen, setIsConnectModalOpen] = React.useState(false)
  const [connectNote, setConnectNote] = React.useState('')
  const [isCopied, setIsCopied] = React.useState(false)
  const [isStartingChat, setIsStartingChat] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState<string>('home')

  // Profile theme state (Light ☀️ / Dark 🌙)
  const [profileTheme, setProfileTheme] = React.useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('onewinq-profile-theme')
    if (saved === 'dark' || saved === 'light') return saved
    return 'light'
  })

  const toggleTheme = () => {
    setProfileTheme((prev) => {
      const next = prev === 'light' ? 'dark' : 'light'
      localStorage.setItem('onewinq-profile-theme', next)
      return next
    })
  }

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.profile.byUsername(username || ''),
    queryFn: () => profileApi.getPublicProfile(username || ''),
    enabled: !!username,
    retry: 1,
  })

  // User community posts query (declared unconditionally with other hooks)
  const { data: userPostsData } = useQuery({
    queryKey: ['posts', 'user', username || ''],
    queryFn: () => postsApi.getFeed({ authorUsername: username || '' }),
    enabled: Boolean(username),
  })
  const userPosts = userPostsData?.data?.posts || []

  const sendRequestMutation = useMutation({
    mutationFn: (recipientId: string) =>
      connectionsApi.sendRequest(recipientId, connectNote),
    onSuccess: () => {
      toast.success('Connection request sent!')
      setIsConnectModalOpen(false)
      refetch()
    },
    onError: (err: unknown) => {
      const apiErr = err as { message?: string }
      toast.error(apiErr.message || 'Failed to send connection request')
    },
  })

  const acceptMutation = useMutation({
    mutationFn: (requestIdOrUserId: string) => connectionsApi.acceptRequest(requestIdOrUserId),
    onSuccess: () => {
      toast.success('Connection accepted!')
      refetch()
    },
    onError: (err: unknown) => {
      const apiErr = err as { message?: string }
      toast.error(apiErr.message || 'Failed to accept request')
    },
  })

  const rejectMutation = useMutation({
    mutationFn: (requestIdOrUserId: string) => connectionsApi.rejectRequest(requestIdOrUserId),
    onSuccess: () => {
      toast.success('Connection request ignored.')
      refetch()
    },
    onError: (err: unknown) => {
      const apiErr = err as { message?: string }
      toast.error(apiErr.message || 'Failed to ignore request')
    },
  })

  const withdrawMutation = useMutation({
    mutationFn: (requestIdOrUserId: string) => connectionsApi.withdrawRequest(requestIdOrUserId),
    onSuccess: () => {
      toast.success('Connection request withdrawn.')
      refetch()
    },
    onError: (err: unknown) => {
      const apiErr = err as { message?: string }
      toast.error(apiErr.message || 'Failed to cancel request')
    },
  })

  const handleLinkClick = (url: string, label: string) => {
    const rawUserId =
      data?.data?.profile?.userId || data?.data?.user?.id || data?.data?.user?._id
    const uId = typeof rawUserId === 'object' ? (rawUserId as any)?._id || (rawUserId as any)?.id : rawUserId
    if (uId) {
      analyticsApi
        .trackLinkClick({
          profileUserId: String(uId),
          linkUrl: url,
          label,
        })
        .catch(() => {})
    }
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setIsCopied(true)
    toast.success('Profile link copied to clipboard!')
    setTimeout(() => setIsCopied(false), 2500)
  }

  if (isLoading) {
    return <LoadingScreen message={`Loading @${username}'s digital identity...`} />
  }

  if (error || !data?.data) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <ErrorState
          title="Profile Not Found"
          message={`We couldn't locate a published OneWinq profile for @${username}. The handle might be reserved or currently private.`}
          onRetry={() => refetch()}
        />
      </div>
    )
  }

  const { profile, user: profileUser, activeMode, connectionState, isCardGated, hasActiveCard, activeCard } = data.data
  const isSelf = Boolean(
    currentUser &&
      (currentUser.username === profileUser?.username ||
        currentUser.id === profileUser?.id ||
        (currentUser as any)?._id === (profileUser as any)?._id)
  )
  const profileUrl = window.location.href

  // OPTION C: CARD-GATED PROFILE ENFORCEMENT
  // If the owner has not activated a physical OneWinq NFC Card, show the reserved splash page
  if (isCardGated || hasActiveCard === false || !profile) {
    return (
      <div
        className={`min-h-screen transition-colors duration-300 pb-20 ${
          profileTheme === 'dark'
            ? 'dark bg-[#0a0512] text-zinc-100'
            : 'bg-[#faf8fd] text-zinc-900'
        }`}
      >
        {/* Floating Top Banner */}
        <header className="sticky top-0 z-30 border-b border-border/70 bg-card/85 backdrop-blur-md px-3 sm:px-4 py-2.5 sm:py-3 transition-colors">
          <div className="container mx-auto flex max-w-4xl items-center justify-between gap-2">
            <BrandLogo to="/" imgClassName="h-6 sm:h-7" />


            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={toggleTheme}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-border bg-card/90 hover:bg-muted text-xs font-semibold text-foreground transition-all active:scale-95 shadow-xs cursor-pointer"
                title={`Switch to ${profileTheme === 'dark' ? 'Light' : 'Dark'} profile theme`}
              >
                {profileTheme === 'dark' ? (
                  <>
                    <Sun className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                    <span className="hidden sm:inline">Light</span>
                  </>
                ) : (
                  <>
                    <Moon className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                    <span className="hidden sm:inline">Dark</span>
                  </>
                )}
              </button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                leftIcon={isCopied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                className="h-8 text-xs px-2.5 sm:px-3"
              >
                {isCopied ? 'Copied' : 'Share'}
              </Button>
            </div>
          </div>
        </header>

        {/* Hero Card Gated Section */}
        <main className="container mx-auto max-w-2xl px-4 pt-8 sm:pt-12 space-y-8 animate-in fade-in duration-300 text-center">
          {/* Visual NFC Card Mockup */}
          <div className="relative mx-auto max-w-sm sm:max-w-md group">
            {/* Ambient Background Glow */}
            <div className="absolute -inset-1.5 bg-gradient-to-r from-purple-600 via-primary to-indigo-600 rounded-3xl blur-xl opacity-30 group-hover:opacity-50 transition duration-500" />

            {/* Smart NFC Card */}
            <div className="relative rounded-3xl p-6 sm:p-7 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black text-white border border-white/15 shadow-2xl overflow-hidden aspect-[1.586/1] flex flex-col justify-between text-left">
              {/* Card Holographic / Grid overlay */}
              <div
                className="absolute inset-0 opacity-10 pointer-events-none"
                style={{
                  backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
                  backgroundSize: '20px 20px',
                }}
              />
              <div className="absolute top-0 right-0 -mt-10 -mr-10 w-44 h-44 bg-gradient-to-bl from-primary/30 via-purple-500/20 to-transparent rounded-full blur-2xl pointer-events-none" />

              {/* Top Row: OneWinq Brand + Contactless Wifi Icon */}
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-2">
                  <BrandLogo to="/" variant="white" imgClassName="h-5 sm:h-6" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[10px] font-bold tracking-wider uppercase">
                    Activation Required
                  </div>
                  <Wifi className="h-4 w-4 text-white/70 rotate-90" />
                </div>
              </div>

              {/* Middle Row: EMV Gold Chip + Reserved User Preview */}
              <div className="flex items-center justify-between relative z-10 my-auto py-2">
                <div className="w-11 h-8 rounded-md bg-gradient-to-tr from-amber-300 via-yellow-400 to-amber-200 border border-amber-600/40 shadow-inner flex items-center justify-center opacity-90">
                  <div className="w-7 h-5 border border-amber-700/30 rounded-xs grid grid-cols-2 gap-0.5 opacity-60" />
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 block">Link Status</span>
                  <span className="text-xs font-semibold text-amber-400">Card-Gated</span>
                </div>
              </div>

              {/* Bottom Row: User Name & Handle */}
              <div className="relative z-10 flex items-end justify-between">
                <div>
                  <div className="text-sm sm:text-base font-extrabold tracking-wide text-zinc-100">
                    {profileUser?.displayName || `@${username}`}
                  </div>
                  <div className="text-xs font-mono text-zinc-400">
                    onewinq.me/u/{username}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-mono tracking-widest text-zinc-500 uppercase">Universal NFC</span>
                </div>
              </div>
            </div>
          </div>

          {/* Reserved Identity Description */}
          <div className="space-y-3 max-w-lg mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-amber-400 text-xs font-bold tracking-wide">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              Physical NFC Card Activation Required
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              @{username} is Reserved & Claimed
            </h1>

            <p className="text-sm text-muted-foreground leading-relaxed">
              This digital identity on OneWinq has been registered by{' '}
              <strong className="text-foreground">{profileUser?.displayName || username}</strong>.
              Contactless NFC tap sharing and public profile access will unlock automatically once their physical OneWinq Smart Card is activated.
            </p>
          </div>

          {/* Conditional CTAs */}
          <div className="p-6 rounded-3xl border border-border bg-card shadow-card max-w-lg mx-auto text-left space-y-4">
            {isSelf ? (
              <>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span>Welcome back, {currentUser?.displayName || 'User'}!</span>
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    This is your personal link. Activate your physical card to unlock your public profile for everyone.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <Link to="/app/cards" className="flex-1">
                    <Button variant="default" className="w-full text-xs font-bold" leftIcon={<Zap className="h-4 w-4" />}>
                      Activate My Card
                    </Button>
                  </Link>
                  <Link to="/orders" className="flex-1">
                    <Button variant="outline" className="w-full text-xs font-bold" leftIcon={<ShoppingBag className="h-4 w-4" />}>
                      Order NFC Card
                    </Button>
                  </Link>
                </div>

                <div className="pt-1 text-center">
                  <Link to="/app/profile/edit" className="text-xs text-primary hover:underline font-medium">
                    Customize your profile while you wait &rarr;
                  </Link>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                    <CreditCard className="h-4 w-4 text-primary" />
                    <span>Want your own OneWinq Smart Card?</span>
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Instantly share your contact info, social profiles, and portfolio with a single tap of a premium contactless NFC card.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <Link to="/register" className="flex-1">
                    <Button variant="default" className="w-full text-xs font-bold" rightIcon={<ArrowRight className="h-4 w-4" />}>
                      Get Your OneWinq Card
                    </Button>
                  </Link>
                  <Link to="/" className="flex-1">
                    <Button variant="outline" className="w-full text-xs font-bold">
                      Explore OneWinq
                    </Button>
                  </Link>
                </div>

                <div className="pt-2 text-center text-xs text-muted-foreground">
                  Are you @{username}?{' '}
                  <Link to="/login" className="text-primary hover:underline font-semibold">
                    Sign in to activate your card
                  </Link>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    )
  }

  // Fallbacks to support both top-level and profile.sections structures
  const experiences = profile.experience || profile.sections?.experience || []
  const projects = profile.projects || profile.sections?.projects || []
  const skills = profile.skills || profile.sections?.skills || []
  const education = profile.education || profile.sections?.education || []
  const certifications = profile.certifications || profile.sections?.certifications || []
  const services = profile.services || profile.sections?.services || []
  const awards = profile.awards || profile.sections?.awards || []
  const publications = profile.publications || profile.sections?.publications || []
  const organizations = profile.organizations || profile.sections?.organizations || []
  const mediaGallery = profile.mediaGallery || profile.sections?.mediaGallery || []
  const customSections = profile.customSections || []

  const hasExperience = experiences.length > 0 || education.length > 0
  const hasPortfolio = projects.length > 0 || services.length > 0 || organizations.length > 0
  const hasMedia = mediaGallery.length > 0 || publications.length > 0
  const hasPosts = userPosts.length > 0
  const hasCustom = customSections.length > 0

  const profileTabs = [
    { id: 'home', label: 'Home', icon: <Home className="h-4 w-4" /> },
    ...(hasExperience ? [{ id: 'experience', label: 'Experience', icon: <Briefcase className="h-4 w-4" />, count: experiences.length + education.length }] : []),
    ...(hasPortfolio ? [{ id: 'portfolio', label: 'Work', icon: <Sparkles className="h-4 w-4" />, count: projects.length + services.length + organizations.length }] : []),
    ...(hasMedia ? [{ id: 'media', label: 'Media & Pubs', icon: <Video className="h-4 w-4" />, count: mediaGallery.length + publications.length }] : []),
    ...(hasPosts ? [{ id: 'posts', label: 'Posts', icon: <MessageSquare className="h-4 w-4" />, count: userPosts.length }] : []),
    ...(hasCustom ? [{ id: 'custom', label: 'Custom', icon: <Layers className="h-4 w-4" />, count: customSections.length }] : []),
  ]

  return (
    <div
      className={`min-h-screen transition-colors duration-300 pb-24 ${
        profileTheme === 'dark'
          ? 'dark bg-[#0f091a] text-zinc-100'
          : 'bg-[#faf8fd] text-zinc-900'
      }`}
    >
      {/* Floating Top Banner / Navigation */}
      <header className="sticky top-0 z-30 border-b border-border/70 bg-card/85 backdrop-blur-md px-3 sm:px-4 py-2.5 sm:py-3 transition-colors">
        <div className="container mx-auto flex max-w-4xl items-center justify-between gap-2">
          <BrandLogo to="/" imgClassName="h-6 sm:h-7" />


          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Theme Switcher: Light ☀️ / Dark 🌙 */}
            <button
              type="button"
              onClick={toggleTheme}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-border bg-card/90 hover:bg-muted text-xs font-semibold text-foreground transition-all active:scale-95 shadow-xs cursor-pointer"
              title={`Switch to ${profileTheme === 'dark' ? 'Light' : 'Dark'} profile theme`}
              aria-label="Toggle profile theme"
            >
              {profileTheme === 'dark' ? (
                <>
                  <Sun className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  <span className="hidden sm:inline">Light</span>
                </>
              ) : (
                <>
                  <Moon className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                  <span className="hidden sm:inline">Dark</span>
                </>
              )}
            </button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsShareModalOpen(true)}
              leftIcon={<Share2 className="h-3.5 w-3.5" />}
              className="h-8 text-xs px-2.5 sm:px-3"
            >
              <span className="hidden sm:inline">Share</span>
            </Button>

            {!isSelf && (
              <>
                {connectionState === 'CONNECTED' ? (
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      className="h-8 text-xs px-2.5 sm:px-3 bg-primary hover:bg-primary/90 text-white font-semibold"
                      isLoading={isStartingChat}
                      onClick={async () => {
                        const targetId =
                          (data?.data as any)?.user?.id ||
                          (data?.data as any)?.user?._id ||
                          (profileUser as any)?._id ||
                          (profileUser as any)?.id ||
                          (typeof profile.userId === 'object' ? (profile.userId as any)?._id : profile.userId)
                        if (!targetId) return
                        try {
                          setIsStartingChat(true)
                          const res = await messagingApi.getOrCreateConversation(String(targetId))
                          const cid =
                            res.data?.conversation?._id ||
                            res.data?.conversation?.id ||
                            (res.data as any)?.conversationId
                          if (cid) {
                            navigate(`/app/messages?cid=${cid}`)
                          } else {
                            navigate('/app/messages')
                          }
                        } catch {
                          toast.error('Could not start conversation')
                        } finally {
                          setIsStartingChat(false)
                        }
                      }}
                      leftIcon={<MessageSquare className="h-3.5 w-3.5" />}
                    >
                      Message
                    </Button>
                    <Badge variant="success" className="py-1 px-2.5 text-xs">
                      Connected
                    </Badge>
                  </div>
                ) : connectionState === 'PENDING_SENT' ? (
                  <div className="flex items-center gap-1.5">
                    <Badge variant="subtle" className="py-1 px-2.5 text-xs">
                      Requested
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs text-muted-foreground hover:text-destructive px-2.5"
                      isLoading={withdrawMutation.isPending}
                      onClick={() => {
                        const targetId = (data?.data as any)?.connectionId || (profileUser as any)?._id || (profileUser as any)?.id || (typeof profile.userId === 'object' ? (profile.userId as any)?._id : profile.userId)
                        if (targetId) withdrawMutation.mutate(String(targetId))
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : connectionState === 'PENDING_RECEIVED' ? (
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      className="h-8 text-xs px-2.5"
                      isLoading={acceptMutation.isPending}
                      onClick={() => {
                        const targetId = (data?.data as any)?.connectionId || (profileUser as any)?._id || (profileUser as any)?.id || (typeof profile.userId === 'object' ? (profile.userId as any)?._id : profile.userId)
                        if (targetId) acceptMutation.mutate(String(targetId))
                      }}
                      leftIcon={<UserCheck className="h-3.5 w-3.5" />}
                    >
                      Accept
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs px-2 text-muted-foreground hover:text-destructive"
                      isLoading={rejectMutation.isPending}
                      onClick={() => {
                        const targetId = (data?.data as any)?.connectionId || (profileUser as any)?._id || (profileUser as any)?.id || (typeof profile.userId === 'object' ? (profile.userId as any)?._id : profile.userId)
                        if (targetId) rejectMutation.mutate(String(targetId))
                      }}
                    >
                      Ignore
                    </Button>
                  </div>
                ) : isAuthenticated ? (
                  <Button
                    size="sm"
                    onClick={() => setIsConnectModalOpen(true)}
                    leftIcon={<UserPlus className="h-3.5 w-3.5" />}
                    className="h-8 text-xs px-2.5 sm:px-3"
                  >
                    Connect
                  </Button>
                ) : (
                  <Link to={`/signup?returnUrl=${encodeURIComponent(window.location.pathname)}`}>
                    <Button size="sm" className="h-8 text-xs px-2.5 sm:px-3">Join</Button>
                  </Link>
                )}
              </>
            )}

            {isSelf && (
              <Link to="/app/profile/edit">
                <Button size="sm" variant="subtle" className="h-8 text-xs px-2.5 sm:px-3">
                  Edit Identity
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Profile Canvas */}
      <main className="container mx-auto max-w-6xl px-3 sm:px-6 pt-6 animate-in fade-in duration-300">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 text-left">
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
                  src={profile.avatarUrl || profileUser?.avatarUrl}
                  fallback={profileUser.displayName}
                  alt={profileUser.displayName}
                  size="sm"
                  className="rounded-xl ring-1 ring-border shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-foreground truncate">{profileUser.displayName}</div>
                  <div className="text-[10px] font-mono text-muted-foreground truncate">@{profileUser.username}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Main Content Canvas */}
          <div className="md:col-span-9 space-y-6 min-w-0 max-w-full">
            {/* Dedicated Header for Non-Home Tabs */}
            {activeTab !== 'home' && (
              <div className="rounded-3xl border border-border bg-card p-5 shadow-sm flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab('home')}
                    className="p-2 rounded-xl bg-muted hover:bg-muted/80 text-foreground transition-all cursor-pointer"
                    title="Back to Home / Intro"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <div>
                    <h1 className="text-lg sm:text-xl font-extrabold text-foreground flex items-center gap-2">
                      {profileTabs.find((t) => t.id === activeTab)?.icon}
                      <span>{profileTabs.find((t) => t.id === activeTab)?.label}</span>
                    </h1>
                    <p className="text-xs text-muted-foreground">
                      @{profileUser.username}'s dedicated {profileTabs.find((t) => t.id === activeTab)?.label.toLowerCase()} section
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('home')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-primary/10 text-primary hover:bg-primary/20 transition-all cursor-pointer shrink-0"
                >
                  <span>Profile Home</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Profile Intro / Hero Card (ONLY SHOWN ON HOME TAB) */}
            {activeTab === 'home' && (
              <div className="rounded-3xl border border-border bg-card shadow-card text-left relative overflow-hidden">
                {profile.coverUrl ? (
                  <div className="w-full aspect-[2.6/1] xs:aspect-[2.8/1] sm:aspect-auto sm:h-60 bg-muted relative overflow-hidden flex items-center justify-center">
                    <img
                      src={profile.coverUrl}
                      alt="Cover Banner"
                      className="w-full h-full object-cover object-center"
                    />
                  </div>
                ) : null}

                <div className="p-6 sm:p-10 space-y-6">
                  {profile.coverUrl ? (
                    <div className="flex flex-wrap items-end justify-between gap-4 -mt-16 sm:-mt-20">
                      <Avatar
                        src={profile.avatarUrl || profileUser?.avatarUrl}
                        fallback={profileUser.displayName}
                        alt={profileUser.displayName}
                        size="2xl"
                        className="rounded-3xl ring-4 ring-card shadow-xl bg-card shrink-0"
                      />
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground">
                          @{profileUser.username}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between pb-4 border-b border-border">
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Identity Presentation
                      </div>
                      <div className="text-xs font-mono text-muted-foreground">
                        @{profileUser.username}
                      </div>
                    </div>
                  )}

                  <div className={profile.coverUrl ? "space-y-3" : "flex flex-col sm:flex-row gap-6 sm:gap-8 items-start"}>
                    {!profile.coverUrl && (
                      <Avatar
                        src={profile.avatarUrl || profileUser?.avatarUrl}
                        fallback={profileUser.displayName}
                        alt={profileUser.displayName}
                        size="2xl"
                        className="rounded-3xl ring-4 ring-primary/10 shadow-md"
                      />
                    )}

                    <div className="flex-1 space-y-3 min-w-0 max-w-full overflow-hidden">
                      <div className="min-w-0 max-w-full">
                        <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground break-words [overflow-wrap:anywhere] min-w-0">
                          {profileUser.displayName}
                        </h1>
                        {profile.headline && (
                          <p className="text-base sm:text-lg font-medium text-primary mt-1 break-words [overflow-wrap:anywhere] min-w-0">
                            {profile.headline}
                          </p>
                        )}
                      </div>

                      {/* Active Profession Title Badge */}
                      {profile.professionTitle &&
                        profile.professionTitle !== 'Basic Universal Template' &&
                        profile.professionTitle !== 'Universal Profile' &&
                        profile.professionTitle.trim().toLowerCase() !== profile.headline?.trim().toLowerCase() && (
                        <div className="flex flex-wrap gap-2 pt-1 max-w-full">
                          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-primary/10 text-primary border border-primary/20 shadow-xs max-w-full break-words [overflow-wrap:anywhere]">
                            <Briefcase className="h-3.5 w-3.5 shrink-0" />
                            <span className="break-words [overflow-wrap:anywhere] min-w-0">{profile.professionTitle}</span>
                          </span>
                        </div>
                      )}

                      {/* Bio */}
                      {profile.bio && (
                        <p className="text-sm sm:text-base text-foreground/80 leading-relaxed pt-2 max-w-2xl whitespace-pre-line break-words [overflow-wrap:anywhere] min-w-0">
                          {profile.bio}
                        </p>
                      )}

                      {/* Location and Contact Info Pills */}
                      <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-muted-foreground min-w-0 max-w-full">
                        {profile.location && (profile.location.city || profile.location.country) && (
                          <div className="flex items-center gap-1.5 min-w-0 max-w-full">
                            <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span className="break-words [overflow-wrap:anywhere] min-w-0">
                              {[profile.location.city, profile.location.country].filter(Boolean).join(', ')}
                              {profile.location.isRemote && ' (Remote)'}
                            </span>
                          </div>
                        )}
                        {profile.contact?.website && (
                          <a
                            href={profile.contact.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => handleLinkClick(profile.contact!.website!, 'Website')}
                            className="flex items-center gap-1.5 text-primary hover:underline min-w-0 max-w-full"
                          >
                            <Globe className="h-3.5 w-3.5 shrink-0" />
                            <span className="break-words [overflow-wrap:anywhere] min-w-0">Portfolio / Site</span>
                            <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                          </a>
                        )}
                        {profile.contact?.email && (
                          <a
                            href={`mailto:${profile.contact.email}`}
                            className="flex items-center gap-1.5 hover:text-foreground transition-colors min-w-0 max-w-full"
                          >
                            <Mail className="h-3.5 w-3.5 shrink-0" />
                            <span className="break-words [overflow-wrap:anywhere] min-w-0">{profile.contact.email}</span>
                          </a>
                        )}
                        {profile.contact?.phone && (
                          <div className="flex items-center gap-1.5 text-muted-foreground min-w-0 max-w-full">
                            <Phone className="h-3.5 w-3.5 shrink-0" />
                            <span className="break-words [overflow-wrap:anywhere] min-w-0">{profile.contact.phone}</span>
                          </div>
                        )}
                        {profile.contact?.address && (
                          <div className="flex items-center gap-1.5 text-muted-foreground min-w-0 max-w-full">
                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                            <span className="break-words [overflow-wrap:anywhere] min-w-0">{profile.contact.address}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

        {/* Fixed Mobile Bottom Navigation Bar */}
        {profileTabs.length > 1 && (
          <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-lg border-t border-border shadow-2xl px-2 py-1.5 flex items-center justify-around min-w-0">
            {profileTabs.map((tab) => {
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-col items-center justify-center gap-0.5 py-1 px-2 rounded-xl text-[10px] font-bold transition-all shrink-0 cursor-pointer ${
                    isActive
                      ? 'text-primary font-extrabold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <div className={`p-1 rounded-lg ${isActive ? 'bg-primary/15 text-primary' : ''}`}>
                    {tab.icon}
                  </div>
                  <span className="truncate max-w-[65px]">{tab.label}</span>
                </button>
              )
            })}
          </div>
        )}

        {/* Dynamic Sections Content */}
        <div className="space-y-6">
            {/* Experience Section */}
            {(activeTab === 'all' || activeTab === 'experience') && experiences.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4 min-w-0 max-w-full">
                <div className="flex items-center gap-2.5 pb-2 border-b border-border min-w-0">
                  <div className="p-2 rounded-xl bg-primary-soft text-primary shrink-0">
                    <Briefcase className="h-4 w-4" />
                  </div>
                  <h2 className="text-lg font-bold text-foreground break-words [overflow-wrap:anywhere] min-w-0">Experience & Career</h2>
                </div>
                <div className="space-y-6 pt-2 min-w-0">
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
                      <div key={exp.id || idx} className="space-y-1 relative pl-4 border-l-2 border-primary/30 min-w-0 max-w-full">
                        <div className="flex items-start justify-between gap-2 min-w-0">
                          <h3 className="font-bold text-foreground text-sm break-words [overflow-wrap:anywhere] min-w-0">{exp.role}</h3>
                          {dateStr && (
                            <span className="text-[11px] font-semibold text-muted-foreground whitespace-nowrap bg-muted/60 px-2 py-0.5 rounded-md shrink-0">
                              {dateStr}
                            </span>
                          )}
                        </div>
                        <div className="text-xs font-semibold text-primary break-words [overflow-wrap:anywhere] min-w-0">
                          {exp.company}
                          {exp.location ? ` • ${exp.location}` : ''}
                        </div>
                        {exp.description && (
                          <p className="text-xs text-muted-foreground leading-relaxed pt-1 whitespace-pre-line break-words [overflow-wrap:anywhere] min-w-0">
                            {exp.description}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Projects Section */}
            {(activeTab === 'all' || activeTab === 'portfolio') && projects.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4 min-w-0 max-w-full">
                <div className="flex items-center gap-2.5 pb-2 border-b border-border min-w-0">
                  <div className="p-2 rounded-xl bg-primary-soft text-primary shrink-0">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <h2 className="text-lg font-bold text-foreground break-words [overflow-wrap:anywhere] min-w-0">Featured Projects & Work</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 min-w-0">
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
                      <div key={proj.id || idx} className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-2 hover:border-primary/40 transition-colors min-w-0 max-w-full overflow-hidden">
                        <div className="flex items-start justify-between gap-2 min-w-0">
                          <div className="min-w-0">
                            <h3 className="font-bold text-sm text-foreground break-words [overflow-wrap:anywhere] min-w-0">{proj.title}</h3>
                            {dateStr && (
                              <span className="text-[10px] font-medium text-muted-foreground block">
                                {dateStr}
                              </span>
                            )}
                          </div>
                          {proj.url && (
                            <a
                              href={proj.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => handleLinkClick(proj.url!, proj.title)}
                              className="text-primary hover:text-primary-hover p-1 shrink-0"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                        {proj.description && (
                          <p className="text-xs text-muted-foreground line-clamp-3 break-words [overflow-wrap:anywhere] min-w-0">
                            {proj.description}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Services Section */}
            {(activeTab === 'all' || activeTab === 'portfolio') && services.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4 min-w-0 max-w-full">
                <div className="flex items-center gap-2.5 pb-2 border-b border-border min-w-0">
                  <div className="p-2 rounded-xl bg-primary-soft text-primary shrink-0">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <h2 className="text-lg font-bold text-foreground break-words [overflow-wrap:anywhere] min-w-0">Services & Offerings</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 min-w-0">
                  {services.map((srv: any, idx: number) => (
                    <div key={srv.id || idx} className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-2 min-w-0 max-w-full overflow-hidden">
                      <div className="flex items-start justify-between gap-2 min-w-0">
                        <h3 className="font-bold text-sm text-foreground break-words [overflow-wrap:anywhere] min-w-0">{srv.title}</h3>
                        {srv.priceRange && (
                          <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md shrink-0">
                            {srv.priceRange}
                          </span>
                        )}
                      </div>
                      {srv.description && (
                        <p className="text-xs text-muted-foreground leading-relaxed break-words [overflow-wrap:anywhere] min-w-0">
                          {srv.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Publications Section */}
            {(activeTab === 'all' || activeTab === 'media') && publications.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4 min-w-0 max-w-full">
                <div className="flex items-center gap-2.5 pb-2 border-b border-border min-w-0">
                  <div className="p-2 rounded-xl bg-primary-soft text-primary shrink-0">
                    <FileText className="h-4 w-4" />
                  </div>
                  <h2 className="text-lg font-bold text-foreground break-words [overflow-wrap:anywhere] min-w-0">Publications & Research</h2>
                </div>
                <div className="space-y-4 pt-2 min-w-0">
                  {publications.map((pub: any, idx: number) => (
                    <div key={pub.id || idx} className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-1 min-w-0 max-w-full overflow-hidden">
                      <div className="flex items-start justify-between gap-2 min-w-0">
                        <h3 className="font-bold text-sm text-foreground break-words [overflow-wrap:anywhere] min-w-0">{pub.title}</h3>
                        {(pub.year || pub.date) && (
                          <span className="text-[11px] font-semibold text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md whitespace-nowrap shrink-0">
                            {formatMonthYear(pub.month, pub.year, pub.date)}
                          </span>
                        )}
                      </div>
                      {pub.publisher && <div className="text-xs text-primary font-medium break-words [overflow-wrap:anywhere] min-w-0">{pub.publisher}</div>}
                      {pub.url && (
                        <a
                          href={pub.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline pt-1 min-w-0 max-w-full"
                        >
                          <span className="break-words [overflow-wrap:anywhere] min-w-0">Read Publication</span>
                          <ExternalLink className="h-3 w-3 shrink-0" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Ventures & Organizations */}
            {(activeTab === 'all' || activeTab === 'portfolio') && organizations.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4 min-w-0 max-w-full">
                <div className="flex items-center gap-2.5 pb-2 border-b border-border min-w-0">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-lg font-bold text-foreground break-words [overflow-wrap:anywhere] min-w-0">Ventures & Organizations</h2>
                    <p className="text-xs text-muted-foreground break-words [overflow-wrap:anywhere] min-w-0">Companies, startups, and initiatives founded or led</p>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 min-w-0">
                  {organizations.map((org: any, idx: number) => (
                    <div key={idx} className="p-4 rounded-xl border border-border/80 bg-muted/20 space-y-2 hover:border-primary/40 transition-colors min-w-0 max-w-full overflow-hidden">
                      <div className="flex items-start justify-between gap-2 min-w-0">
                        <span className="font-bold text-foreground text-sm break-words [overflow-wrap:anywhere] min-w-0">{org.name}</span>
                        {org.stage && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase shrink-0">
                            {org.stage}
                          </span>
                        )}
                      </div>
                      {org.role && (
                        <p className="text-xs font-medium text-foreground/80 break-words [overflow-wrap:anywhere] min-w-0">{org.role}</p>
                      )}
                      {org.tagline && (
                        <p className="text-xs text-muted-foreground line-clamp-2 break-words [overflow-wrap:anywhere] min-w-0">{org.tagline}</p>
                      )}
                      {org.website && (
                        <a
                          href={org.website.startsWith('http') ? org.website : `https://${org.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline pt-1 min-w-0 max-w-full"
                        >
                          <span className="break-words [overflow-wrap:anywhere] min-w-0">Visit website</span>
                          <ExternalLink className="h-3 w-3 shrink-0" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Media & Channels */}
            {(activeTab === 'all' || activeTab === 'media') && mediaGallery.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4 min-w-0 max-w-full">
                <div className="flex items-center gap-2.5 pb-2 border-b border-border min-w-0">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
                    <Video className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-lg font-bold text-foreground break-words [overflow-wrap:anywhere] min-w-0">Media & Channels</h2>
                    <p className="text-xs text-muted-foreground break-words [overflow-wrap:anywhere] min-w-0">Featured videos, channels, and broadcasts</p>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 min-w-0">
                  {mediaGallery.map((media: any, idx: number) => (
                    <div key={idx} className="p-4 rounded-xl border border-border/80 bg-muted/20 space-y-2 hover:border-primary/40 transition-colors min-w-0 max-w-full overflow-hidden">
                      <div className="flex items-start justify-between gap-2 min-w-0">
                        <span className="font-bold text-foreground text-sm break-words [overflow-wrap:anywhere] min-w-0">{media.title}</span>
                        {media.platform && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground uppercase shrink-0">
                            {media.platform}
                          </span>
                        )}
                      </div>
                      {media.metrics && (
                        <span className="inline-block text-[11px] font-medium text-primary bg-primary/5 px-2 py-0.5 rounded shrink-0">
                          {media.metrics}
                        </span>
                      )}
                      {media.url && (
                        <div>
                          <a
                            href={media.url.startsWith('http') ? media.url : `https://${media.url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline pt-1 min-w-0 max-w-full"
                          >
                            <span className="break-words [overflow-wrap:anywhere] min-w-0">Watch / Listen</span>
                            <ExternalLink className="h-3 w-3 shrink-0" />
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Custom Sections */}
            {(activeTab === 'all' || activeTab === 'custom') && customSections.length > 0 && customSections.map((sec: any, idx: number) => (
              <div key={sec.id || idx} className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4 min-w-0 max-w-full">
                <div className="pb-2 border-b border-border min-w-0">
                  <h2 className="text-lg font-bold text-foreground break-words [overflow-wrap:anywhere] min-w-0">{sec.title}</h2>
                  {sec.description && (
                    <p className="text-xs text-muted-foreground break-words [overflow-wrap:anywhere] min-w-0">{sec.description}</p>
                  )}
                </div>
                <div className="space-y-3 pt-2 min-w-0">
                  {sec.blocks?.map((block: any, bIdx: number) => (
                    <div key={bIdx} className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line break-words [overflow-wrap:anywhere] min-w-0">
                      {block.content}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Community Posts */}
            {(activeTab === 'all' || activeTab === 'posts') && userPosts.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4 min-w-0 max-w-full">
                <div className="flex items-center justify-between pb-2 border-b border-border min-w-0">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-2 rounded-xl bg-primary-soft text-primary shrink-0">
                      <Flame className="h-4 w-4" />
                    </div>
                    <h2 className="text-lg font-bold text-foreground break-words [overflow-wrap:anywhere] min-w-0">Community Posts</h2>
                  </div>
                  <Link to="/app/feed" className="text-xs font-semibold text-primary hover:underline shrink-0">
                    View in Feed →
                  </Link>
                </div>
                <div className="space-y-4 pt-1 min-w-0">
                  {userPosts.slice(0, 3).map((post) => (
                    <div key={post._id} className="p-4 rounded-xl border border-border/80 bg-muted/20 space-y-2 min-w-0 max-w-full overflow-hidden">
                      {post.content && (
                        <p className="text-xs text-foreground/90 whitespace-pre-line leading-relaxed break-words [overflow-wrap:anywhere] min-w-0">
                          {post.content}
                        </p>
                      )}
                      {post.media && post.media.length > 0 && (
                        <div className="rounded-xl overflow-hidden max-h-48 border border-border bg-black">
                          {post.media[0].type === 'IMAGE' ? (
                            <img src={post.media[0].url} alt="Post media" className="w-full h-48 object-cover" />
                          ) : (
                            <video src={post.media[0].url} controls className="w-full h-48" />
                          )}
                        </div>
                      )}
                      <div className="flex items-center gap-4 text-[11px] text-muted-foreground pt-1 min-w-0">
                        <span className="flex items-center gap-1 shrink-0">
                          <Heart className="h-3 w-3 text-rose-500" />
                          <span>{post.likesCount || 0}</span>
                        </span>
                        <span className="flex items-center gap-1 shrink-0">
                          <MessageSquare className="h-3 w-3 text-primary" />
                          <span>{post.commentsCount || 0}</span>
                        </span>
                        <Link to={`/app/feed#${post._id}`} className="text-primary hover:underline ml-auto font-medium shrink-0">
                          Discuss
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Overview Info Cards (Skills, Social, Education, Honors) - Shown on Home Tab */}
            {activeTab === 'home' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                {/* Skills Card */}
                {skills.length > 0 && (
                  <div className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-3 min-w-0 max-w-full">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border/40 pb-2">
                      Verified Skills
                    </h2>
                    <div className="flex flex-wrap gap-1.5 pt-1 min-w-0 max-w-full">
                      {skills.map((skill: any, idx: number) => (
                        <Badge key={skill.id || idx} variant="subtle" className="font-medium text-xs break-words [overflow-wrap:anywhere] max-w-full">
                          {skill.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Social Links */}
                {profile.socialLinks && profile.socialLinks.length > 0 && (
                  <div className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-3 min-w-0 max-w-full">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border/40 pb-2">
                      Connect & Social
                    </h2>
                    <div className="space-y-2 pt-1 min-w-0 max-w-full">
                      {profile.socialLinks.map((link: any, idx: number) => (
                        <a
                          key={link.id || idx}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => handleLinkClick(link.url, link.platform)}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 hover:bg-primary-soft hover:text-primary transition-colors text-xs font-semibold min-w-0 max-w-full"
                        >
                          <span className="break-words [overflow-wrap:anywhere] min-w-0">{link.label || link.platform}</span>
                          <ExternalLink className="h-3.5 w-3.5 opacity-60 shrink-0" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Education Card */}
                {education.length > 0 && (
                  <div className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-3 min-w-0 max-w-full">
                    <div className="flex items-center gap-2 pb-2 border-b border-border min-w-0">
                      <GraduationCap className="h-4 w-4 text-primary shrink-0" />
                      <h2 className="text-sm font-bold text-foreground break-words [overflow-wrap:anywhere] min-w-0">Education</h2>
                    </div>
                    <div className="space-y-3 pt-1 min-w-0">
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
                          <div key={edu.id || idx} className="text-xs space-y-0.5 border-b border-border/40 last:border-0 pb-2.5 last:pb-0 min-w-0 max-w-full">
                            <div className="flex items-start justify-between gap-1 min-w-0">
                              <div className="font-bold text-foreground break-words [overflow-wrap:anywhere] min-w-0">{edu.institution}</div>
                              {dateStr && (
                                <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
                                  {dateStr}
                                </span>
                              )}
                            </div>
                            <div className="text-primary font-medium break-words [overflow-wrap:anywhere] min-w-0">
                              {[edu.degree, edu.fieldOfStudy].filter(Boolean).join(' in ')}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Awards & Certifications */}
                {(awards.length > 0 || certifications.length > 0) && (
                  <div className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-3 min-w-0 max-w-full">
                    <div className="flex items-center gap-2 pb-2 border-b border-border min-w-0">
                      <Award className="h-4 w-4 text-primary shrink-0" />
                      <h2 className="text-sm font-bold text-foreground break-words [overflow-wrap:anywhere] min-w-0">Honors & Certifications</h2>
                    </div>
                    <div className="space-y-3 pt-1 min-w-0">
                      {awards.map((award: any, idx: number) => (
                        <div key={award.id || idx} className="text-xs space-y-0.5 border-b border-border/40 last:border-0 pb-2 last:pb-0 min-w-0 max-w-full">
                          <div className="flex items-start justify-between gap-1 min-w-0">
                            <div className="font-bold text-foreground break-words [overflow-wrap:anywhere] min-w-0">{award.title}</div>
                            {(award.year || award.date) && (
                              <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
                                {formatMonthYear(award.month, award.year, award.date)}
                              </span>
                            )}
                          </div>
                          <div className="text-muted-foreground break-words [overflow-wrap:anywhere] min-w-0">{award.issuer}</div>
                        </div>
                      ))}
                      {certifications.map((cert: any, idx: number) => (
                        <div key={cert.id || idx} className="text-xs space-y-0.5 border-b border-border/40 last:border-0 pb-2 last:pb-0 min-w-0 max-w-full">
                          <div className="flex items-start justify-between gap-1 min-w-0">
                            <div className="font-bold text-foreground break-words [overflow-wrap:anywhere] min-w-0">{cert.name}</div>
                            {(cert.issueYear || cert.issueDate) && (
                              <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
                                {cert.doesNotExpire
                                  ? 'No Expiration'
                                  : formatMonthYear(cert.issueMonth, cert.issueYear, cert.issueDate)}
                              </span>
                            )}
                          </div>
                          <div className="text-muted-foreground break-words [overflow-wrap:anywhere] min-w-0">{cert.issuer}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>

      {/* Share Modal with QR Code */}
      <Dialog open={isShareModalOpen} onOpenChange={setIsShareModalOpen}>
        <DialogHeader>
          <DialogTitle>Share OneWinq Identity</DialogTitle>
          <DialogDescription>
            Scan this QR code with any phone camera to view @{profileUser.username}'s live credentials.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center p-6 space-y-4 bg-muted/20 rounded-2xl border border-border">
          <div className="p-4 bg-white rounded-2xl shadow-md">
            <QRCodeSVG value={profileUrl} size={180} level="H" includeMargin />
          </div>
          <div className="text-xs font-mono text-muted-foreground truncate max-w-xs">
            {profileUrl}
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <Button
            className="flex-1"
            onClick={handleCopyLink}
            leftIcon={isCopied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
          >
            {isCopied ? 'Link Copied!' : 'Copy Permanent Link'}
          </Button>
        </div>
      </Dialog>

      {/* Connect Request Modal */}
      <Dialog open={isConnectModalOpen} onOpenChange={setIsConnectModalOpen}>
        <DialogHeader>
          <DialogTitle>Connect with {profileUser.displayName}</DialogTitle>
          <DialogDescription>
            Introduce yourself and explain why you'd like to link identities.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-2">
          <textarea
            value={connectNote}
            onChange={(e) => setConnectNote(e.target.value)}
            placeholder="Hi Siddharth, I saw your work on OneWinq and would love to connect..."
            rows={4}
            className="w-full rounded-xl border border-input bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => setIsConnectModalOpen(false)}>
            Cancel
          </Button>
          <Button
            isLoading={sendRequestMutation.isPending}
            onClick={() => {
              const uId =
                (profileUser as any)?._id ||
                (profileUser as any)?.id ||
                (typeof profile.userId === 'object' && profile.userId !== null
                  ? (profile.userId as any)._id || (profile.userId as any).id
                  : profile.userId)
              if (uId) {
                sendRequestMutation.mutate(String(uId))
              } else {
                toast.error('Unable to locate user ID')
              }
            }}
          >
            Send Request
          </Button>
        </div>
      </Dialog>
    </div>
  )
}
