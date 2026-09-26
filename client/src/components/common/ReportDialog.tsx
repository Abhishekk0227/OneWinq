import * as React from 'react'
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { moderationApi } from '@/features/moderation/api/moderation.api'
import { toast } from '@/stores/toastStore'
import { Flag } from 'lucide-react'

interface ReportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  targetType: 'USER' | 'PROFILE' | 'MESSAGE' | 'CARD'
  targetId: string
  targetName?: string
  reportedUserId?: string
  title?: string
}

const REPORT_REASONS = [
  'SPAM',
  'HARASSMENT',
  'IMPERSONATION',
  'FRAUD_OR_SCAM',
  'INAPPROPRIATE_CONTENT',
  'OTHER',
]

export function ReportDialog({
  open,
  onOpenChange,
  targetType,
  targetId,
  reportedUserId,
  title = 'Submit Abuse Report',
}: ReportDialogProps) {
  const [reason, setReason] = React.useState('SPAM')
  const [description, setDescription] = React.useState('')
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await moderationApi.submitReport({
        targetType,
        targetId,
        reportedUser: reportedUserId,
        reason,
        description,
      })
      toast.success('Report submitted. Our moderation team will investigate.')
      onOpenChange(false)
      setDescription('')
      setReason('SPAM')
    } catch (err: unknown) {
      const apiErr = err as { message?: string }
      toast.error(apiErr.message || 'Failed to submit report')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <DialogHeader>
          <div className="flex items-center gap-2 text-destructive">
            <Flag className="h-5 w-5" />
            <DialogTitle>{title}</DialogTitle>
          </div>
          <DialogDescription>
            Help keep OneWinq safe. Reports are confidential and reviewed by our moderation team.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2 text-xs">
          <div className="space-y-1">
            <label className="font-semibold text-foreground">Select Violation Reason</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-card border border-border text-foreground text-xs focus:ring-1 focus:ring-primary outline-none"
            >
              {REPORT_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-foreground">Detailed Description (Optional)</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide context or links to help our team take prompt action..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="destructive"
            size="sm"
            isLoading={isSubmitting}
          >
            Submit Report
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  )
}
