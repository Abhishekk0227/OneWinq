import { useQuery } from '@tanstack/react-query'
import { adminApi } from '@/features/admin/api/admin.api'
import { queryKeys } from '@/lib/query/queryKeys'
import { LoadingScreen } from '@/components/common/LoadingScreen'


export default function AdminAuditPage() {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.admin.auditLogs(),
    queryFn: () => adminApi.getAuditLogs({ limit: 50 }),
  })

  const logs = data?.data?.auditLogs || []

  if (isLoading) {
    return <LoadingScreen message="Loading security audit trails..." />
  }

  return (
    <div className="space-y-6 text-left max-w-6xl">
      <div>
        <h1 className="text-2xl font-extrabold text-white">Security & System Audit Logs</h1>
        <p className="text-xs text-white/60">Immutable tamper-evident record of administrative and system actions.</p>
      </div>

      <div className="rounded-3xl border border-white/10 bg-[#14141c] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/5 text-white/60 uppercase text-[10px] tracking-wider border-b border-white/10">
              <tr>
                <th className="p-4">Timestamp</th>
                <th className="p-4">Actor</th>
                <th className="p-4">Action</th>
                <th className="p-4">Target Type</th>
                <th className="p-4">Target ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-white/40">
                    No audit records registered yet.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const lId = log._id || log.id
                  return (
                    <tr key={lId} className="hover:bg-white/5 transition-colors">
                      <td className="p-4 text-white/50 font-mono text-[11px]">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="p-4 font-bold text-white">
                        {log.actorEmail || log.actorId}
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded bg-primary/20 text-primary font-mono text-[10px]">
                          {log.action}
                        </span>
                      </td>
                      <td className="p-4 text-white/70">{log.targetType}</td>
                      <td className="p-4 font-mono text-[10px] text-white/50 truncate max-w-xs">
                        {log.targetId || 'N/A'}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
