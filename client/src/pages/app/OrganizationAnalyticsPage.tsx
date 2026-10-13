import * as React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart3,
  Eye,
  UserCheck,
  UserX,
  QrCode,
  Wifi,
  MousePointerClick,
  Smartphone,
  Monitor,
  Tablet,
  Activity,
  Layers,
  Building2,
  Users,
  Briefcase,
  FileCheck,
  Plus,
  ArrowRight,
  TrendingUp,
  FileText,
  Heart,
  MessageSquare,
  Share2,
  CheckCircle2,
} from 'lucide-react'
import { useOrganizationContextStore } from '@/stores/organizationContextStore'
import { analyticsApi } from '@/features/analytics/api/analytics.api'
import { organizationsApi } from '@/features/organizations/api/organizations.api'
import { jobsApi } from '@/features/jobs/api/jobs.api'
import { postsApi } from '@/features/posts/api/posts.api'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { LoadingScreen } from '@/components/common/LoadingScreen'
import { EmptyState } from '@/components/common/EmptyState'

export default function OrganizationAnalyticsPage() {
  const navigate = useNavigate()
  const { activeContext } = useOrganizationContextStore()
  const isOrgMode = activeContext.type === 'ORGANIZATION'
  const orgId = isOrgMode ? activeContext.organizationId : ''

  const [timeRange, setTimeRange] = React.useState<'7d' | '30d' | '90d'>('30d')

  // Organization-scoped telemetry & impressions query strictly for this organization
  const { data: orgAnalyticsData, isLoading: isAnalyticsLoading } = useQuery({
    queryKey: ['analytics', 'organization', orgId, timeRange],
    queryFn: () => analyticsApi.getOrganizationAnalytics(orgId, timeRange),
    enabled: Boolean(isOrgMode && orgId),
  })

  // Organization operational metrics queries
  const { data: jobsData } = useQuery({
    queryKey: ['org', orgId, 'jobs'],
    queryFn: () => jobsApi.listOrgJobs(orgId, { limit: 5 }),
    enabled: Boolean(orgId),
  })
  const jobs = (jobsData as any)?.data?.jobs || []
  const jobsCount = (jobsData as any)?.data?.pagination?.total ?? 0

  const { data: membersData } = useQuery({
    queryKey: ['org', orgId, 'members'],
    queryFn: () => organizationsApi.listMembers(orgId, { limit: 5 }),
    enabled: Boolean(orgId),
  })
  const membersCount = (membersData as any)?.data?.pagination?.total ?? 1

  const { data: appsData } = useQuery({
    queryKey: ['org', orgId, 'applications'],
    queryFn: () => jobsApi.listApplications(orgId, { limit: 5 }),
    enabled: Boolean(orgId),
  })
  const applications = (appsData as any)?.data?.applications || []
  const applicationsCount = (appsData as any)?.data?.pagination?.total ?? 0

  const { data: postsData } = useQuery({
    queryKey: ['org', orgId, 'posts'],
    queryFn: () => postsApi.getFeed({ organizationId: orgId }),
    enabled: Boolean(orgId),
  })
  const orgPosts = (postsData as any)?.data?.posts || []

  // Aggregate organization posts engagement stats
  const postStats = React.useMemo(() => {
    const totalPosts = orgPosts.length
    const totalLikes = orgPosts.reduce((sum: number, p: any) => sum + (p.likesCount || 0), 0)
    const totalComments = orgPosts.reduce((sum: number, p: any) => sum + (p.commentsCount || 0), 0)
    const totalShares = orgPosts.reduce((sum: number, p: any) => sum + (p.sharesCount || 0), 0)
    return { totalPosts, totalLikes, totalComments, totalShares }
  }, [orgPosts])

  const orgAnalytics = orgAnalyticsData?.data
  const overview = orgAnalytics?.overview || {
    totalProfileViews: 0,
    uniqueViewers: 0,
    identifiableViews: 0,
    anonymousViews: 0,
    qrScans: 0,
    nfcTaps: 0,
    linkClicks: 0,
  }

  const timeSeries = orgAnalytics?.timeSeries || []
  const topLinks = orgAnalytics?.topLinks || []
  const deviceBreakdown = orgAnalytics?.deviceBreakdown || { mobile: 0, desktop: 0, tablet: 0 }

  const totalDeviceVisits =
    (deviceBreakdown.mobile || 0) + (deviceBreakdown.desktop || 0) + (deviceBreakdown.tablet || 0)

  const mobilePercent = totalDeviceVisits > 0 ? Math.round(((deviceBreakdown.mobile || 0) / totalDeviceVisits) * 100) : 0
  const desktopPercent = totalDeviceVisits > 0 ? Math.round(((deviceBreakdown.desktop || 0) / totalDeviceVisits) * 100) : 0
  const tabletPercent = totalDeviceVisits > 0 ? Math.max(0, 100 - mobilePercent - desktopPercent) : 0

  const totalKnownViews = overview.totalProfileViews || 0
  const identifiablePercent = totalKnownViews > 0 ? Math.round(((overview.identifiableViews || 0) / totalKnownViews) * 100) : 0
  const anonymousPercent = totalKnownViews > 0 ? Math.max(0, 100 - identifiablePercent) : 0

  const maxViewsInSeries = Math.max(...timeSeries.map((d: any) => d.views || 0), 1)

  if (!isOrgMode) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center">
        <EmptyState
          icon={<Building2 className="h-8 w-8 text-primary" />}
          title="Organization Workspace Required"
          description="Please select an organization from the workspace selector to view organization analytics."
          actionLabel="Go to Organizations"
          onAction={() => navigate('/app/organizations/create')}
        />
      </div>
    )
  }

  if (isAnalyticsLoading) {
    return <LoadingScreen message={`Loading ${activeContext.name}'s analytics telemetry...`} />
  }

  return (
    <div className="space-y-6 text-left max-w-6xl mx-auto pb-24 px-2 sm:px-4">
      {/* Analytics Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-0.5">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Analytics
          </h1>
          <p className="text-xs text-muted-foreground">
            Profile views, NFC taps, QR scans, and audience engagement telemetry.
          </p>
        </div>

        <div className="inline-flex rounded-xl bg-muted p-1 text-xs font-semibold w-fit self-start sm:self-auto">
          {(['7d', '30d', '90d'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 rounded-lg transition-all text-xs cursor-pointer ${
                timeRange === range
                  ? 'bg-card text-foreground shadow-xs font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {range === '7d' ? 'Last 7 Days' : range === '30d' ? 'Last 30 Days' : 'Last 90 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* Top 4 Telemetry KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-5 sm:p-6 rounded-3xl border border-border bg-card shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Total Views</span>
            <Eye className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            {overview.totalProfileViews}
          </div>
          <div className="text-[11px] text-muted-foreground flex items-center gap-1">
            <UserCheck className="h-3 w-3 text-emerald-500" />
            <span>{overview.uniqueViewers} unique visitors</span>
          </div>
        </div>

        <div className="p-5 sm:p-6 rounded-3xl border border-border bg-card shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">NFC Card Taps</span>
            <Wifi className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            {overview.nfcTaps}
          </div>
          <div className="text-[11px] text-muted-foreground">
            Physical hardware touchpoints
          </div>
        </div>

        <div className="p-5 sm:p-6 rounded-3xl border border-border bg-card shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">QR Code Scans</span>
            <QrCode className="h-4 w-4 text-violet-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            {overview.qrScans}
          </div>
          <div className="text-[11px] text-muted-foreground">
            Mobile camera scans
          </div>
        </div>

        <div className="p-5 sm:p-6 rounded-3xl border border-border bg-card shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Link Clicks</span>
            <MousePointerClick className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            {overview.linkClicks}
          </div>
          <div className="text-[11px] text-muted-foreground">
            Outbound portfolio interactions
          </div>
        </div>
      </div>

      {/* Dynamic Impressions & Activity Timeline Chart */}
      <div className="p-6 sm:p-8 rounded-3xl border border-border bg-card shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <span>Activity & Impressions Timeline</span>
            </h2>
            <p className="text-xs text-muted-foreground">
              Daily profile impressions and engagement over the {timeRange === '7d' ? 'last 7 days' : timeRange === '30d' ? 'last 30 days' : 'last 90 days'}.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-primary inline-block" />
              <span className="text-muted-foreground">Profile Views</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block" />
              <span className="text-muted-foreground">NFC Taps</span>
            </div>
          </div>
        </div>

        {timeSeries.length === 0 ? (
          <div className="py-12 text-center text-xs text-muted-foreground">
            No activity points recorded in this period yet. Share your organization public page or tap team NFC cards to generate traffic!
          </div>
        ) : (
          <div className="pt-4">
            <div className="flex items-end gap-1 sm:gap-2 h-40 w-full overflow-x-auto pb-2 custom-scrollbar">
              {timeSeries.map((pt: any, idx: number) => {
                const views = pt.views || 0
                const taps = pt.nfcTaps || 0
                const heightPercent = Math.max(8, Math.round((views / maxViewsInSeries) * 100))
                const dateObj = new Date(pt.date)
                const isWeekend = dateObj.getUTCDay() === 0 || dateObj.getUTCDay() === 6

                return (
                  <div key={idx} className="flex-1 min-w-[12px] flex flex-col items-center gap-1.5 group relative">
                    {/* Tooltip */}
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-20 pointer-events-none">
                      <div className="bg-popover text-popover-foreground text-[10px] font-semibold py-1 px-2 rounded-lg border border-border shadow-md whitespace-nowrap">
                        {views} views, {taps} taps on {pt.date}
                      </div>
                    </div>

                    {/* Bar */}
                    <div className="w-full flex flex-col justify-end h-32 rounded-lg bg-muted/30 p-0.5 overflow-hidden">
                      <div
                        className={`w-full rounded-md transition-all duration-300 ${
                          views > 0
                            ? 'bg-gradient-to-t from-primary to-primary-400 group-hover:brightness-110'
                            : 'bg-transparent'
                        }`}
                        style={{ height: `${views > 0 ? heightPercent : 4}%` }}
                      />
                    </div>

                    {/* Date label */}
                    {(timeRange === '7d' || idx % (timeRange === '30d' ? 4 : 10) === 0) && (
                      <span className={`text-[9px] font-mono shrink-0 ${isWeekend ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}>
                        {dateObj.toLocaleDateString([], { month: 'numeric', day: 'numeric' })}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Organization Operations & Team Metrics (All Details from Overview) */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-foreground">
          Workspace Operations & Post Engagement
        </h2>

        {/* 3 Operations Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="hover:border-primary/40 transition-colors">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Team Members
                </p>
                <h3 className="text-2xl font-black mt-1">{membersCount}</h3>
                <Link
                  to="/app/org/members"
                  className="text-xs text-primary font-medium flex items-center gap-1 mt-2 hover:underline"
                >
                  Manage team <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="h-12 w-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                <Users className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="hover:border-primary/40 transition-colors">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Active Job Postings
                </p>
                <h3 className="text-2xl font-black mt-1">{jobsCount}</h3>
                <Link
                  to="/app/org/jobs"
                  className="text-xs text-primary font-medium flex items-center gap-1 mt-2 hover:underline"
                >
                  View postings <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="h-12 w-12 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
                <Briefcase className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="hover:border-primary/40 transition-colors">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Candidates & Applications
                </p>
                <h3 className="text-2xl font-black mt-1">{applicationsCount}</h3>
                <Link
                  to="/app/org/applications"
                  className="text-xs text-primary font-medium flex items-center gap-1 mt-2 hover:underline"
                >
                  Review applicants <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="h-12 w-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <FileCheck className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 4 Post Engagement Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="rounded-2xl border border-border bg-card p-3.5 sm:p-4 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
              <span>Published Posts</span>
              <FileText className="h-4 w-4 text-primary shrink-0" />
            </div>
            <div className="text-2xl font-extrabold text-foreground tracking-tight">
              {postStats.totalPosts}
            </div>
            <div className="text-[11px] text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
              <span>Active on organization feed</span>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-3.5 sm:p-4 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
              <span>Total Reactions</span>
              <Heart className="h-4 w-4 text-rose-500 shrink-0" />
            </div>
            <div className="text-2xl font-extrabold text-foreground tracking-tight">
              {postStats.totalLikes}
            </div>
            <div className="text-[11px] text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-primary" />
              <span>Audience engagement</span>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-3.5 sm:p-4 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
              <span>Total Comments</span>
              <MessageSquare className="h-4 w-4 text-blue-500 shrink-0" />
            </div>
            <div className="text-2xl font-extrabold text-foreground tracking-tight">
              {postStats.totalComments}
            </div>
            <div className="text-[11px] text-muted-foreground">Community discussions</div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-3.5 sm:p-4 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
              <span>Total Shares</span>
              <Share2 className="h-4 w-4 text-amber-500 shrink-0" />
            </div>
            <div className="text-2xl font-extrabold text-foreground tracking-tight">
              {postStats.totalShares}
            </div>
            <div className="text-[11px] text-muted-foreground">Network reach</div>
          </div>
        </div>
      </div>

      {/* Viewer Composition & Device Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8">
        {/* Audience Composition Card */}
        <div className="md:col-span-6 p-6 sm:p-8 rounded-3xl border border-border bg-card shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground">
              Viewer Breakdown
            </h2>
            <Badge variant="subtle" className="text-[10px] font-bold">
              AUDIENCE
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Privacy-preserving aggregate telemetry of organization page visitors.
          </p>

          <div className="space-y-4 pt-2">
            <div className="p-4 rounded-2xl bg-muted/30 border border-border space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <UserCheck className="h-5 w-5 text-emerald-500" />
                  <div>
                    <div className="text-sm font-bold text-foreground">Identifiable Network Peers</div>
                    <div className="text-xs text-muted-foreground">Logged-in OneWinq members</div>
                  </div>
                </div>
                <div className="text-lg font-bold text-foreground">
                  {overview.identifiableViews}
                </div>
              </div>
              <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${identifiablePercent}%` }} />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-muted/30 border border-border space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <UserX className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-bold text-foreground">Anonymous Public Visitors</div>
                    <div className="text-xs text-muted-foreground">External and unauthenticated traffic</div>
                  </div>
                </div>
                <div className="text-lg font-bold text-foreground">
                  {overview.anonymousViews}
                </div>
              </div>
              <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-primary/60 rounded-full" style={{ width: `${anonymousPercent}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Device Distribution Card */}
        <div className="md:col-span-6 p-6 sm:p-8 rounded-3xl border border-border bg-card shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground">
              Device Breakdown
            </h2>
            <Badge variant="subtle" className="text-[10px] font-bold">
              PLATFORMS
            </Badge>
          </div>

          <p className="text-xs text-muted-foreground">
            Breakdown of devices used by visitors exploring your organization.
          </p>

          <div className="space-y-3 pt-2">
            <div className="p-3.5 rounded-2xl bg-muted/30 border border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Smartphone className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold text-foreground">Mobile Phones</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-foreground">{deviceBreakdown.mobile || 0}</span>
                <span className="text-[11px] text-muted-foreground font-mono">({mobilePercent}%)</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-muted/30 border border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Monitor className="h-4 w-4 text-violet-500" />
                <span className="text-xs font-semibold text-foreground">Desktop Computers</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-foreground">{deviceBreakdown.desktop || 0}</span>
                <span className="text-[11px] text-muted-foreground font-mono">({desktopPercent}%)</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-muted/30 border border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Tablet className="h-4 w-4 text-amber-500" />
                <span className="text-xs font-semibold text-foreground">Tablets & Others</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-foreground">{deviceBreakdown.tablet || 0}</span>
                <span className="text-[11px] text-muted-foreground font-mono">({tabletPercent}%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Top Outbound Links & Destinations */}
        <div className="md:col-span-12 p-6 sm:p-8 rounded-3xl border border-border bg-card shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                <span>Top Interacted Links & Offerings</span>
              </h2>
              <p className="text-xs text-muted-foreground">
                Which organization links, career listings, and website destinations visitors clicked most.
              </p>
            </div>
            <Badge variant="subtle" className="text-[10px] font-bold">
              CLICKS & REACH
            </Badge>
          </div>

          <div className="space-y-2 pt-2">
            {topLinks && topLinks.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {topLinks.map((link: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-muted/30 border border-border text-xs hover:border-primary/40 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary shrink-0">
                        #{idx + 1}
                      </span>
                      <div className="min-w-0">
                        <span className="font-semibold text-foreground truncate block">
                          {link.label || link.url}
                        </span>
                        {link.url && (
                          <span className="text-[10px] text-muted-foreground truncate block font-mono">
                            {link.url}
                          </span>
                        )}
                      </div>
                    </div>

                    <Badge variant="outline" className="font-mono text-xs shrink-0 font-bold">
                      {link.count} {link.count === 1 ? 'click' : 'clicks'}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center rounded-2xl border border-dashed border-border bg-muted/10 text-xs text-muted-foreground space-y-1">
                <p className="font-semibold text-foreground">No outbound link clicks recorded yet for this period</p>
                <p>When visitors click your organization links, jobs, or social links, they will be ranked and analyzed here.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
