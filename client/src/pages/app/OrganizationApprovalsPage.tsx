import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileCheck2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Eye,
  User,
  ArrowRight,
  Loader2,
  Building2,
  ShieldCheck,
  MessageSquare,
} from 'lucide-react';
import { useOrganizationContextStore } from '@/stores/organizationContextStore';
import { organizationsApi } from '@/features/organizations/api/organizations.api';
import { toast } from '@/stores/toastStore';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Textarea } from '@/components/ui/Textarea';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog';
import { PROFILE_APPROVAL_STATUS } from '@/constants/app.constants';
import type { ProfileApproval } from '@/types/organization.types';

export default function OrganizationApprovalsPage() {
  const queryClient = useQueryClient();
  const { activeContext } = useOrganizationContextStore();
  const orgId = activeContext.type === 'ORGANIZATION' ? activeContext.organizationId : '';

  const [activeTab, setActiveTab] = React.useState<string>('PENDING_REVIEW');
  const [selectedApproval, setSelectedApproval] = React.useState<ProfileApproval | null>(null);
  const [reviewNote, setReviewNote] = React.useState<string>('');

  const { data: approvalsData, isLoading } = useQuery({
    queryKey: ['org', orgId, 'approvals', activeTab],
    queryFn: () =>
      organizationsApi.listApprovals(orgId, {
        status: activeTab === 'ALL' ? undefined : activeTab,
        limit: 50,
      }),
    enabled: !!orgId,
  });

  const approvals: ProfileApproval[] = (approvalsData as any)?.data?.approvals || [];

  const reviewMutation = useMutation({
    mutationFn: ({
      approvalId,
      action,
      note,
    }: {
      approvalId: string;
      action: 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES';
      note?: string;
    }) =>
      organizationsApi.reviewProfileApproval(orgId, approvalId, {
        action,
        reviewNote: note,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['org', orgId, 'approvals'] });
      setSelectedApproval(null);
      setReviewNote('');
      if (variables.action === 'APPROVE') {
        toast.success('Profile draft approved! Employee card updated.');
      } else if (variables.action === 'REJECT') {
        toast.error('Profile draft rejected.');
      } else {
        toast.info('Changes requested from employee.');
      }
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to complete review');
    },
  });

  if (!orgId) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-bold">No Organization Selected</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Switch to an organization workspace to review employee profile submissions.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Profile Approvals & Governance</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Review and moderate changes to corporate digital identities before they go live on public NFC cards.
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-xl w-full sm:w-auto self-start">
        {[
          { key: 'PENDING_REVIEW', label: 'Pending Review' },
          { key: 'APPROVED', label: 'Approved' },
          { key: 'CHANGES_REQUESTED', label: 'Changes Requested' },
          { key: 'REJECTED', label: 'Rejected' },
          { key: 'ALL', label: 'All Submissions' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === tab.key
                ? 'bg-card text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Approvals Feed */}
      {isLoading ? (
        <div className="flex items-center justify-center p-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : approvals.length === 0 ? (
        <Card className="p-12 text-center">
          <FileCheck2 className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
          <h3 className="text-base font-semibold">No profile submissions found</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {activeTab === 'PENDING_REVIEW'
              ? 'All employee profile updates have been reviewed and approved.'
              : 'No submissions match this filter.'}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {approvals.map((app) => (
            <Card
              key={app.id}
              className="p-5 hover:border-primary/40 transition-all duration-200 overflow-hidden"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold overflow-hidden shrink-0">
                    {app.user?.avatarUrl ? (
                      <img src={app.user.avatarUrl} alt={app.user.displayName} className="w-full h-full object-cover" />
                    ) : (
                      <User className="h-5 w-5" />
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-base text-foreground">
                        {app.user?.displayName || 'Team Member'}
                      </h4>
                      <Badge
                        variant="outline"
                        className={
                          app.status === PROFILE_APPROVAL_STATUS.PENDING_REVIEW
                            ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                            : app.status === PROFILE_APPROVAL_STATUS.APPROVED
                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                        }
                      >
                        {app.status.replace('_', ' ')}
                      </Badge>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Submitted on {new Date(app.createdAt).toLocaleDateString()} • {app.diffSummary?.length || 0} fields modified
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <Button
                    onClick={() => {
                      setSelectedApproval(app);
                      setReviewNote(app.reviewNote || '');
                    }}
                    size="sm"
                    className="text-xs font-semibold"
                  >
                    <Eye className="h-3.5 w-3.5 mr-1.5" /> Compare & Review
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Side-by-Side Field Diff Modal */}
      <Dialog
        open={!!selectedApproval}
        onOpenChange={(open) => !open && setSelectedApproval(null)}
        className="max-w-3xl"
      >
        {selectedApproval && (
          <div className="space-y-5">
            <DialogHeader>
              <DialogTitle className="text-xl">
                Review Profile Changes: {selectedApproval.user?.displayName}
              </DialogTitle>
              <DialogDescription>
                Examine modified fields below. Approving updates will automatically push changes to their live public card.
              </DialogDescription>
            </DialogHeader>

            {/* Diff Summary Table */}
            <div className="border border-border/80 rounded-2xl overflow-hidden bg-card text-xs">
              <div className="grid grid-cols-3 p-3 bg-muted/40 font-bold uppercase tracking-wider text-muted-foreground border-b border-border">
                <span>Field</span>
                <span>Current Live Value</span>
                <span>Proposed New Value</span>
              </div>

              <div className="divide-y divide-border/60 max-h-64 overflow-y-auto">
                {selectedApproval.diffSummary.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground italic">
                    Initial profile submission or no direct field diffs detected.
                  </div>
                ) : (
                  selectedApproval.diffSummary.map((diff, idx) => (
                    <div key={idx} className="grid grid-cols-3 p-3 items-center hover:bg-muted/10 gap-2">
                      <span className="font-mono font-semibold text-foreground truncate">
                        {diff.field}
                      </span>
                      <span className="text-rose-500 bg-rose-500/5 p-1 rounded font-mono truncate">
                        {typeof diff.oldValue === 'object'
                          ? JSON.stringify(diff.oldValue)
                          : String(diff.oldValue ?? 'None')}
                      </span>
                      <span className="text-emerald-500 bg-emerald-500/5 p-1 rounded font-mono truncate">
                        {typeof diff.newValue === 'object'
                          ? JSON.stringify(diff.newValue)
                          : String(diff.newValue ?? 'None')}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Reviewer Note */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                Feedback / Reviewer Note (Optional)
              </label>
              <Textarea
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                rows={3}
                placeholder="Add reviewer notes or reason for requesting changes..."
              />
            </div>

            <DialogFooter className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                disabled={reviewMutation.isPending}
                onClick={() =>
                  reviewMutation.mutate({
                    approvalId: selectedApproval.id,
                    action: 'REQUEST_CHANGES',
                    note: reviewNote,
                  })
                }
                className="text-amber-600 border-amber-600/30 hover:bg-amber-600/10 text-xs"
              >
                <AlertTriangle className="h-3.5 w-3.5 mr-1" /> Request Changes
              </Button>

              <Button
                variant="outline"
                disabled={reviewMutation.isPending}
                onClick={() =>
                  reviewMutation.mutate({
                    approvalId: selectedApproval.id,
                    action: 'REJECT',
                    note: reviewNote,
                  })
                }
                className="text-rose-600 border-rose-600/30 hover:bg-rose-600/10 text-xs"
              >
                <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
              </Button>

              <Button
                disabled={reviewMutation.isPending}
                onClick={() =>
                  reviewMutation.mutate({
                    approvalId: selectedApproval.id,
                    action: 'APPROVE',
                    note: reviewNote,
                  })
                }
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
              >
                {reviewMutation.isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Approve & Push Live
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </Dialog>
    </div>
  );
}
