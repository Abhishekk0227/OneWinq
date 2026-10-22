import * as React from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ShieldCheck,
  Globe,
  Briefcase,
  Lock,
  Clock,
  Check,
  AlertCircle,
  Camera,
  Layers,
  Sparkles,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  User,
  Phone,
  Mail,
  MapPin,
  XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { LoadingScreen } from '@/components/common/LoadingScreen'
import { ErrorState } from '@/components/common/ErrorState'
import { toast } from '@/stores/toastStore'
import { profileApi } from '@/features/profile/api/profile.api'
import { VISIBILITY_MODE, SECTION_VISIBILITY } from '@/constants/app.constants'
import type { VisibilityMode } from '@/constants/app.constants'
import type { MultiModeVisibility, ProfileVisibilitySettings } from '@/types/profile.types'

export function ProfileVisibilityPage() {
  const queryClient = useQueryClient()

  // Fetch Current Profile
  const {
    data: profileData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['my-profile'],
    queryFn: () => profileApi.getMyProfile(),
  })

  const profile = profileData?.data?.profile
  const currentMode = (profile?.activeMode || VISIBILITY_MODE.PUBLIC) as VisibilityMode
  const temporaryMode = profile?.temporaryMode

  // Local state for temporary mode form
  const [tempTargetMode, setTempTargetMode] = React.useState<VisibilityMode>(VISIBILITY_MODE.PROFESSIONAL)
  const [tempDurationHours, setTempDurationHours] = React.useState<number>(4)
  const [tempFallbackMode, setTempFallbackMode] = React.useState<VisibilityMode>(VISIBILITY_MODE.PUBLIC)

  // Local state for visibility rules matrix
  const [avatarVisibility, setAvatarVisibility] = React.useState<MultiModeVisibility>(['PUBLIC', 'PROFESSIONAL', 'PRIVATE'])
  const [sectionVisibility, setSectionVisibility] = React.useState<Record<string, MultiModeVisibility>>({})
  const [fieldVisibility, setFieldVisibility] = React.useState<Record<string, MultiModeVisibility>>({
    'contact.phone': ['PRIVATE'],
    'contact.email': ['PUBLIC', 'PROFESSIONAL', 'PRIVATE'],
    'contact.address': ['PRIVATE'],
    'contact.website': ['PUBLIC', 'PROFESSIONAL', 'PRIVATE'],
  })

  // Sync profile visibility settings when loaded
  React.useEffect(() => {
    if (profile) {
      if (profile.visibility?.avatarVisibility || profile.avatarVisibility) {
        setAvatarVisibility(profile.visibility?.avatarVisibility || profile.avatarVisibility || ['PUBLIC', 'PROFESSIONAL', 'PRIVATE'])
      }
      if (profile.visibility?.sectionVisibility || profile.sectionVisibility) {
        setSectionVisibility(profile.visibility?.sectionVisibility || profile.sectionVisibility || {})
      }
      if (profile.visibility?.fieldVisibility || profile.fieldVisibility) {
        setFieldVisibility({
          'contact.phone': ['PRIVATE'],
          'contact.email': ['PUBLIC', 'PROFESSIONAL', 'PRIVATE'],
          'contact.address': ['PRIVATE'],
          'contact.website': ['PUBLIC', 'PROFESSIONAL', 'PRIVATE'],
          ...(profile.visibility?.fieldVisibility || profile.fieldVisibility || {}),
        })
      }
    }
  }, [profile])

  // Live Timer Countdown for Temporary Mode
  const [timeRemaining, setTimeRemaining] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!temporaryMode?.expiresAt) {
      setTimeRemaining(null)
      return
    }

    const updateCountdown = () => {
      const now = new Date().getTime()
      const expiry = new Date(temporaryMode.expiresAt).getTime()
      const diff = expiry - now

      if (diff <= 0) {
        setTimeRemaining('Expired')
        queryClient.invalidateQueries({ queryKey: ['my-profile'] })
        return
      }

      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`)
    }

    updateCountdown()
    const timer = setInterval(updateCountdown, 1000)
    return () => clearInterval(timer)
  }, [temporaryMode, queryClient])

  // Mutations
  const setActiveModeMutation = useMutation({
    mutationFn: (mode: VisibilityMode) => profileApi.setActiveMode(mode),
    onSuccess: (res, mode) => {
      queryClient.setQueryData(['my-profile'], res)
      queryClient.invalidateQueries({ queryKey: ['my-profile'] })
      toast.success(`Active profile switched to ${mode}`)
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to switch profile mode')
    },
  })

  const setTemporaryModeMutation = useMutation({
    mutationFn: (payload: { mode: VisibilityMode; durationHours: number; fallbackMode: VisibilityMode }) =>
      profileApi.setTemporaryMode(payload),
    onSuccess: (res, payload) => {
      queryClient.setQueryData(['my-profile'], res)
      queryClient.invalidateQueries({ queryKey: ['my-profile'] })
      toast.success(`Temporary ${payload.mode} mode activated for ${payload.durationHours} hours!`)
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to activate temporary mode')
    },
  })

  const cancelTemporaryModeMutation = useMutation({
    mutationFn: () => profileApi.cancelTemporaryMode(),
    onSuccess: (res) => {
      queryClient.setQueryData(['my-profile'], res)
      queryClient.invalidateQueries({ queryKey: ['my-profile'] })
      toast.success('Temporary mode cancelled. Reverted to default profile.')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to cancel temporary mode')
    },
  })

  const saveVisibilityMutation = useMutation({
    mutationFn: (settings: ProfileVisibilitySettings) => profileApi.updateVisibility(settings),
    onSuccess: (res) => {
      queryClient.setQueryData(['my-profile'], res)
      queryClient.invalidateQueries({ queryKey: ['my-profile'] })
      toast.success('Visibility rules saved successfully!')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to save visibility rules')
    },
  })

  // Helper check for mode active in multi-mode value
  const isModeActive = (val: MultiModeVisibility | undefined, mode: 'PUBLIC' | 'PROFESSIONAL' | 'PRIVATE') => {
    if (!val || val === 'ALL') return true
    if (Array.isArray(val)) {
      return val.includes('ALL') || val.includes(mode)
    }
    if (val === SECTION_VISIBILITY.PUBLIC) {
      return true
    }
    return val === mode
  }

  const toggleSectionMode = (key: string, mode: 'PUBLIC' | 'PROFESSIONAL' | 'PRIVATE') => {
    setSectionVisibility((prev) => {
      const current = prev[key]
      let modes: string[] = []
      if (!current || current === 'ALL') {
        modes = ['PUBLIC', 'PROFESSIONAL', 'PRIVATE']
      } else if (Array.isArray(current)) {
        modes = [...current]
      } else if (current === SECTION_VISIBILITY.PUBLIC) {
        modes = ['PUBLIC', 'PROFESSIONAL', 'PRIVATE']
      } else {
        modes = [current]
      }

      if (modes.includes(mode)) {
        modes = modes.filter((m) => m !== mode)
      } else {
        modes.push(mode)
      }

      return {
        ...prev,
        [key]: modes,
      }
    })
  }

  const toggleAvatarMode = (mode: 'PUBLIC' | 'PROFESSIONAL' | 'PRIVATE') => {
    setAvatarVisibility((prev) => {
      let modes: string[] = []
      if (!prev || prev === 'ALL') {
        modes = ['PUBLIC', 'PROFESSIONAL', 'PRIVATE']
      } else if (Array.isArray(prev)) {
        modes = [...prev]
      } else if (prev === SECTION_VISIBILITY.PUBLIC) {
        modes = ['PUBLIC', 'PROFESSIONAL', 'PRIVATE']
      } else {
        modes = [prev as string]
      }

      if (modes.includes(mode)) {
        modes = modes.filter((m) => m !== mode)
      } else {
        modes.push(mode)
      }
      return modes as any
    })
  }

  const toggleFieldMode = (key: string, mode: 'PUBLIC' | 'PROFESSIONAL' | 'PRIVATE') => {
    setFieldVisibility((prev) => {
      const current = prev[key]
      let modes: string[] = []
      if (!current || current === 'ALL') {
        modes = ['PUBLIC', 'PROFESSIONAL', 'PRIVATE']
      } else if (Array.isArray(current)) {
        modes = [...current]
      } else if (current === SECTION_VISIBILITY.PUBLIC) {
        modes = ['PUBLIC', 'PROFESSIONAL', 'PRIVATE']
      } else {
        modes = [current]
      }

      if (modes.includes(mode)) {
        modes = modes.filter((m) => m !== mode)
      } else {
        modes.push(mode)
      }

      return {
        ...prev,
        [key]: modes,
      }
    })
  }

  if (isLoading) {
    return <LoadingScreen message="Loading visibility controls..." />
  }

  if (error || !profile) {
    return (
      <ErrorState
        title="Could not load profile settings"
        message="There was an issue fetching your profile visibility data."
        onRetry={() => refetch()}
      />
    )
  }

  const durationOptions = [
    { label: '1 Hour', hours: 1, desc: 'Quick Meetup' },
    { label: '4 Hours', hours: 4, desc: 'Conference' },
    { label: '8 Hours', hours: 8, desc: 'Full Workday' },
    { label: '24 Hours', hours: 24, desc: 'Day Pass' },
    { label: '7 Days', hours: 168, desc: '1 Week' },
    { label: '30 Days', hours: 720, desc: '1 Month' },
  ]

  const visibilitySections = [
    { key: 'about', label: 'About & Bio', desc: 'Summary and personal introduction' },
    { key: 'experience', label: 'Work Experience', desc: 'Job history, roles, and employment timeline' },
    { key: 'education', label: 'Education & Degrees', desc: 'Universities, institutions, and academic records' },
    { key: 'skills', label: 'Skills & Tech Stack', desc: 'Verified proficiencies and competencies' },
    { key: 'projects', label: 'Projects & Portfolio', desc: 'Case studies, code repositories, and project links' },
    { key: 'media', label: 'Media & Credentials', desc: 'Videos, galleries, and public documents' },
    { key: 'ventures', label: 'Ventures & Organizations', desc: 'Companies founded and organization associations' },
    { key: 'services', label: 'Services & Offerings', desc: 'Professional services, consulting, and pricing' },
    { key: 'certifications', label: 'Licenses & Certifications', desc: 'Certifications and accreditations' },
    { key: 'socialLinks', label: 'Social Profiles', desc: 'LinkedIn, Twitter/X, GitHub, Instagram links' },
    { key: 'contact', label: 'Contact Card (General)', desc: 'General contact buttons and direct actions' },
  ]

  const sensitiveFields = [
    { key: 'contact.phone', label: 'Phone Number', icon: Phone, def: ['PRIVATE'] },
    { key: 'contact.email', label: 'Email Address', icon: Mail, def: ['PUBLIC', 'PROFESSIONAL', 'PRIVATE'] },
    { key: 'contact.website', label: 'Portfolio Website', icon: Globe, def: ['PUBLIC', 'PROFESSIONAL', 'PRIVATE'] },
    { key: 'contact.address', label: 'Physical Address', icon: MapPin, def: ['PRIVATE'] },
  ]

  return (
    <div className="space-y-8 text-left max-w-5xl mx-auto pb-28 pt-2">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider mb-1">
            <ShieldCheck className="h-4 w-4" />
            <span>Profile Visibility & Multi-Mode Studio</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
            Profile Visibility Control
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Choose which profile persona is active, schedule temporary timed presentations for events, and control exactly which details each visitor can see.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Link to="/app/profile">
            <Button variant="outline" size="sm" className="gap-2 text-xs h-9">
              <Eye className="h-4 w-4" />
              <span>View Profile</span>
            </Button>
          </Link>
          <Link to="/app/profile/edit">
            <Button variant="outline" size="sm" className="gap-2 text-xs h-9">
              <span>Edit Details</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* ================= SECTION 1: ACTIVE PRESENTATION MODE ================= */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>Active Presentation Mode</span>
            </h2>
            <p className="text-xs text-muted-foreground">
              Select the default identity mode shown when someone taps your card or visits your URL.
            </p>
          </div>
          <Badge
            variant="outline"
            className="text-xs font-mono px-3 py-1 bg-primary/10 border-primary/20 text-primary"
          >
            Live: {currentMode}
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Public Mode Card */}
          <div
            onClick={() => setActiveModeMutation.mutate(VISIBILITY_MODE.PUBLIC)}
            className={`cursor-pointer rounded-2xl p-5 border transition-all text-left relative overflow-hidden flex flex-col justify-between ${
              currentMode === VISIBILITY_MODE.PUBLIC
                ? 'bg-emerald-500/10 border-emerald-500 shadow-md shadow-emerald-500/10 ring-1 ring-emerald-500'
                : 'bg-card border-border hover:border-emerald-500/40 hover:bg-muted/30'
            }`}
          >
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <Globe className="h-5 w-5" />
                </div>
                {currentMode === VISIBILITY_MODE.PUBLIC && (
                  <Badge className="bg-emerald-600 text-white text-[10px] uppercase font-bold">Active</Badge>
                )}
              </div>
              <h3 className="text-sm font-bold text-foreground">Public Mode</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Open to anyone. Best for public marketing, social media bios, QR codes, and general networking.
              </p>
            </div>
            <div className="pt-4 border-t border-border/40 mt-4 flex items-center justify-between text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <span>{currentMode === VISIBILITY_MODE.PUBLIC ? 'Currently Active' : 'Switch to Public'}</span>
              <Check className={`h-4 w-4 ${currentMode === VISIBILITY_MODE.PUBLIC ? 'opacity-100' : 'opacity-0'}`} />
            </div>
          </div>

          {/* Professional Mode Card */}
          <div
            onClick={() => setActiveModeMutation.mutate(VISIBILITY_MODE.PROFESSIONAL)}
            className={`cursor-pointer rounded-2xl p-5 border transition-all text-left relative overflow-hidden flex flex-col justify-between ${
              currentMode === VISIBILITY_MODE.PROFESSIONAL
                ? 'bg-blue-500/10 border-blue-500 shadow-md shadow-blue-500/10 ring-1 ring-blue-500'
                : 'bg-card border-border hover:border-blue-500/40 hover:bg-muted/30'
            }`}
          >
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <Briefcase className="h-5 w-5" />
                </div>
                {currentMode === VISIBILITY_MODE.PROFESSIONAL && (
                  <Badge className="bg-blue-600 text-white text-[10px] uppercase font-bold">Active</Badge>
                )}
              </div>
              <h3 className="text-sm font-bold text-foreground">Professional Mode</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Curated career & portfolio view. Shows verified credentials, work history, and ventures while hiding personal contact.
              </p>
            </div>
            <div className="pt-4 border-t border-border/40 mt-4 flex items-center justify-between text-xs font-semibold text-blue-600 dark:text-blue-400">
              <span>{currentMode === VISIBILITY_MODE.PROFESSIONAL ? 'Currently Active' : 'Switch to Professional'}</span>
              <Check className={`h-4 w-4 ${currentMode === VISIBILITY_MODE.PROFESSIONAL ? 'opacity-100' : 'opacity-0'}`} />
            </div>
          </div>

          {/* Private Mode Card */}
          <div
            onClick={() => setActiveModeMutation.mutate(VISIBILITY_MODE.PRIVATE)}
            className={`cursor-pointer rounded-2xl p-5 border transition-all text-left relative overflow-hidden flex flex-col justify-between ${
              currentMode === VISIBILITY_MODE.PRIVATE
                ? 'bg-purple-500/10 border-purple-500 shadow-md shadow-purple-500/10 ring-1 ring-purple-500'
                : 'bg-card border-border hover:border-purple-500/40 hover:bg-muted/30'
            }`}
          >
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
                  <Lock className="h-5 w-5" />
                </div>
                {currentMode === VISIBILITY_MODE.PRIVATE && (
                  <Badge className="bg-purple-600 text-white text-[10px] uppercase font-bold">Active</Badge>
                )}
              </div>
              <h3 className="text-sm font-bold text-foreground">Private Mode</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Confidential mode. Only exposes allowed vault documents and restricted contact to verified close connections.
              </p>
            </div>
            <div className="pt-4 border-t border-border/40 mt-4 flex items-center justify-between text-xs font-semibold text-purple-600 dark:text-purple-400">
              <span>{currentMode === VISIBILITY_MODE.PRIVATE ? 'Currently Active' : 'Switch to Private'}</span>
              <Check className={`h-4 w-4 ${currentMode === VISIBILITY_MODE.PRIVATE ? 'opacity-100' : 'opacity-0'}`} />
            </div>
          </div>
        </div>
      </div>

      {/* ================= SECTION 2: TIMED TEMPORARY MODE ================= */}
      <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <span>Timed Temporary Profile Mode</span>
                {temporaryMode?.expiresAt && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 animate-pulse">
                    ACTIVE NOW
                  </span>
                )}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Set a specific profile mode to automatically stay active for a fixed duration, then revert back to your fallback mode.
              </p>
            </div>
          </div>

          {temporaryMode?.expiresAt && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => cancelTemporaryModeMutation.mutate()}
              isLoading={cancelTemporaryModeMutation.isPending}
              className="gap-2 text-xs h-9 shrink-0"
            >
              <XCircle className="h-4 w-4" />
              <span>Cancel Temporary Mode</span>
            </Button>
          )}
        </div>

        {/* If Active: Live Countdown Banner */}
        {temporaryMode?.expiresAt ? (
          <div className="p-5 rounded-2xl border border-amber-500/30 bg-amber-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs text-amber-950 dark:text-amber-200 font-semibold flex items-center gap-2">
                <span>Currently Broadcasting as:</span>
                <Badge className="bg-amber-500 text-black font-mono font-bold text-xs">{temporaryMode.mode}</Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                Reverts to <strong>{temporaryMode.fallbackMode}</strong> after timer completes.
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Remaining Time</div>
                <div className="text-lg font-mono font-black text-amber-600 dark:text-amber-400">
                  {timeRemaining || 'Calculating...'}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Configure Temporary Mode Form */
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Target Mode */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Target Mode to Broadcast</label>
                <select
                  value={tempTargetMode}
                  onChange={(e) => setTempTargetMode(e.target.value as VisibilityMode)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value={VISIBILITY_MODE.PUBLIC}>PUBLIC Mode</option>
                  <option value={VISIBILITY_MODE.PROFESSIONAL}>PROFESSIONAL Mode</option>
                  <option value={VISIBILITY_MODE.PRIVATE}>PRIVATE Mode</option>
                </select>
                <p className="text-[11px] text-muted-foreground">The mode visitors will see during the timer.</p>
              </div>

              {/* Duration Options */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Duration (Hours)</label>
                <div className="flex items-center gap-2">
                  <select
                    value={tempDurationHours}
                    onChange={(e) => setTempDurationHours(Number(e.target.value))}
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {durationOptions.map((opt) => (
                      <option key={opt.hours} value={opt.hours}>
                        {opt.label} ({opt.desc})
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-[11px] text-muted-foreground">Auto-expires after this duration.</p>
              </div>

              {/* Fallback Mode */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Fallback Mode (After Expiry)</label>
                <select
                  value={tempFallbackMode}
                  onChange={(e) => setTempFallbackMode(e.target.value as VisibilityMode)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value={VISIBILITY_MODE.PUBLIC}>PUBLIC Mode</option>
                  <option value={VISIBILITY_MODE.PROFESSIONAL}>PROFESSIONAL Mode</option>
                  <option value={VISIBILITY_MODE.PRIVATE}>PRIVATE Mode</option>
                </select>
                <p className="text-[11px] text-muted-foreground">Reverts here when the timer runs out.</p>
              </div>
            </div>

            <div className="flex items-center justify-end pt-2">
              <Button
                onClick={() =>
                  setTemporaryModeMutation.mutate({
                    mode: tempTargetMode,
                    durationHours: tempDurationHours,
                    fallbackMode: tempFallbackMode,
                  })
                }
                isLoading={setTemporaryModeMutation.isPending}
                className="gap-2 text-xs font-bold"
              >
                <Clock className="h-4 w-4" />
                <span>Activate {tempDurationHours}h Temporary Mode</span>
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ================= SECTION 3: MULTI-PROFILE VISIBILITY CONTROL MATRIX ================= */}
      <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
          <div>
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              <span>Multi-Profile Visibility Rules Matrix</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Specify precisely which modes (Public, Professional, Private) can see each section and sensitive detail.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const allKeys = [
                  'about',
                  'experience',
                  'education',
                  'skills',
                  'projects',
                  'media',
                  'ventures',
                  'services',
                  'certifications',
                  'socialLinks',
                  'contact',
                ]
                const updated: Record<string, MultiModeVisibility> = {}
                allKeys.forEach((k) => {
                  updated[k] = ['PUBLIC', 'PROFESSIONAL', 'PRIVATE']
                })
                setSectionVisibility(updated)
                setAvatarVisibility(['PUBLIC', 'PROFESSIONAL', 'PRIVATE'])
                toast.success('Enabled all sections across Public, Professional, and Private!')
              }}
              className="text-xs h-8"
            >
              Show Everything Everywhere
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {/* Avatar Visibility Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border border-border bg-muted/20 gap-3 text-xs">
            <div>
              <div className="font-bold text-foreground flex items-center gap-1.5">
                <Camera className="h-3.5 w-3.5 text-primary" />
                <span>Avatar Photo Visibility</span>
              </div>
              <div className="text-muted-foreground text-[11px]">Select which profile modes show your photo</div>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => toggleAvatarMode('PUBLIC')}
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                  isModeActive(avatarVisibility, 'PUBLIC')
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 font-bold'
                    : 'bg-background/80 border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                {isModeActive(avatarVisibility, 'PUBLIC') && <Check className="h-3.5 w-3.5" />}
                <span>Public</span>
              </button>
              <button
                type="button"
                onClick={() => toggleAvatarMode('PROFESSIONAL')}
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                  isModeActive(avatarVisibility, 'PROFESSIONAL')
                    ? 'bg-blue-500/15 border-blue-500/40 text-blue-600 dark:text-blue-400 font-bold'
                    : 'bg-background/80 border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                {isModeActive(avatarVisibility, 'PROFESSIONAL') && <Check className="h-3.5 w-3.5" />}
                <span>Professional</span>
              </button>
              <button
                type="button"
                onClick={() => toggleAvatarMode('PRIVATE')}
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                  isModeActive(avatarVisibility, 'PRIVATE')
                    ? 'bg-purple-500/15 border-purple-500/40 text-purple-600 dark:text-purple-400 font-bold'
                    : 'bg-background/80 border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                {isModeActive(avatarVisibility, 'PRIVATE') && <Check className="h-3.5 w-3.5" />}
                <span>Private</span>
              </button>
            </div>
          </div>

          {/* Sections Multi-Mode Visibility Rows */}
          {visibilitySections.map((item) => {
            const isPub = isModeActive(sectionVisibility[item.key], 'PUBLIC')
            const isProf = isModeActive(sectionVisibility[item.key], 'PROFESSIONAL')
            const isPriv = isModeActive(sectionVisibility[item.key], 'PRIVATE')

            return (
              <div
                key={item.key}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-2xl border border-border bg-muted/20 gap-3 text-xs"
              >
                <div>
                  <div className="font-bold text-foreground">{item.label}</div>
                  <div className="text-muted-foreground text-[11px]">{item.desc}</div>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => toggleSectionMode(item.key, 'PUBLIC')}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                      isPub
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 font-bold'
                        : 'bg-background/80 border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {isPub && <Check className="h-3.5 w-3.5" />}
                    <span>Public</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleSectionMode(item.key, 'PROFESSIONAL')}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                      isProf
                        ? 'bg-blue-500/15 border-blue-500/40 text-blue-600 dark:text-blue-400 font-bold'
                        : 'bg-background/80 border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {isProf && <Check className="h-3.5 w-3.5" />}
                    <span>Professional</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleSectionMode(item.key, 'PRIVATE')}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                      isPriv
                        ? 'bg-purple-500/15 border-purple-500/40 text-purple-600 dark:text-purple-400 font-bold'
                        : 'bg-background/80 border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {isPriv && <Check className="h-3.5 w-3.5" />}
                    <span>Private</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setSectionVisibility((prev) => ({
                        ...prev,
                        [item.key]: ['PUBLIC', 'PROFESSIONAL', 'PRIVATE'],
                      }))
                    }
                    className="px-2 py-1 rounded-lg text-[11px] font-medium text-muted-foreground hover:text-primary transition-colors underline"
                  >
                    All Modes
                  </button>
                </div>
              </div>
            )
          })}

          {/* Sensitive Contact Fields */}
          <div className="pt-4 border-t border-border space-y-3">
            <div className="font-bold text-xs text-foreground uppercase tracking-wider text-muted-foreground">
              Sensitive Direct Contact Fields
            </div>
            {sensitiveFields.map((item) => {
              const val = fieldVisibility[item.key] ?? item.def
              const isPub = isModeActive(val, 'PUBLIC')
              const isProf = isModeActive(val, 'PROFESSIONAL')
              const isPriv = isModeActive(val, 'PRIVATE')
              const Icon = item.icon

              return (
                <div
                  key={item.key}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-2xl border border-border bg-muted/20 gap-3 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    <div>
                      <div className="font-bold text-foreground">{item.label}</div>
                      <div className="text-muted-foreground text-[11px]">Select profiles where this contact info appears</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => toggleFieldMode(item.key, 'PUBLIC')}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                        isPub
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 font-bold'
                          : 'bg-background/80 border-border text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {isPub && <Check className="h-3.5 w-3.5" />}
                      <span>Public</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleFieldMode(item.key, 'PROFESSIONAL')}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                        isProf
                          ? 'bg-blue-500/15 border-blue-500/40 text-blue-600 dark:text-blue-400 font-bold'
                          : 'bg-background/80 border-border text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {isProf && <Check className="h-3.5 w-3.5" />}
                      <span>Professional</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleFieldMode(item.key, 'PRIVATE')}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                        isPriv
                          ? 'bg-purple-500/15 border-purple-500/40 text-purple-600 dark:text-purple-400 font-bold'
                          : 'bg-background/80 border-border text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {isPriv && <Check className="h-3.5 w-3.5" />}
                      <span>Private</span>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Save Rules Button */}
        <div className="pt-4 border-t border-border flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Changes to visibility rules take effect instantly across all card scans and web views.</p>
          <Button
            onClick={() =>
              saveVisibilityMutation.mutate({
                avatarVisibility,
                sectionVisibility,
                fieldVisibility,
              })
            }
            isLoading={saveVisibilityMutation.isPending}
            className="gap-2 text-xs font-bold"
          >
            <ShieldCheck className="h-4 w-4" />
            <span>Save Visibility Rules</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
