import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { analyticsApi } from '@/features/analytics/api/analytics.api'
import { queryKeys } from '@/lib/query/queryKeys'
import { Badge } from '@/components/ui/Badge'
import { LoadingScreen } from '@/components/common/LoadingScreen'
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
} from 'lucide-react'

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d')

  const { data: overviewData, isLoading: isOverviewLoading } = useQuery({
    queryKey: ['analytics', 'overview', timeRange],
    queryFn: () => analyticsApi.getOverview(timeRange),
  })

  const { data: profileAnalyticsData, isLoading: isProfileLoading } = useQuery({
    queryKey: queryKeys.analytics.profile(timeRange),
    queryFn: () => analyticsApi.getProfileAnalytics(timeRange),
  })

  const overview = overviewData?.data?.overview || {
    totalProfileViews: 0,
    uniqueViewers: 0,
    identifiableViews: 0,
    anonymousViews: 0,
    qrScans: 0,
    nfcTaps: 0,
    linkClicks: 0,
  }

  const profileAnalytics = profileAnalyticsData?.data?.analytics || (profileAnalyticsData?.data as any)
  const timeSeries = profileAnalytics?.timeSeries || (profileAnalytics as any)?.timeline || []
  const topLinks = profileAnalytics?.topLinks || []
  const deviceBreakdown = profileAnalytics?.deviceBreakdown || { mobile: 0, desktop: 0, tablet: 0 }

  const totalDeviceVisits =
    (deviceBreakdown.mobile || 0) + (deviceBreakdown.desktop || 0) + (deviceBreakdown.tablet || 0)

  const mobilePercent = totalDeviceVisits > 0 ? Math.round(((deviceBreakdown.mobile || 0) / totalDeviceVisits) * 100) : 0
  const desktopPercent = totalDeviceVisits > 0 ? Math.round(((deviceBreakdown.desktop || 0) / totalDeviceVisits) * 100) : 0
  const tabletPercent = totalDeviceVisits > 0 ? Math.max(0, 100 - mobilePercent - desktopPercent) : 0

  const totalKnownViews = overview.totalProfileViews || 0
  const identifiablePercent = totalKnownViews > 0 ? Math.round(((overview.identifiableViews || 0) / totalKnownViews) * 100) : 0
  const anonymousPercent = totalKnownViews > 0 ? Math.max(0, 100 - identifiablePercent) : 0

  const maxViewsInSeries = Math.max(...timeSeries.map((d: any) => d.views || 0), 1)

  if (isOverviewLoading || isProfileLoading) {
    return <LoadingScreen message="Loading identity telemetry..." />
  }

  return (
    <div className="space-y-6 text-left max-w-6xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-0.5">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Analytics
          </h1>
          <p className="text-xs text-muted-foreground">
            Profile views, NFC taps, QR scans, and audience engagement telemetry.
          </p>
        </div>

        <div className="inline-flex rounded-xl bg-muted p-1 text-xs font-semibold">
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

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-6 rounded-3xl border border-border bg-card shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Total Views</span>
            <Eye className="h-4 w-4 text-primary" />
          </div>
          <div className="text-3xl font-extrabold text-foreground tracking-tight">
            {overview.totalProfileViews}
          </div>
          <div className="text-[11px] text-muted-foreground flex items-center gap-1">
            <UserCheck className="h-3 w-3 text-emerald-500" />
            <span>{overview.uniqueViewers} unique visitors</span>
          </div>
        </div>

        <div className="p-6 rounded-3xl border border-border bg-card shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">NFC Card Taps</span>
            <Wifi className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-3xl font-extrabold text-foreground tracking-tight">
            {overview.nfcTaps}
          </div>
          <div className="text-[11px] text-muted-foreground">
            Physical hardware touchpoints
          </div>
        </div>

        <div className="p-6 rounded-3xl border border-border bg-card shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">QR Code Scans</span>
            <QrCode className="h-4 w-4 text-violet-500" />
          </div>
          <div className="text-3xl font-extrabold text-foreground tracking-tight">
            {overview.qrScans}
          </div>
          <div className="text-[11px] text-muted-foreground">
            Mobile camera scans
          </div>
        </div>

        <div className="p-6 rounded-3xl border border-border bg-card shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Link Clicks</span>
            <MousePointerClick className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-3xl font-extrabold text-foreground tracking-tight">
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
            No activity points recorded in this period yet. Share your profile link or tap your card to generate traffic!
          </div>
        ) : (
          <div className="pt-4">
            <div className="flex items-end gap-1 sm:gap-2 h-40 w-full overflow-x-auto pb-2 no-scrollbar">
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

      {/* Viewer Composition & Device Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
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
            Privacy-preserving aggregate telemetry of your visitors.
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
            Breakdown of devices used by people inspecting your identity.
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

        {/* Top Outbound Links */}
        <div className="md:col-span-12 p-6 sm:p-8 rounded-3xl border border-border bg-card shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                <span>Top Interacted Links & Portfolio Items</span>
              </h2>
              <p className="text-xs text-muted-foreground">
                Which portfolio links, projects, and external destinations visitors clicked most.
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
                <p>When visitors click your portfolio, projects, or social links, they will be ranked and analyzed here.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
