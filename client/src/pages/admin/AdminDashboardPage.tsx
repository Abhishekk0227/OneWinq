import { useQuery } from '@tanstack/react-query'
import { adminApi } from '@/features/admin/api/admin.api'
import { queryKeys } from '@/lib/query/queryKeys'
import { LoadingScreen } from '@/components/common/LoadingScreen'
import { CreditCard } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function AdminDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.admin.metrics,
    queryFn: () => adminApi.getMetrics(),
  })

  const metrics = data?.data?.metrics || {}

  if (isLoading) {
    return <LoadingScreen message="Loading admin telemetry..." />
  }

  const hardware = (metrics as any)?.hardware || {}

  return (
    <div className="space-y-6 text-left max-w-6xl">
      <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
          System Overview
        </h1>
        <p className="text-xs text-white/60">
          Realtime NFC hardware fleet and platform administration overview.
        </p>
      </div>

      {/* Card Fleet Breakdown */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <CreditCard className="h-4 sm:h-5 w-4 sm:w-5 text-primary" />
            <span>NFC Card Fleet Breakdown</span>
          </h2>
          <Link to="/admin/cards" className="text-xs text-primary hover:underline">
            Manage Cards &rarr;
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
          <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-[#14141c] border border-white/10 space-y-1">
            <div className="text-[11px] text-white/50">Total Cards</div>
            <div className="text-xl sm:text-2xl font-extrabold text-white">{(metrics as any).hardware?.totalCards ?? 0}</div>
          </div>

          <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-[#14141c] border border-white/10 space-y-1">
            <div className="text-[11px] text-emerald-400">Active Cards</div>
            <div className="text-xl sm:text-2xl font-extrabold text-emerald-400">{(metrics as any).hardware?.activeCards ?? 0}</div>
          </div>

          <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-[#14141c] border border-white/10 space-y-1">
            <div className="text-[11px] text-purple-300">Unassigned</div>
            <div className="text-xl sm:text-2xl font-extrabold text-purple-300">{hardware.unassignedCards ?? 0}</div>
          </div>

          <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-[#14141c] border border-white/10 space-y-1">
            <div className="text-[11px] text-amber-400">Inactive</div>
            <div className="text-xl sm:text-2xl font-extrabold text-amber-400">{hardware.inactiveCards ?? 0}</div>
          </div>

          <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-[#14141c] border border-white/10 space-y-1 col-span-2 sm:col-span-1">
            <div className="text-[11px] text-rose-400">Blocked</div>
            <div className="text-xl sm:text-2xl font-extrabold text-rose-400">{hardware.blockedCards ?? 0}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
