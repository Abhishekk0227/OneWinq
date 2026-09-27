import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supportApi, type SupportTicket } from '@/features/support/api/support.api'
import { queryKeys } from '@/lib/query/queryKeys'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Badge } from '@/components/ui/Badge'
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingScreen } from '@/components/common/LoadingScreen'
import { toast } from '@/stores/toastStore'
import { HelpCircle, Plus } from 'lucide-react'

export default function SupportPage() {
  const queryClient = useQueryClient()
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [selectedTicket, setSelectedTicket] = React.useState<SupportTicket | null>(null)
  const [replyText, setReplyText] = React.useState('')

  // Create form state
  const [subject, setSubject] = React.useState('')
  const [category, setCategory] = React.useState('TECHNICAL')
  const [priority, setPriority] = React.useState('MEDIUM')
  const [message, setMessage] = React.useState('')

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.support.tickets,
    queryFn: () => supportApi.listTickets(),
  })

  const tickets = data?.data?.tickets || []

  const createTicketMutation = useMutation({
    mutationFn: () =>
      supportApi.createTicket({ subject, category, priority, message }),
    onSuccess: () => {
      toast.success('Support ticket created. Our team will review it shortly.')
      setIsCreateOpen(false)
      setSubject('')
      setMessage('')
      queryClient.invalidateQueries({ queryKey: queryKeys.support.tickets })
    },
    onError: (err: unknown) => {
      const apiErr = err as { message?: string }
      toast.error(apiErr.message || 'Failed to submit ticket')
    },
  })

  const replyMutation = useMutation({
    mutationFn: () =>
      supportApi.replyTicket(selectedTicket?._id || selectedTicket?.id || '', replyText),
    onSuccess: (res) => {
      toast.success('Reply submitted.')
      setReplyText('')
      setSelectedTicket(res.data.ticket)
      queryClient.invalidateQueries({ queryKey: queryKeys.support.tickets })
    },
  })

  if (isLoading) {
    return <LoadingScreen message="Loading support tickets..." />
  }

  return (
    <div className="space-y-6 text-left max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-0.5">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Support
          </h1>
          <p className="text-xs text-muted-foreground">
            Get help with physical NFC cards, profile routing, or inquiries.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setIsCreateOpen(true)}
          leftIcon={<Plus className="h-4 w-4" />}
        >
          New Ticket
        </Button>
      </div>

      {tickets.length === 0 ? (
        <EmptyState
          icon={<HelpCircle className="h-8 w-8" />}
          title="No open support tickets"
          description="Have questions about your NFC hardware or profile verification? Open a ticket to reach our engineering team."
          actionLabel="Create Ticket"
          onAction={() => setIsCreateOpen(true)}
        />
      ) : (
        <div className="space-y-4">
          {tickets.map((ticket) => {
            const tId = ticket._id || ticket.id
            return (
              <div
                key={tId}
                className="p-6 rounded-3xl border border-border bg-card shadow-sm space-y-3 cursor-pointer hover:border-primary/40 transition-colors"
                onClick={() => setSelectedTicket(ticket)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="subtle" className="text-[10px]">
                      {ticket.category}
                    </Badge>
                    <Badge
                      variant={
                        ticket.status === 'RESOLVED' || ticket.status === 'CLOSED'
                          ? 'success'
                          : 'default'
                      }
                      className="text-[10px]"
                    >
                      {ticket.status}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(ticket.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <h3 className="text-base font-bold text-foreground">{ticket.subject}</h3>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {ticket.messages?.[0]?.message || 'No initial message'}
                </p>
              </div>
            )
          })}
        </div>
      )}

      {/* Create Ticket Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogHeader>
          <DialogTitle>Create Support Ticket</DialogTitle>
          <DialogDescription>
            Describe your issue or question and our support team will follow up.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Subject</label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Question regarding NFC card activation"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-input bg-background p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="TECHNICAL">Technical Issue</option>
                <option value="BILLING">Billing & Orders</option>
                <option value="CARD_HARDWARE">Hardware Card</option>
                <option value="GENERAL">General Inquiries</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full rounded-xl border border-input bg-background p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Message</label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Detailed description..."
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
            Cancel
          </Button>
          <Button
            isLoading={createTicketMutation.isPending}
            disabled={!subject || !message}
            onClick={() => createTicketMutation.mutate()}
          >
            Submit Ticket
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Ticket Thread Dialog */}
      <Dialog
        open={!!selectedTicket}
        onOpenChange={(open) => !open && setSelectedTicket(null)}
      >
        <DialogHeader>
          <DialogTitle>{selectedTicket?.subject}</DialogTitle>
          <DialogDescription>
            Ticket status: <Badge variant="subtle">{selectedTicket?.status}</Badge>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-[50vh] overflow-y-auto custom-scrollbar p-2">
          {selectedTicket?.messages?.map((msg, idx) => (
            <div
              key={idx}
              className={`p-3.5 rounded-2xl text-xs space-y-1 ${
                msg.senderRole !== 'USER'
                  ? 'bg-primary-soft/60 border border-primary/20 text-foreground'
                  : 'bg-muted/40 border border-border text-foreground'
              }`}
            >
              <div className="flex justify-between items-center font-bold text-[11px]">
                <span className={msg.senderRole !== 'USER' ? 'text-primary' : 'text-foreground'}>
                  {msg.senderRole !== 'USER' ? 'Support Agent' : 'You'}
                </span>
                <span className="text-muted-foreground font-normal">
                  {new Date(msg.createdAt).toLocaleString()}
                </span>
              </div>
              <p className="whitespace-pre-line leading-relaxed">{msg.message}</p>
            </div>
          ))}
        </div>

        <div className="pt-3 border-t border-border flex gap-2">
          <Input
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Type your response..."
            className="flex-1 text-xs"
          />
          <Button
            size="sm"
            isLoading={replyMutation.isPending}
            disabled={!replyText.trim()}
            onClick={() => replyMutation.mutate()}
          >
            Reply
          </Button>
        </div>
      </Dialog>
    </div>
  )
}
