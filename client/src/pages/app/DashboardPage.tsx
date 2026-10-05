import * as React from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { QRCodeSVG } from 'qrcode.react'
import { useAuthStore } from '@/stores/authStore'
import { profileApi } from '@/features/profile/api/profile.api'
import { connectionsApi } from '@/features/connections/api/connections.api'
import { analyticsApi } from '@/features/analytics/api/analytics.api'
import { cardsApi } from '@/features/cards/api/cards.api'
import { postsApi } from '@/features/posts/api/posts.api'
import { queryKeys } from '@/lib/query/queryKeys'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/Dialog'
import { LoadingScreen } from '@/components/common/LoadingScreen'
import { toast } from '@/stores/toastStore'
import { useUIStore } from '@/stores/uiStore'
import {
  Flame,
  Compass,
  Users,
  Eye,
  CreditCard,
  Share2,
  ExternalLink,
  Copy,
  Check,
  CheckCircle2,
  Sparkles,
  TrendingUp,
  UserCheck,
  Heart,
  MessageSquare,
  Plus,
  Wifi,
  Edit3,
  LayoutTemplate,
} from 'lucide-react'

export default function DashboardPage() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const { openModal } = useUIStore()

  const [isShareModalOpen, setIsShareModalOpen] = React.useState(false)
  const [isCopied, setIsCopied] = React.useState(false)

  // 1. Fetch Profile Data
  const { data: profileData, isLoading: isProfileLoading } = useQuery({
    queryKey: queryKeys.profile.me,
    queryFn: () => profileApi.getMyProfile(),
  })

  // 2. Fetch Analytics Overview
  const { data: analyticsData } = useQuery({
    queryKey: queryKeys.analytics.overview,
    queryFn: () => analyticsApi.getOverview(),
  })

  // 3. Fetch Weekly Profile Analytics for Trend Chart
  const { data: weeklyAnalytics } = useQuery({
    queryKey: queryKeys.analytics.profile('7d'),
    queryFn: () => analyticsApi.getProfileAnalytics('7d'),
  })

  // 4. Fetch Active NFC Cards
  const { data: cardsData } = useQuery({
    queryKey: queryKeys.cards.list,
    queryFn: () => cardsApi.listCards(),
  })

  // 5. Fetch Connections & Pending Requests
  const { data: connectionsData } = useQuery({
    queryKey: queryKeys.connections.list(),
    queryFn: () => connectionsApi.getConnections(),
  })

  const { data: pendingRequestsData, refetch: refetchRequests } = useQuery({
    queryKey: queryKeys.connections.pending('incoming'),
    queryFn: () => connectionsApi.getPendingRequests('incoming'),
  })

  // 6. Fetch User's Recent Posts
  const { data: myPostsData } = useQuery({
    queryKey: queryKeys.posts.feed({ filter: 'my', limit: 2 }),
    queryFn: () => postsApi.getFeed({ filter: 'my', limit: 2 }),
  })

  // 7. Fetch Profile Template & Recommendations
  const { data: recData } = useQuery({
    queryKey: ['profile-recommendations'],
    queryFn: () => profileApi.getRecommendations(),
  })
  const currentTemplate = recData?.data?.activeTemplate || (profileData?.data?.profile as any)?.templateId

  // Mutation: Publish profile changes
  const publishMutation = useMutation({
    mutationFn: () => profileApi.publish(),
    onSuccess: (res) => {
      queryClient.setQueryData(queryKeys.profile.me, res)
      toast.success('Your profile changes are now published live!')
    },
    onError: () => toast.error('Failed to publish changes'),
  })

  // Mutation: Accept connection request
  const acceptRequestMutation = useMutation({
    mutationFn: (requestId: string) => connectionsApi.acceptRequest(requestId),
    onSuccess: () => {
      toast.success('Connection request accepted!')
      refetchRequests()
      queryClient.invalidateQueries({ queryKey: queryKeys.connections.list() })
    },
  })

  // Mutation: Reject connection request
  const rejectRequestMutation = useMutation({
    mutationFn: (requestId: string) => connectionsApi.rejectRequest(requestId),
    onSuccess: () => {
      toast.default('Request ignored.')
      refetchRequests()
    },
  })

  if (isProfileLoading) {
    return <LoadingScreen message="Loading your OneWinq command center..." />
  }

  const profile = profileData?.data?.profile
  const identities = profileData?.data?.identities || profile?.identities || []
  const primaryIdentity = identities.find((i: any) => i.isPrimary) || identities[0]

  const cards = (cardsData?.data as any)?.cards || []
  const activeUserCard = cards.find((c: any) => c.state === 'ACTIVE' || c.status === 'ACTIVE')

  const cardCode = activeUserCard?.cardCode?.toLowerCase() || activeUserCard?.cardUid?.toLowerCase()
  const vanityUrl = cardCode
    ? `${window.location.origin}/p/c/${cardCode}`
    : null

  const handleCopyLink = () => {
    if (!vanityUrl) {
      toast.error('Activate your physical card first to unlock your public link.')
      return
    }
    navigator.clipboard.writeText(vanityUrl)
    setIsCopied(true)
    toast.success('Profile link copied to clipboard!')
    setTimeout(() => setIsCopied(false), 2500)
  }

  // Calculate Identity Completeness
  const checklist = [
    { label: 'Profile Photo', completed: Boolean(profile?.avatarUrl) },
    { label: 'Headline & Bio', completed: Boolean(profile?.headline && profile?.bio) },
    { label: 'Primary Profession', completed: identities.length > 0 },
    { label: 'Verified Skills', completed: (profile?.skills?.length || 0) > 0 },
    { label: 'Career Experience', completed: (profile?.experience?.length || 0) > 0 },
    { label: 'Social & Web Profiles', completed: (profile?.socialLinks?.length || 0) > 0 },
    { label: 'Active NFC Smart Card', completed: (cardsData?.data?.cards?.length || 0) > 0 },
  ]
  const completedCount = checklist.filter((item) => item.completed).length
  const completenessPercent = Math.round((completedCount / checklist.length) * 100)

  // Metrics Data
  const profileViews =
    analyticsData?.data?.overview?.totalProfileViews ??
    (analyticsData?.data as any)?.summary?.totalViews ??
    0
  const totalConnections = connectionsData?.data?.connections?.length || 0
  const pendingRequests = pendingRequestsData?.data?.requests || []
  const primaryCard = cards.find((c: any) => c.state === 'ACTIVE') || cards[0]
  const totalCardTaps =
    analyticsData?.data?.overview?.nfcTaps ??
    cards.reduce((acc: number, c: any) => acc + (c.tapCount || 0), 0)

  const myPosts = myPostsData?.data?.posts || []
  const totalPostLikes = myPosts.reduce((acc: number, p: any) => acc + (p.likesCount || 0), 0)
  const totalPostComments = myPosts.reduce((acc: number, p: any) => acc + (p.commentsCount || 0), 0)

  const timeSeries =
    weeklyAnalytics?.data?.analytics?.timeSeries ||
    (weeklyAnalytics?.data as any)?.timeSeries ||
    (weeklyAnalytics?.data as any)?.timeline ||
    []


  return (
    <div className="w-full max-w-6xl mx-auto space-y-5 sm:space-y-8 text-left pb-24">
      {/* 1. Hero Identity Banner */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-border bg-card p-4 sm:p-6 lg:p-8 shadow-sm">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4 sm:gap-5 min-w-0">
            <Avatar
              src={profile?.avatarUrl || user?.avatarUrl}
              fallback={user?.displayName}
              alt={user?.displayName}
              size="xl"
              className="rounded-2xl ring-4 ring-card shadow-md shrink-0 mt-1"
            />
            <div className="space-y-1.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-foreground break-words leading-tight">
                  Welcome back, {user?.displayName}
                </h1>
                {primaryIdentity && (
                  <Badge variant="subtle" className="text-xs font-semibold py-0.5 px-2.5">
                    {primaryIdentity.customTitle}
                  </Badge>
                )}
              </div>

              <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1 max-w-xl">
                {profile?.headline || 'Manage your digital profile, network connections, and NFC smart cards.'}
              </p>

              {/* Profile Link preview bar */}
              <div className="flex items-center gap-2 pt-2 max-w-full overflow-hidden">
                <span className="text-xs font-medium text-muted-foreground shrink-0">Link:</span>
                {activeUserCard && cardCode ? (
                  <a
                    href={`/p/c/${cardCode}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-mono text-primary font-semibold hover:underline inline-flex items-center gap-1 bg-primary-soft px-2.5 py-1 rounded-lg min-w-0 overflow-hidden"
                  >
                    <span className="truncate">onewinq.me/p/c/{cardCode}</span>
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                ) : (
                  <span className="text-xs font-mono text-muted-foreground/50 italic px-2.5 py-1">
                    Unlocks after card activation
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions — full width on mobile, right-aligned on lg */}
          <div className="flex items-center flex-wrap gap-2 w-full lg:w-auto">
            <Button
              variant="default"
              size="sm"
              onClick={() => openModal('CREATE_POST')}
              leftIcon={<Plus className="h-4 w-4 stroke-[2.5]" />}
              className="bg-gradient-to-r from-primary to-primary-600 hover:from-primary-600 hover:to-primary-700 shadow-sm shadow-primary/25 font-bold flex-1 sm:flex-none"
            >
              New Post
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsShareModalOpen(true)}
              leftIcon={<Share2 className="h-4 w-4" />}
              className="flex-1 sm:flex-none"
            >
              Share QR
            </Button>

            <Button
              variant="subtle"
              size="sm"
              onClick={handleCopyLink}
              leftIcon={isCopied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              className="flex-1 sm:flex-none"
            >
              {isCopied ? 'Copied' : 'Copy Link'}
            </Button>

            {profile?.state === 'DRAFT' && (
              <Button
                variant="subtle"
                size="sm"
                isLoading={publishMutation.isPending}
                onClick={() => publishMutation.mutate()}
                leftIcon={<Sparkles className="h-4 w-4 text-primary" />}
                className="flex-1 sm:flex-none"
              >
                Publish Live
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Key Performance Indicators (KPI Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* KPI 1: Profile Views */}
        <div className="rounded-3xl border border-border bg-card p-5 shadow-sm space-y-2 relative overflow-hidden group hover:border-primary/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Profile Views
            </span>
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Eye className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 pt-1">
            <span className="text-3xl font-black text-foreground">{profileViews}</span>
            <span className="text-xs font-semibold text-emerald-500 flex items-center gap-0.5">
              <TrendingUp className="h-3 w-3" /> 7-day active
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground">Total views on your profile</p>
        </div>

        {/* KPI 2: NFC Card Taps */}
        <div className="rounded-3xl border border-border bg-card p-5 shadow-sm space-y-2 relative overflow-hidden group hover:border-primary/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Smart Card Taps
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
              <Wifi className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 pt-1">
            <span className="text-3xl font-black text-foreground">{totalCardTaps}</span>
            <span className="text-xs font-semibold text-muted-foreground">
              {cards.length} {cards.length === 1 ? 'card' : 'cards'}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground">Times your cards were tapped</p>
        </div>

        {/* KPI 3: Connections */}
        <div className="rounded-3xl border border-border bg-card p-5 shadow-sm space-y-2 relative overflow-hidden group hover:border-primary/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Network Size
            </span>
            <div className="p-2 rounded-xl bg-violet-500/10 text-violet-500">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 pt-1">
            <span className="text-3xl font-black text-foreground">{totalConnections}</span>
            {pendingRequests.length > 0 && (
              <Badge variant="warning" className="text-[10px] py-0.5 px-1.5 font-bold">
                {pendingRequests.length} pending
              </Badge>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">Connections in your network</p>
        </div>

        {/* KPI 4: Feed Engagement */}
        <div className="rounded-3xl border border-border bg-card p-5 shadow-sm space-y-2 relative overflow-hidden group hover:border-primary/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Community Activity
            </span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500">
              <Flame className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 pt-1">
            <span className="text-3xl font-black text-foreground">{totalPostLikes + totalPostComments}</span>
            <span className="text-xs font-semibold text-muted-foreground">
              {myPosts.length} posts
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground">Likes and comments on your posts</p>
        </div>
      </div>

      {/* 3. Fast Actions Bar */}
      <div className="rounded-2xl border border-border bg-muted/30 p-3 sm:p-4 flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-3">
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-1">
          Quick Launch:
        </span>
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
          <Link to="/app/feed" className="w-full sm:w-auto">
            <Button size="sm" variant="outline" leftIcon={<Flame className="h-3.5 w-3.5 text-primary" />} className="w-full sm:w-auto">
              Create Post
            </Button>
          </Link>
          <Link to="/app/profile/edit" className="w-full sm:w-auto">
            <Button size="sm" variant="outline" leftIcon={<Edit3 className="h-3.5 w-3.5 text-primary" />} className="w-full sm:w-auto">
              Edit Identity
            </Button>
          </Link>
          <Link to="/app/cards" className="w-full sm:w-auto">
            <Button size="sm" variant="outline" leftIcon={<CreditCard className="h-3.5 w-3.5 text-emerald-500" />} className="w-full sm:w-auto">
              Manage Cards
            </Button>
          </Link>
          <Link to="/app/network" className="w-full sm:w-auto">
            <Button size="sm" variant="outline" leftIcon={<Compass className="h-3.5 w-3.5 text-violet-500" />} className="w-full sm:w-auto">
              Discover People
            </Button>
          </Link>
        </div>
      </div>

      {/* 4. Main Two-Column Activity & Health Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-8 items-start">
        {/* Left Column (8 cols): Connection Requests & Recent Posts */}
        <div className="lg:col-span-8 space-y-6">
          {/* Pending Connection Requests */}
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-violet-500/10 text-violet-500">
                  <UserCheck className="h-4 w-4" />
                </div>
                <h2 className="text-base font-bold text-foreground">
                  Pending Connection Requests
                </h2>
                {pendingRequests.length > 0 && (
                  <Badge variant="subtle" className="text-xs font-bold px-2 py-0.5">
                    {pendingRequests.length}
                  </Badge>
                )}
              </div>
              <Link to="/app/connections" className="text-xs font-semibold text-primary hover:underline">
                View All →
              </Link>
            </div>

            {pendingRequests.length === 0 ? (
              <div className="text-center py-6 space-y-2">
                <p className="text-xs text-muted-foreground">
                  No pending connection requests. Your network inbox is all caught up!
                </p>
                <Link to="/app/network">
                  <Button variant="subtle" size="sm" className="mt-1" leftIcon={<Compass className="h-3.5 w-3.5" />}>
                    Find People in Discovery
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingRequests.slice(0, 3).map((req: any) => {
                  const requester = req.requesterId
                  return (
                    <div
                      key={req._id}
                      className="p-4 rounded-2xl border border-border/80 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <Avatar
                          src={requester?.avatarUrl}
                          fallback={requester?.displayName}
                          alt={requester?.displayName}
                          size="md"
                          className="rounded-xl shrink-0"
                        />
                        <div className="min-w-0 space-y-0.5">
                          <Link
                            to={`/u/${requester?.username}`}
                            target="_blank"
                            className="text-sm font-bold text-foreground hover:text-primary transition-colors truncate block"
                          >
                            {requester?.displayName}
                          </Link>
                          <span className="text-xs font-mono text-muted-foreground truncate block">
                            @{requester?.username}
                          </span>
                          {req.note && (
                            <p className="text-xs text-foreground/80 italic pt-1 line-clamp-1">
                              "{req.note}"
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => rejectRequestMutation.mutate(req._id)}
                          isLoading={rejectRequestMutation.isPending}
                        >
                          Ignore
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => acceptRequestMutation.mutate(req._id)}
                          isLoading={acceptRequestMutation.isPending}
                        >
                          Accept
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* User's Recent Community Posts & Discussions */}
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-border flex-wrap">
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
                  <Flame className="h-4 w-4" />
                </div>
                <h2 className="text-sm sm:text-base font-bold text-foreground whitespace-nowrap">
                  Recent Posts
                </h2>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => openModal('CREATE_POST')}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-primary bg-primary-soft hover:bg-primary-muted transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Plus className="h-3 w-3 stroke-[2.5]" />
                  <span>New Post</span>
                </button>
                <Link to="/app/feed" className="text-xs font-semibold text-muted-foreground hover:text-foreground whitespace-nowrap">
                  Feed →
                </Link>
              </div>
            </div>

            {myPosts.length === 0 ? (
              <div className="text-center py-6 space-y-3">
                <p className="text-xs text-muted-foreground">
                  You haven't posted any updates yet. Share what you're building with the OneWinq network!
                </p>
                <Button
                  size="sm"
                  onClick={() => openModal('CREATE_POST')}
                  leftIcon={<Plus className="h-3.5 w-3.5" />}
                  className="font-bold"
                >
                  Publish Your First Post
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {myPosts.map((post: any) => (
                  <div
                    key={post._id}
                    className="p-4 rounded-2xl border border-border/70 bg-muted/10 space-y-2 hover:border-primary/30 transition-colors"
                  >
                    <p className="text-xs text-foreground/90 whitespace-pre-line line-clamp-3 leading-relaxed">
                      {post.content}
                    </p>
                    <div className="flex items-center justify-between pt-2 border-t border-border/50 text-[11px] text-muted-foreground">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1 font-medium">
                          <Heart className="h-3 w-3 text-rose-500" />
                          <span>{post.likesCount || 0}</span>
                        </span>
                        <span className="flex items-center gap-1 font-medium">
                          <MessageSquare className="h-3 w-3 text-primary" />
                          <span>{post.commentsCount || 0}</span>
                        </span>
                      </div>
                      <Link
                        to={`/app/feed#${post._id}`}
                        className="text-xs font-semibold text-primary hover:underline"
                      >
                        View Thread →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (4 cols): Identity Health & NFC Card Widget */}
        <div className="lg:col-span-4 space-y-6">
          {/* Identity Completeness Widget */}
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Identity Health
              </h2>
              <span className="text-sm font-extrabold text-primary">
                {completenessPercent}%
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-violet-500 rounded-full transition-all duration-500"
                style={{ width: `${completenessPercent}%` }}
              />
            </div>

            <div className="space-y-2 pt-1 text-xs">
              {checklist.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between py-1">
                  <span className={item.completed ? 'text-foreground font-medium' : 'text-muted-foreground'}>
                    {item.label}
                  </span>
                  {item.completed ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <Link to="/app/profile/edit" className="text-[11px] font-bold text-primary hover:underline">
                      + Add
                    </Link>
                  )}
                </div>
              ))}
            </div>

            {completenessPercent < 100 && (
              <Link to="/app/profile/edit" className="block pt-2">
                <Button size="sm" variant="outline" className="w-full text-xs">
                  Complete Your Identity
                </Button>
              </Link>
            )}
          </div>

          {/* Profile Template Section */}
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <LayoutTemplate className="h-3.5 w-3.5 text-primary" />
                <span>Profile Template</span>
              </h2>
              <Link to="/app/templates" className="text-xs font-semibold text-primary hover:underline">
                Browse All
              </Link>
            </div>

            <div className="p-4 rounded-2xl bg-muted/30 border border-border/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground text-sm">
                  {currentTemplate?.name || 'Professional'}
                </span>
                <Badge variant="default" className="text-[10px] px-1.5 py-0 capitalize">
                  {currentTemplate?.category || 'General'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {currentTemplate?.description || 'A balanced professional identity showcasing your career and skills.'}
              </p>
            </div>

            <Link to="/app/templates" className="block">
              <Button size="sm" variant="outline" className="w-full text-xs gap-1.5">
                <LayoutTemplate className="h-3.5 w-3.5" />
                <span>Switch / Customize Template</span>
              </Button>
            </Link>
          </div>

          {/* Linked NFC Smart Card Widget */}
          <div className="rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5 text-primary" />
                <span>Smart Card Pass</span>
              </h2>
              <Link to="/app/cards" className="text-xs font-semibold text-primary hover:underline">
                Manage
              </Link>
            </div>

            {primaryCard ? (
              <Link to="/app/cards" className="block group">
                <div className="relative rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-950 to-black text-white p-5 border border-zinc-800 shadow-md flex flex-col justify-between min-h-[175px] overflow-hidden transition-all duration-300 group-hover:border-primary/40 group-hover:shadow-lg">
                  {/* Subtle Ambient Glow & Radial Grid */}
                  <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
                  <div
                    className="absolute inset-0 opacity-10 pointer-events-none"
                    style={{
                      backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
                      backgroundSize: '16px 16px',
                    }}
                  />

                  {/* Top Header */}
                  <div className="flex items-center justify-between relative z-10">
                    <span className="text-[11px] font-bold tracking-widest uppercase text-zinc-400">
                      OneWinq Pass
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                      <Wifi className="h-4 w-4 text-emerald-400" />
                    </div>
                  </div>

                  {/* Middle Identity */}
                  <div className="my-auto py-2 relative z-10 space-y-0.5">
                    <div className="font-extrabold text-base sm:text-lg tracking-tight text-white truncate">
                      {user?.displayName}
                    </div>
                    <div className="text-xs text-zinc-400 font-mono truncate">
                      @{user?.username}
                    </div>
                  </div>

                  {/* Bottom Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-zinc-800/80 text-[11px] text-zinc-400 relative z-10">
                    <span className="truncate max-w-[150px]">
                      Card: {primaryCard.label || 'Primary Card'}
                    </span>
                    <span className="font-bold text-emerald-400 shrink-0">
                      {primaryCard.tapCount || 0} Taps
                    </span>
                  </div>
                </div>
              </Link>
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-5 text-center space-y-3">
                <p className="text-xs text-muted-foreground">
                  No NFC Smart Card linked yet. Tap phones in the real world to instantly share your OneWinq credentials.
                </p>
                <Link to="/app/orders">
                  <Button size="sm" variant="subtle" className="w-full text-xs font-bold" leftIcon={<Plus className="h-3.5 w-3.5" />}>
                    Order Smart Card (from ₹500)
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* 7-Day Traffic Sparkline Card */}
          {timeSeries.length > 0 && (
            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  7-Day Impressions
                </h2>
                <Link to="/app/analytics" className="text-xs font-semibold text-primary hover:underline">
                  Full Analytics →
                </Link>
              </div>
              <div className="flex items-end justify-between gap-1.5 h-16 pt-2">
                {timeSeries.slice(-7).map((d: any, idx: number) => {
                  const maxViews = Math.max(...timeSeries.map((item: any) => item.views || 1), 1)
                  const heightPercent = Math.max(15, Math.round(((d.views || 0) / maxViews) * 100))
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1 group">
                      <div
                        className="w-full rounded-md bg-primary/20 group-hover:bg-primary transition-all duration-300"
                        style={{ height: `${heightPercent}%` }}
                        title={`${d.views || 0} views on ${d.date}`}
                      />
                      <span className="text-[9px] text-muted-foreground">
                        {new Date(d.date).toLocaleDateString([], { weekday: 'narrow' })}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Share / QR Modal */}
      <Dialog open={isShareModalOpen} onOpenChange={setIsShareModalOpen}>
        <DialogHeader>
          <DialogTitle>Share Your Profile</DialogTitle>
          <DialogDescription>
            Scan this QR code with any phone camera to instantly view your profile.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center p-6 space-y-4 bg-muted/20 rounded-2xl border border-border">
          <div className="p-4 bg-white rounded-2xl shadow-md">
            <QRCodeSVG value={vanityUrl} size={180} level="H" includeMargin />
          </div>
          <div className="text-xs font-mono text-muted-foreground truncate max-w-xs">
            {vanityUrl}
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <Button
            className="flex-1"
            onClick={handleCopyLink}
            leftIcon={isCopied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
          >
            {isCopied ? 'Link Copied!' : 'Copy Permanent Link'}
          </Button>
        </div>
      </Dialog>
    </div>
  )
}
