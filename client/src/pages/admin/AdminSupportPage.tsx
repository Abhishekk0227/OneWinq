import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '@/features/admin/api/admin.api'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog'
import { LoadingScreen } from '@/components/common/LoadingScreen'
import { EmptyState } from '@/components/common/EmptyState'
import { toast } from '@/stores/toastStore'
import {
  HelpCircle,
  CheckCircle,
  Filter,
} from 'lucide-react'

export default function AdminSupportPage() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = React.useState<string>('ALL')
  const [selectedTicket, setSelectedTicket] = React.useState<any | null>(null)
  const [newStatus, setNewStatus] = React.useState('OPEN')
  const [internalNote, setInternalNote] = React.useState('')
  const [replyText, setReplyText] = React.useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-tickets', statusFilter],
    queryFn: () =>
      adminApi.listTickets(statusFilter !== 'ALL' ? { status: statusFilter } : {}),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      adminApi.updateTicket(id, payload),
    onSuccess: () => {
      toast.success('Ticket updated!')
      setSelectedTicket(null)
      setInternalNote('')
      setReplyText('')
      queryClient.invalidateQueries({ queryKey: ['admin-tickets'] })
    },
    onError: (err: unknown) => {
      const apiErr = err as { message?: string }
      toast.error(apiErr.message || 'Failed to update ticket')
    },
  })

  const tickets = data?.data?.tickets || []

  if (isLoading) {
    return <LoadingScreen message="Loading support tickets..." />
  }

  return (
    <div className="space-y-8 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <HelpCircle className="h-6 w-6 text-primary" />
            <span>Support Tickets</span>
          </h1>
          <p className="text-xs text-white/60">
            Handle customer questions, hardware inquiry requests, and identity appeals.
          </p>
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-2 bg-[#161620] p-1 rounded-xl border border-white/10 text-xs">
          <Filter className="h-3.5 w-3.5 text-white/40 ml-2" />
          {['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map((st) => (
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

      {tickets.length === 0 ? (
        <EmptyState
          icon={<CheckCircle className="h-6 w-6 text-success" />}
          title="No tickets"
          description="There are currently no tickets matching your filter criteria."
        />
      ) : (
        <div className="rounded-2xl border border-white/10 bg-[#121218] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#181822] text-white/50 border-b border-white/10 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Subject</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Priority</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-white/80">
                {tickets.map((t: any) => (
                  <tr key={t._id || t.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4 text-white/50 whitespace-nowrap">
                      {new Date(t.createdAt).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-white">
                      {t.subject}
                    </td>
                    <td className="py-3.5 px-4 text-white/60">
                      {t.category || 'General'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          t.priority === 'URGENT'
                            ? 'bg-destructive/20 text-destructive'
                            : t.priority === 'HIGH'
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-white/10 text-white/70'
                        }`}
                      >
                        {t.priority || 'MEDIUM'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge
                        variant={
                          t.status === 'RESOLVED'
                            ? 'success'
                            : t.status === 'CLOSED'
                            ? 'default'
                            : 'warning'
                        }
                        className="text-[10px]"
                      >
                        {t.status}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-white/15 bg-white/5 text-white hover:bg-white/10"
                        onClick={() => {
                          setSelectedTicket(t)
                          setNewStatus(t.status || 'OPEN')
                          setInternalNote('')
                          setReplyText('')
                        }}
                      >
                        Manage
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Ticket Details & Action Dialog */}
      <Dialog open={!!selectedTicket} onOpenChange={(open) => !open && setSelectedTicket(null)}>
        <DialogHeader>
          <DialogTitle>Ticket #{selectedTicket?._id?.substring(0, 8)}</DialogTitle>
          <DialogDescription>
            {selectedTicket?.subject}
          </DialogDescription>
        </DialogHeader>

        {selectedTicket && (
          <div className="space-y-4 pt-2 text-xs">
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-2">
              <div className="flex justify-between">
                <span className="text-white/50">Category:</span>
                <span className="font-semibold text-white">{selectedTicket.category || 'General'}</span>
              </div>
              <div className="text-white/80 pt-1">
                <span className="text-white/50 block mb-1">Customer Description:</span>
                <div className="p-2.5 rounded bg-black/40 border border-white/5 text-white/90 whitespace-pre-wrap font-sans text-xs">
                  {selectedTicket.description}
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-white">Ticket Status</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#181822] text-white px-3 py-2 text-xs font-semibold"
              >
                <option value="OPEN">OPEN</option>
                <option value="IN_PROGRESS">IN_PROGRESS</option>
                <option value="RESOLVED">RESOLVED</option>
                <option value="CLOSED">CLOSED</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-white">Customer Reply (Optional)</label>
              <Textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Compose a response to send directly to the user..."
                rows={3}
                className="bg-[#181822] border-white/10 text-white text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-white">Internal Admin Note</label>
              <Input
                value={internalNote}
                onChange={(e) => setInternalNote(e.target.value)}
                placeholder="Team note (not visible to user)..."
                className="bg-[#181822] border-white/10 text-white text-xs"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            className="border-white/15 bg-white/5 text-white hover:bg-white/10"
            onClick={() => setSelectedTicket(null)}
          >
            Cancel
          </Button>
          <Button
            isLoading={updateMutation.isPending}
            onClick={() => {
              if (selectedTicket) {
                updateMutation.mutate({
                  id: selectedTicket._id || selectedTicket.id,
                  payload: {
                    status: newStatus,
                    internalNote: internalNote || undefined,
                    replyText: replyText || undefined,
                  },
                })
              }
            }}
          >
            Update Ticket
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
