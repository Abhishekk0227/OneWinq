import { useQuery } from '@tanstack/react-query'
import { adminApi } from '@/features/admin/api/admin.api'
import { queryKeys } from '@/lib/query/queryKeys'
import { LoadingScreen } from '@/components/common/LoadingScreen'
import { Users, CreditCard, MessageSquare, Layers } from 'lucide-react'

export default function AdminDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.admin.metrics,
    queryFn: () => adminApi.getMetrics(),
  })

  const metrics = data?.data?.metrics || {
    totalUsers: 0,
    activeUsers: 0,
    pendingVerificationUsers: 0,
    totalProfiles: 0,
    publishedProfiles: 0,
    activeCards: 0,
    totalConnections: 0,
    totalConversations: 0,
  }

  if (isLoading) {
    return <LoadingScreen message="Loading admin telemetry..." />
  }

  return (
    <div className="space-y-8 text-left max-w-6xl">
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
          System Overview & Metrics
        </h1>
        <p className="text-xs sm:text-sm text-white/60">
          Realtime platform metrics across identity profiles, cards, and networking throughput.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-[#14141c] border border-white/10 space-y-2">
          <div className="flex justify-between items-center text-white/50 text-xs">
            <span>Total Accounts</span>
            <Users className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white">{metrics.totalUsers}</div>
          <div className="text-[11px] text-white/50">{metrics.activeUsers} active users</div>
        </div>

        <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-[#14141c] border border-white/10 space-y-2">
          <div className="flex justify-between items-center text-white/50 text-xs">
            <span>Published Profiles</span>
            <Layers className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white">{metrics.publishedProfiles}</div>
          <div className="text-[11px] text-white/50">{metrics.totalProfiles} total drafts</div>
        </div>

        <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-[#14141c] border border-white/10 space-y-2">
          <div className="flex justify-between items-center text-white/50 text-xs">
            <span>Active NFC Cards</span>
            <CreditCard className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white">{metrics.activeCards}</div>
          <div className="text-[11px] text-white/50">Physical hardware assigned</div>
        </div>

        <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-[#14141c] border border-white/10 space-y-2">
          <div className="flex justify-between items-center text-white/50 text-xs">
            <span>Active Connections</span>
            <MessageSquare className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white">{metrics.totalConnections}</div>
          <div className="text-[11px] text-white/50">{metrics.totalConversations} conversations</div>
        </div>
      </div>

      {/* Card Fleet Breakdown */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <CreditCard className="h-4 sm:h-5 w-4 sm:w-5 text-primary" />
            <span>NFC Card Fleet Breakdown</span>
          </h2>
          <a href="/admin/cards" className="text-xs text-primary hover:underline">
            Manage Cards &rarr;
          </a>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
          <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-[#14141c] border border-white/10 space-y-1">
            <div className="text-[11px] text-white/50">Total Cards</div>
            <div className="text-xl sm:text-2xl font-extrabold text-white">{(metrics as any).hardware?.totalCards || metrics.activeCards || 0}</div>
          </div>

          <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-[#14141c] border border-white/10 space-y-1">
            <div className="text-[11px] text-emerald-400">Active Cards</div>
            <div className="text-xl sm:text-2xl font-extrabold text-emerald-400">{(metrics as any).hardware?.activeCards || metrics.activeCards || 0}</div>
          </div>

          <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-[#14141c] border border-white/10 space-y-1">
            <div className="text-[11px] text-purple-300">Unassigned</div>
            <div className="text-xl sm:text-2xl font-extrabold text-purple-300">{(metrics as any).hardware?.unassignedCards || 0}</div>
          </div>

          <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-[#14141c] border border-white/10 space-y-1">
            <div className="text-[11px] text-amber-400">Inactive</div>
            <div className="text-xl sm:text-2xl font-extrabold text-amber-400">{(metrics as any).hardware?.inactiveCards || 0}</div>
          </div>

          <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-[#14141c] border border-white/10 space-y-1 col-span-2 sm:col-span-1">
            <div className="text-[11px] text-rose-400">Blocked</div>
            <div className="text-xl sm:text-2xl font-extrabold text-rose-400">{(metrics as any).hardware?.blockedCards || 0}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
