import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '@/features/admin/api/admin.api'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Textarea } from '@/components/ui/Textarea'
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog'
import { LoadingScreen } from '@/components/common/LoadingScreen'
import { EmptyState } from '@/components/common/EmptyState'
import { toast } from '@/stores/toastStore'
import {
  ShieldAlert,
  CheckCircle,
  Filter,
} from 'lucide-react'

export default function AdminReportsPage() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = React.useState<string>('ALL')
  const [selectedReport, setSelectedReport] = React.useState<any | null>(null)
  const [resolutionStatus, setResolutionStatus] = React.useState<'RESOLVED' | 'DISMISSED'>('RESOLVED')
  const [actionTaken, setActionTaken] = React.useState('NO_ACTION')
  const [adminNotes, setAdminNotes] = React.useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-reports', statusFilter],
    queryFn: () =>
      adminApi.listReports(statusFilter !== 'ALL' ? { status: statusFilter } : {}),
  })

  const resolveMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      adminApi.resolveReport(id, payload),
    onSuccess: () => {
      toast.success('Report resolved.')
      setSelectedReport(null)
      setAdminNotes('')
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] })
    },
    onError: (err: unknown) => {
      const apiErr = err as { message?: string }
      toast.error(apiErr.message || 'Failed to update report')
    },
  })

  const reports = data?.data?.reports || []

  if (isLoading) {
    return <LoadingScreen message="Loading moderation queue..." />
  }

  return (
    <div className="space-y-8 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <ShieldAlert className="h-6 w-6 text-primary" />
            <span>Abuse & Safety Moderation</span>
          </h1>
          <p className="text-xs text-white/60">
            Review user violations, spam, impersonation, and content flags.
          </p>
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-2 bg-[#161620] p-1 rounded-xl border border-white/10 text-xs">
          <Filter className="h-3.5 w-3.5 text-white/40 ml-2" />
          {['ALL', 'PENDING', 'REVIEWING', 'RESOLVED', 'DISMISSED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                statusFilter === st
                  ? 'bg-primary text-white font-bold'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {reports.length === 0 ? (
        <EmptyState
          icon={<CheckCircle className="h-6 w-6 text-success" />}
          title="Queue is clear"
          description="There are currently no moderation flags matching your selected filter."
        />
      ) : (
        <div className="rounded-2xl border border-white/10 bg-[#121218] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#181822] text-white/50 border-b border-white/10 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Created</th>
                  <th className="py-3.5 px-4">Target Type</th>
                  <th className="py-3.5 px-4">Reason</th>
                  <th className="py-3.5 px-4">Details</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-white/80">
                {reports.map((r: any) => (
                  <tr key={r._id || r.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4 text-white/50 whitespace-nowrap">
                      {new Date(r.createdAt).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded bg-white/10 text-[10px] font-bold text-white uppercase">
                        {r.targetType}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-white">
                      {r.reason}
                    </td>
                    <td className="py-3.5 px-4 max-w-xs truncate text-white/70">
                      {r.description || '—'}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge
                        variant={
                          r.status === 'RESOLVED'
                            ? 'success'
                            : r.status === 'DISMISSED'
                            ? 'default'
                            : 'warning'
                        }
                        className="text-[10px]"
                      >
                        {r.status}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-white/15 bg-white/5 text-white hover:bg-white/10"
                        onClick={() => {
                          setSelectedReport(r)
                          setResolutionStatus(r.status === 'DISMISSED' ? 'DISMISSED' : 'RESOLVED')
                          setActionTaken(r.actionTaken || 'NO_ACTION')
                          setAdminNotes(r.adminNotes || '')
                        }}
                      >
                        Review
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Review Dialog */}
      <Dialog open={!!selectedReport} onOpenChange={(open) => !open && setSelectedReport(null)}>
        <DialogHeader>
          <DialogTitle>Moderation Action</DialogTitle>
          <DialogDescription>
            Examine violation evidence and record resolution decision.
          </DialogDescription>
        </DialogHeader>

        {selectedReport && (
          <div className="space-y-4 pt-2 text-xs">
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-white/50">Target:</span>
                <span className="font-bold text-white">{selectedReport.targetType} ({selectedReport.targetId})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Reported Reason:</span>
                <span className="font-bold text-danger">{selectedReport.reason}</span>
              </div>
              {selectedReport.description && (
                <div className="pt-1 text-white/80">
                  <span className="text-white/50 block mb-0.5">User Statement:</span>
                  <div className="p-2 rounded bg-black/40 border border-white/5 font-mono text-[11px]">
                    {selectedReport.description}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-white">Status Decision</label>
              <select
                value={resolutionStatus}
                onChange={(e) => setResolutionStatus(e.target.value as any)}
                className="w-full rounded-xl border border-white/10 bg-[#181822] text-white px-3 py-2 text-xs font-semibold"
              >
                <option value="RESOLVED">RESOLVED (Action Taken)</option>
                <option value="DISMISSED">DISMISSED (Invalid or False Report)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-white">Action Enforcement</label>
              <select
                value={actionTaken}
                onChange={(e) => setActionTaken(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#181822] text-white px-3 py-2 text-xs font-semibold"
              >
                <option value="NO_ACTION">No Action (Dismissed)</option>
                <option value="CONTENT_REMOVED">Content Removed</option>
                <option value="USER_WARNED">User Warned</option>
                <option value="USER_SUSPENDED">User Suspended</option>
                <option value="ACCOUNT_BANNED">Permanent Ban</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-white">Internal Admin Notes</label>
              <Textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Log internal context, violation evidence URLs, or reasoning..."
                rows={3}
                className="bg-[#181822] border-white/10 text-white text-xs"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            className="border-white/15 bg-white/5 text-white hover:bg-white/10"
            onClick={() => setSelectedReport(null)}
          >
            Cancel
          </Button>
          <Button
            isLoading={resolveMutation.isPending}
            onClick={() => {
              if (selectedReport) {
                resolveMutation.mutate({
                  id: selectedReport._id || selectedReport.id,
                  payload: {
                    status: resolutionStatus,
                    actionTaken,
                    adminNotes,
                  },
                })
              }
            }}
          >
            Submit Resolution
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
