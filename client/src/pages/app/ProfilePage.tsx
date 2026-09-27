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
} from 'lucide-react'
import { cardsApi } from '@/features/cards/api/cards.api'
import { postsApi } from '@/features/posts/api/posts.api'
import { PostCard } from '@/components/posts/PostCard'
import { formatDateRange, formatMonthYear } from '@/utils/dateFormatter'

export default function ProfilePage() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  // Active Section Tracker for Mobile & Responsive Scroll Navigation
  const [activeSection, setActiveSection] = React.useState<string>('section-overview')
  const [isMenuDropdownOpen, setIsMenuDropdownOpen] = React.useState(false)

  // State for Temporary Mode Modal
  const [isTempModalOpen, setIsTempModalOpen] = React.useState(false)
  const [tempMode, setTempMode] = React.useState<VisibilityMode>(VISIBILITY_MODE.PROFESSIONAL)
  const [tempHours, setTempHours] = React.useState<number>(4)
  const [tempFallback, setTempFallback] = React.useState<VisibilityMode>(VISIBILITY_MODE.PUBLIC)

  // State for Preview Modal
  const [isPreviewOpen, setIsPreviewOpen] = React.useState(false)
  const [previewMode, setPreviewMode] = React.useState<VisibilityMode>(VISIBILITY_MODE.PUBLIC)

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
      queryClient.setQueryData(queryKeys.profile.me, res)
      toast.success(`Switched active presentation to ${res.data.profile.activeMode} mode.`)
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
  const activeMode = profile?.activeMode || VISIBILITY_MODE.PUBLIC

  // Dynamic Available Sections for Mobile & Responsive Menu Bar
  const availableSections = React.useMemo(() => {
    if (!profile) return []
    const list: { id: string; label: string; icon: React.ReactNode; count?: number }[] = [
      { id: 'section-overview', label: 'Overview', icon: <FileText className="h-3.5 w-3.5" /> },
    ]
    if (profile.experience && profile.experience.length > 0) {
      list.push({
        id: 'section-experience',
        label: 'Experience',
        icon: <Briefcase className="h-3.5 w-3.5" />,
        count: profile.experience.length,
      })
    }
    if (profile.education && profile.education.length > 0) {
      list.push({
        id: 'section-education',
        label: 'Education',
        icon: <GraduationCap className="h-3.5 w-3.5" />,
        count: profile.education.length,
      })
    }
    if (profile.projects && profile.projects.length > 0) {
      list.push({
        id: 'section-projects',
        label: 'Projects',
        icon: <Layers className="h-3.5 w-3.5" />,
        count: profile.projects.length,
      })
    }
    if (profile.certifications && profile.certifications.length > 0) {
      list.push({
        id: 'section-certifications',
        label: 'Certifications',
        icon: <Award className="h-3.5 w-3.5" />,
        count: profile.certifications.length,
      })
    }
    if (profile.services && profile.services.length > 0) {
      list.push({
        id: 'section-services',
        label: 'Services',
        icon: <Sparkles className="h-3.5 w-3.5" />,
        count: profile.services.length,
      })
    }
    if (profile.skills && profile.skills.length > 0) {
      list.push({
        id: 'section-skills',
        label: 'Skills',
        icon: <Sparkles className="h-3.5 w-3.5" />,
        count: profile.skills.length,
      })
    }
    if (profile.awards && profile.awards.length > 0) {
      list.push({
        id: 'section-awards',
        label: 'Awards',
        icon: <Award className="h-3.5 w-3.5" />,
        count: profile.awards.length,
      })
    }
    if (profile.publications && profile.publications.length > 0) {
      list.push({
        id: 'section-publications',
        label: 'Publications',
        icon: <FileText className="h-3.5 w-3.5" />,
        count: profile.publications.length,
      })
    }
    if (profile.customSections && profile.customSections.length > 0) {
      list.push({
        id: 'section-custom',
        label: 'Custom',
        icon: <Layers className="h-3.5 w-3.5" />,
        count: profile.customSections.length,
      })
    }
    // Activity & Posts section
    list.push({
      id: 'section-posts',
      label: 'Activity & Posts',
      icon: <Flame className="h-3.5 w-3.5" />,
    })
    return list
  }, [profile])

  const scrollToSection = (id: string) => {
    setActiveSection(id)
    setIsMenuDropdownOpen(false)
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  // IntersectionObserver to auto-update activeSection on scroll
  React.useEffect(() => {
    if (!availableSections.length) return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id)
            break
          }
        }
      },
      { rootMargin: '-80px 0px -60% 0px' }
    )

    availableSections.forEach((sec) => {
      const el = document.getElementById(sec.id)
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [availableSections])

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
    <div className="space-y-8 text-left max-w-5xl mx-auto pb-20 transition-colors duration-300 rounded-3xl">
      {/* Top Banner: Status & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-8 rounded-3xl bg-card border border-border shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              My Profile
            </h1>
            <Badge
              variant={profile.state === 'PUBLISHED' ? 'success' : 'warning'}
              className="text-[11px] font-bold"
            >
              {profile.state}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <span className="text-sm text-muted-foreground">Your profile link:</span>
            {activeUserCard ? (
              <a
                href={`/p/c/${activeUserCard.cardCode?.toLowerCase() || activeUserCard.cardUid?.toLowerCase()}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary font-semibold hover:underline inline-flex items-center gap-1 text-sm font-mono max-w-full overflow-hidden"
              >
                <span className="truncate">
                  onewinq.me/p/c/{activeUserCard.cardCode?.toLowerCase() || activeUserCard.cardUid?.toLowerCase()}
                </span>
                <ExternalLink className="h-3 w-3 shrink-0" />
              </a>
            ) : (
              <span className="text-xs font-mono text-muted-foreground/60 italic">
                — unlocks after card activation
              </span>
            )}
            {activeUserCard ? (
              <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 text-[10px] font-mono flex items-center gap-1">
                <Wifi className="h-2.5 w-2.5" />
                <span>NFC LIVE: {activeUserCard.cardCode}</span>
              </Badge>
            ) : (
              <Badge variant="outline" className="border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10 text-[10px] font-semibold flex items-center gap-1">
                <span>Card Activation Pending</span>
              </Badge>
            )}
          </div>

        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setIsPreviewOpen(true)
              refetchPreview()
            }}
            leftIcon={<Eye className="h-4 w-4" />}
          >
            Preview Live
          </Button>

          {profile.state === 'DRAFT' && (
            <Button
              variant="default"
              size="sm"
              isLoading={publishMutation.isPending}
              onClick={() => publishMutation.mutate()}
              leftIcon={<CheckCircle2 className="h-4 w-4" />}
            >
              Publish Changes
            </Button>
          )}

          <Link to="/app/profile/edit">
            <Button
              variant="subtle"
              size="sm"
              leftIcon={<Edit3 className="h-4 w-4" />}
            >
              Edit Profile
            </Button>
          </Link>
        </div>
      </div>

      {/* Card-Gating Status Banner */}
      {!activeUserCard && (
        <div className="p-4 sm:p-5 rounded-3xl bg-amber-500/10 border border-amber-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-amber-950 dark:text-amber-200 shadow-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-bold text-sm">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              <span>Physical OneWinq Smart Card Required to Go Live</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-xl">
              Your handle is claimed, but your public profile is card-gated — it remains private and inaccessible until your physical OneWinq NFC Card is activated. Once active, your card code becomes your public URL.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link to="/app/cards">
              <Button size="sm" variant="default" className="text-xs h-8">
                Activate Card
              </Button>
            </Link>
            <Link to="/orders">
              <Button size="sm" variant="outline" className="text-xs h-8">
                Order Card
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Mode Switcher Control Bar */}
      <div className="p-4 sm:p-6 rounded-3xl bg-card border border-border shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-foreground">
              Active Presentation Mode
            </h2>
            <p className="text-xs text-muted-foreground">
              Directly controls what public or network visitors see on your live link.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex max-w-full overflow-x-auto no-scrollbar rounded-2xl bg-muted p-1 text-xs font-semibold">
              <button
                onClick={() => setModeMutation.mutate(VISIBILITY_MODE.PUBLIC)}
                disabled={setModeMutation.isPending}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all shrink-0 whitespace-nowrap ${
                  activeMode === VISIBILITY_MODE.PUBLIC
                    ? 'bg-card text-foreground shadow-sm font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Eye className="h-3.5 w-3.5 text-primary" />
                <span>Public</span>
              </button>

              <button
                onClick={() => setModeMutation.mutate(VISIBILITY_MODE.PROFESSIONAL)}
                disabled={setModeMutation.isPending}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all shrink-0 whitespace-nowrap ${
                  activeMode === VISIBILITY_MODE.PROFESSIONAL
                    ? 'bg-card text-primary shadow-sm font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Briefcase className="h-3.5 w-3.5 text-primary" />
                <span>Professional</span>
              </button>

              <button
                onClick={() => setModeMutation.mutate(VISIBILITY_MODE.PRIVATE)}
                disabled={setModeMutation.isPending}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all shrink-0 whitespace-nowrap ${
                  activeMode === VISIBILITY_MODE.PRIVATE
                    ? 'bg-card text-foreground shadow-sm font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Lock className="h-3.5 w-3.5 text-primary" />
                <span>Private</span>
              </button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsTempModalOpen(true)}
              leftIcon={<Clock className="h-3.5 w-3.5" />}
              className="shrink-0"
            >
              Temporary Mode
            </Button>
          </div>
        </div>

        {/* Temporary Mode Alert Card */}
        {profile.temporaryMode && profile.temporaryMode.mode && (
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-primary/10 text-xs text-primary border border-primary/20">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 shrink-0" />
              <span>
                <strong>Temporary {profile.temporaryMode.mode} Mode</strong> active until{' '}
                {new Date(profile.temporaryMode.expiresAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}{' '}
                (reverts automatically to {profile.temporaryMode.fallbackMode}).
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              isLoading={cancelTemporaryModeMutation.isPending}
              onClick={() => cancelTemporaryModeMutation.mutate()}
              className="text-xs text-destructive hover:bg-destructive/10 h-7"
            >
              <XCircle className="h-3.5 w-3.5 mr-1" />
              Cancel Early
            </Button>
          </div>
        )}
      </div>

      {/* Main Profile Canvas Overview */}
      <div className="rounded-3xl border border-border bg-card shadow-sm overflow-hidden">
        {/* Cover Banner */}
        {profile.coverUrl ? (
          <div className="w-full h-44 sm:h-56 bg-muted relative">
            <img
              src={profile.coverUrl}
              alt="Cover Banner"
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-full h-32 bg-gradient-to-r from-primary/10 via-primary/5 to-muted border-b border-border" />
        )}

        <div className="px-6 sm:px-8 pb-6 sm:pb-8 pt-0 space-y-6">
          {/* Avatar and Top Actions Bar */}
          <div className="flex flex-wrap items-end justify-between gap-4 -mt-12 sm:-mt-16">
            <Avatar
              src={profile.avatarUrl}
              fallback={user?.displayName}
              alt={user?.displayName}
              size="2xl"
              className="rounded-3xl ring-4 ring-card shadow-xl bg-card shrink-0"
            />
            <div className="flex items-center gap-2 pt-2">
              {activeUserCard ? (
                <a
                  href={`/p/c/${activeUserCard.cardCode?.toLowerCase() || activeUserCard.cardUid?.toLowerCase()}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="sm" leftIcon={<Eye className="h-3.5 w-3.5" />}>
                    View Live
                  </Button>
                </a>
              ) : (
                <Button variant="outline" size="sm" leftIcon={<Eye className="h-3.5 w-3.5" />} disabled>
                  View Live
                </Button>
              )}
              <Link to="/app/profile/edit">
                <Button variant="default" size="sm" leftIcon={<Edit3 className="h-3.5 w-3.5" />}>
                  Edit Profile
                </Button>
              </Link>
            </div>
          </div>

          {/* Header Info */}
          <div id="section-overview" className="scroll-mt-28 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                {user?.displayName}
              </h2>
              <Badge variant="subtle">@{user?.username}</Badge>
            </div>

            {profile.headline ? (
              <p className="text-base font-semibold text-primary">
                {profile.headline}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                No headline set. Add a headline to describe what you do.
              </p>
            )}

            {/* Professional Identities */}
            {identities && identities.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {identities.map((id: any, idx: number) => (
                  <span
                    key={id._id || id.id || idx}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold ${
                      id.isPrimary
                        ? 'bg-primary text-white shadow-sm ring-1 ring-primary/30'
                        : 'bg-muted text-foreground/80 border border-border/60'
                    }`}
                  >
                    {id.isPrimary ? (
                      <Crown className="h-3 w-3 text-amber-300" />
                    ) : (
                      <Briefcase className="h-3 w-3 text-muted-foreground" />
                    )}
                    <span>{id.customTitle}</span>
                    {id.isPrimary && (
                      <span className="text-[9px] bg-white/20 px-1 py-0.2 rounded font-bold uppercase tracking-wider">
                        Primary
                      </span>
                    )}
                  </span>
                ))}
                <Link
                  to="/app/profile/edit"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium ml-1"
                >
                  Edit
                </Link>
              </div>
            ) : (
              <div className="pt-1">
                <Link
                  to="/app/profile/edit"
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
                >
                  <Briefcase className="h-3 w-3" />
                  <span>Set Up Universal Profile</span>
                </Link>
              </div>
            )}

            {/* Profile Template Presentation Section */}
            <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <LayoutTemplate className="h-4.5 w-4.5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground">
                      Profile Template: {currentTemplate?.name || 'Basic Universal Template'}
                    </span>
                    <Badge variant="subtle" className="text-[10px] text-emerald-600 bg-emerald-500/10 border-emerald-500/20 font-bold">
                      Active
                    </Badge>
                  </div>
                  <span className="text-[11px] text-muted-foreground block line-clamp-1">
                    Universal Smart Profile with fixed essential fields (Bio, Contact Details, and Social Profiles).
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
              <p className="text-sm text-foreground/80 leading-relaxed pt-2">
                {profile.bio}
              </p>
            )}

            {/* Location & Contact Details */}
            {((profile.location && (profile.location.city || profile.location.country)) ||
              (profile.contact && (profile.contact.website || profile.contact.email || profile.contact.phone || profile.contact.address))) && (
              <div className="flex flex-wrap items-center gap-2.5 pt-2 text-xs text-muted-foreground">
                {profile.location && (profile.location.city || profile.location.country) && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted/60 border border-border/60 text-foreground font-medium">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    <span>
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
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 font-medium transition-colors"
                  >
                    <Globe className="h-3.5 w-3.5" />
                    <span>{profile.contact.website.replace(/^https?:\/\//, '')}</span>
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                )}
                {profile.contact?.email && (
                  <a
                    href={`mailto:${profile.contact.email}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted/60 hover:bg-muted border border-border/60 text-foreground font-medium transition-colors"
                  >
                    <Mail className="h-3.5 w-3.5 text-primary" />
                    <span>{profile.contact.email}</span>
                  </a>
                )}
                {profile.contact?.phone && (
                  <a
                    href={`tel:${profile.contact.phone}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted/60 hover:bg-muted border border-border/60 text-foreground font-medium transition-colors"
                  >
                    <Phone className="h-3.5 w-3.5 text-primary" />
                    <span>{profile.contact.phone}</span>
                  </a>
                )}
                {profile.contact?.address && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted/60 border border-border/60 text-foreground font-medium">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{profile.contact.address}</span>
                  </div>
                )}
              </div>
            )}

            {/* Social Links */}
            {profile.socialLinks && profile.socialLinks.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-3">
                {profile.socialLinks.map((s, idx) => (
                  <a
                    key={s.id || idx}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-muted/60 hover:bg-muted text-xs font-medium text-foreground transition-colors border border-border/60"
                  >
                    <Share2 className="h-3 w-3 text-primary" />
                    <span>{s.label || s.platform}</span>
                    <ExternalLink className="h-2.5 w-2.5 text-muted-foreground" />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-border">
            <div className="p-4 rounded-2xl bg-muted/30 text-center">
              <div className="text-2xl font-extrabold text-foreground">
                {profile.experience?.length || 0}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">Experiences</div>
            </div>
            <div className="p-4 rounded-2xl bg-muted/30 text-center">
              <div className="text-2xl font-extrabold text-foreground">
                {profile.projects?.length || 0}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">Projects</div>
            </div>
            <div className="p-4 rounded-2xl bg-muted/30 text-center">
              <div className="text-2xl font-extrabold text-foreground">
                {profile.certifications?.length || 0}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">Certifications</div>
            </div>
            <div className="p-4 rounded-2xl bg-muted/30 text-center">
              <div className="text-2xl font-extrabold text-foreground">
                {profile.skills?.length || 0}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">Skills</div>
            </div>
          </div>

          {/* Sections Menu Bar (Sticky on scroll, optimized for mobile responsiveness) */}
          {availableSections.length > 1 && (
            <div className="sticky top-0 z-20 -mx-3 sm:mx-0 p-2 sm:p-2.5 rounded-none sm:rounded-2xl bg-card/95 backdrop-blur-md border-y sm:border border-border/80 shadow-md my-4">
              <div className="flex items-center justify-between gap-2 min-w-0">
                <div className="flex items-center gap-1.5 shrink-0 px-2 py-1 rounded-lg bg-muted/70 text-foreground font-bold text-xs border border-border/40">
                  <Layers className="h-3.5 w-3.5 text-primary" />
                  <span className="hidden xs:inline">Sections</span>
                  <Badge variant="subtle" className="text-[10px] px-1.5 py-0 h-4 font-mono font-bold">
                    {availableSections.length}
                  </Badge>
                </div>

                {/* Horizontal Scrollable Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth flex-1 py-0.5 min-w-0">
                  {availableSections.map((sec) => {
                    const isActive = activeSection === sec.id
                    return (
                      <button
                        key={sec.id}
                        type="button"
                        onClick={() => scrollToSection(sec.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all active:scale-95 shrink-0 cursor-pointer ${
                          isActive
                            ? 'bg-primary text-white shadow-xs'
                            : 'bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted border border-border/40'
                        }`}
                      >
                        {sec.icon}
                        <span>{sec.label}</span>
                        {sec.count !== undefined && (
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono ${
                              isActive
                                ? 'bg-white/20 text-white font-bold'
                                : 'bg-background text-muted-foreground'
                            }`}
                          >
                            {sec.count}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>

                {/* Quick Dropdown for Mobile Viewports */}
                <div className="relative shrink-0 sm:hidden">
                  <button
                    type="button"
                    onClick={() => setIsMenuDropdownOpen(!isMenuDropdownOpen)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-border bg-muted/60 text-xs font-semibold text-foreground active:scale-95 transition-all"
                  >
                    <span>Jump</span>
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isMenuDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isMenuDropdownOpen && (
                    <div className="absolute right-0 top-full mt-2 w-48 rounded-2xl border border-border bg-card shadow-2xl p-1.5 z-30 space-y-1 animate-in fade-in-50 zoom-in-95">
                      <div className="px-2.5 py-1 text-[11px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border/40 mb-1">
                        Jump to Section
                      </div>
                      {availableSections.map((sec) => (
                        <button
                          key={sec.id}
                          type="button"
                          onClick={() => scrollToSection(sec.id)}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors text-left ${
                            activeSection === sec.id
                              ? 'bg-primary text-white font-bold'
                              : 'text-foreground hover:bg-muted'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            {sec.icon}
                            <span className="truncate">{sec.label}</span>
                          </div>
                          {sec.count !== undefined && (
                            <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono ${
                              activeSection === sec.id ? 'bg-white/20 text-white' : 'text-muted-foreground'
                            }`}>
                              {sec.count}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Detailed Experience & Education */}
          {profile.experience && profile.experience.length > 0 && (
            <div id="section-experience" className="scroll-mt-28 space-y-3 pt-2">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-primary" />
                <span>Experience</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {profile.experience.map((exp: any, idx: number) => {
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
                    <div key={exp.id || idx} className="p-4 rounded-2xl border border-border bg-muted/10 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-bold text-sm text-foreground">{exp.role}</div>
                        {dateStr && (
                          <span className="text-[11px] font-semibold text-muted-foreground bg-muted/70 px-2 py-0.5 rounded-md whitespace-nowrap">
                            {dateStr}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-primary font-medium">
                        {exp.company}
                        {exp.location ? ` • ${exp.location}` : ''}
                      </div>
                      {exp.description && (
                        <p className="text-xs text-muted-foreground pt-1 line-clamp-2">{exp.description}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Education */}
          {profile.education && profile.education.length > 0 && (
            <div id="section-education" className="scroll-mt-28 space-y-3 pt-2">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-primary" />
                <span>Education & Academics</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {profile.education.map((edu: any, idx: number) => {
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
                    <div key={edu.id || idx} className="p-4 rounded-2xl border border-border bg-muted/10 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-bold text-sm text-foreground">{edu.institution}</div>
                        {dateStr && (
                          <span className="text-[11px] font-semibold text-muted-foreground bg-muted/70 px-2 py-0.5 rounded-md whitespace-nowrap">
                            {dateStr}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-primary font-medium">
                        {[edu.degree, edu.fieldOfStudy].filter(Boolean).join(' • ')}
                      </div>
                      {edu.description && (
                        <p className="text-xs text-muted-foreground pt-1 line-clamp-2">{edu.description}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Featured Projects */}
          {profile.projects && profile.projects.length > 0 && (
            <div id="section-projects" className="scroll-mt-28 space-y-3 pt-2">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                <span>Featured Projects</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {profile.projects.map((proj: any, idx: number) => {
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
                    <div key={proj.id || idx} className="p-4 rounded-2xl border border-border bg-muted/10 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-bold text-sm text-foreground">{proj.title}</div>
                        <div className="flex items-center gap-2">
                          {dateStr && (
                            <span className="text-[11px] font-semibold text-muted-foreground bg-muted/70 px-2 py-0.5 rounded-md whitespace-nowrap">
                              {dateStr}
                            </span>
                          )}
                          {proj.url && (
                            <a
                              href={proj.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline text-xs flex items-center gap-1"
                            >
                              <span>Link</span>
                              <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          )}
                        </div>
                      </div>
                      {proj.description && (
                        <p className="text-xs text-muted-foreground pt-1">{proj.description}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Certifications & Services */}
          {(profile.certifications?.length || profile.services?.length) ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
              {profile.certifications && profile.certifications.length > 0 && (
                <div id="section-certifications" className="scroll-mt-28 space-y-2">
                  <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
                    <Award className="h-3.5 w-3.5 text-primary" />
                    <span>Certifications</span>
                  </h4>
                  <div className="space-y-2">
                    {profile.certifications.map((c: any, idx: number) => (
                      <div key={c.id || idx} className="p-3 rounded-xl border border-border bg-muted/10">
                        <div className="flex items-start justify-between gap-2">
                          <div className="text-xs font-bold text-foreground">{c.name}</div>
                          {(c.issueYear || c.issueDate) && (
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
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

              {profile.services && profile.services.length > 0 && (
                <div id="section-services" className="scroll-mt-28 space-y-2">
                  <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    <span>Services</span>
                  </h4>
                  <div className="space-y-2">
                    {profile.services.map((s, idx) => (
                      <div key={s.id || idx} className="p-3 rounded-xl border border-border bg-muted/10">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-foreground">{s.title}</span>
                          {s.priceRange && <span className="text-[10px] font-bold text-primary">{s.priceRange}</span>}
                        </div>
                        {s.description && <p className="text-[11px] text-muted-foreground mt-0.5">{s.description}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {/* Verified Skills */}
          {profile.skills && profile.skills.length > 0 && (
            <div id="section-skills" className="scroll-mt-28 space-y-3 pt-2">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span>Verified Skills</span>
              </h3>
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((skill: any, idx: number) => (
                  <Badge key={skill.id || idx} variant="subtle" className="text-xs font-semibold py-1 px-3">
                    {skill.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Awards & Honors */}
          {profile.awards && profile.awards.length > 0 && (
            <div id="section-awards" className="scroll-mt-28 space-y-3 pt-2">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Award className="h-4 w-4 text-primary" />
                <span>Awards & Honors</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {profile.awards.map((award: any, idx: number) => (
                  <div key={award.id || idx} className="p-4 rounded-2xl border border-border bg-muted/10 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-bold text-sm text-foreground">{award.title}</div>
                      {(award.year || award.date) && (
                        <span className="text-[11px] font-semibold text-muted-foreground bg-muted/70 px-2 py-0.5 rounded-md whitespace-nowrap">
                          {formatMonthYear(award.month, award.year, award.date)}
                        </span>
                      )}
                    </div>
                    {award.issuer && <div className="text-xs text-primary font-medium">{award.issuer}</div>}
                    {award.description && (
                      <p className="text-xs text-muted-foreground pt-1">{award.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Publications */}
          {profile.publications && profile.publications.length > 0 && (
            <div id="section-publications" className="scroll-mt-28 space-y-3 pt-2">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <span>Publications</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {profile.publications.map((pub: any, idx: number) => (
                  <div key={pub.id || idx} className="p-4 rounded-2xl border border-border bg-muted/10 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-bold text-sm text-foreground">{pub.title}</div>
                      {(pub.year || pub.date) && (
                        <span className="text-[11px] font-semibold text-muted-foreground bg-muted/70 px-2 py-0.5 rounded-md whitespace-nowrap">
                          {formatMonthYear(pub.month, pub.year, pub.date)}
                        </span>
                      )}
                    </div>
                    {pub.publisher && <div className="text-xs text-primary font-medium">{pub.publisher}</div>}
                    {pub.url && (
                      <a
                        href={pub.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline pt-1"
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

          {/* Custom Sections */}
          {profile.customSections && profile.customSections.map((sec: any, idx: number) => (
            <div key={sec.id || idx} id="section-custom" className="scroll-mt-28 space-y-3 pt-2">
              <h3 className="text-sm font-bold text-foreground">{sec.title}</h3>
              {sec.description && <p className="text-xs text-muted-foreground">{sec.description}</p>}
              <div className="p-4 rounded-2xl border border-border bg-muted/10 space-y-2">
                {sec.blocks?.map((block: any, bIdx: number) => (
                  <div key={bIdx} className="text-xs text-foreground/80 leading-relaxed whitespace-pre-line">
                    {block.content}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Activity & Posts (My Posts, Saved, Archived) */}
          <ProfilePostsSection />
        </div>
      </div>

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
            <div className="p-4 rounded-2xl border border-border bg-card max-h-96 overflow-y-auto space-y-3">
              <div className="text-xs font-bold text-primary">
                Previewing as: {previewMode}
              </div>
              <div className="text-sm font-semibold text-foreground">
                {previewData?.data?.preview?.profile?.headline || profile.headline || 'No Headline'}
              </div>
              <p className="text-xs text-muted-foreground">
                {previewData?.data?.preview?.profile?.bio || profile.bio || 'No bio'}
              </p>
              <div className="text-xs text-muted-foreground pt-2">
                Visible Sections:{' '}
                <strong>
                  {Object.keys(previewData?.data?.preview?.profile || {}).filter(
                    (k) => Array.isArray((previewData?.data?.preview?.profile as any)[k]) && (previewData?.data?.preview?.profile as any)[k].length > 0
                  ).join(', ') || 'Standard Core'}
                </strong>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={() => setIsPreviewOpen(false)}>Done Previewing</Button>
        </DialogFooter>
      </Dialog>
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
