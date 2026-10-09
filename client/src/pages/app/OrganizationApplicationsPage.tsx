import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import {
  FileCheck,
  Search,
  Filter,
  FileText,
  Mail,
  User,
  Calendar,
  MessageSquare,
  ChevronRight,
  ExternalLink,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Building2,
  Loader2,
  Send,
} from 'lucide-react';
import { useOrganizationContextStore } from '@/stores/organizationContextStore';
import { jobsApi } from '@/features/jobs/api/jobs.api';
import { toast } from '@/stores/toastStore';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog';
import { APPLICATION_STATUS } from '@/constants/app.constants';
import type { JobApplication, Job } from '@/types/organization.types';

export default function OrganizationApplicationsPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const { activeContext } = useOrganizationContextStore();
  const orgId = activeContext.type === 'ORGANIZATION' ? activeContext.organizationId : '';

  const selectedJobId = searchParams.get('jobId') || '';
  const [statusFilter, setStatusFilter] = React.useState<string>('ALL');
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [selectedApp, setSelectedApp] = React.useState<JobApplication | null>(null);
  const [newNote, setNewNote] = React.useState<string>('');

  // Fetch all jobs for filter dropdown
  const { data: jobsData } = useQuery({
    queryKey: ['org', orgId, 'jobs'],
    queryFn: () => jobsApi.listOrgJobs(orgId, { limit: 100 }),
    enabled: !!orgId,
  });
  const jobs: Job[] = (jobsData as any)?.data?.jobs || [];

  // Fetch applications
  const { data: appsData, isLoading } = useQuery({
    queryKey: ['org', orgId, 'applications', { jobId: selectedJobId, status: statusFilter }],
    queryFn: () =>
      jobsApi.listApplications(orgId, {
        jobId: selectedJobId || undefined,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        limit: 100,
      }),
    enabled: !!orgId,
  });
  const applications: JobApplication[] = (appsData as any)?.data?.applications || [];

  const updateStatusMutation = useMutation({
    mutationFn: ({ appId, status, comment }: { appId: string; status: string; comment?: string }) =>
      jobsApi.updateAppStatus(orgId, appId, { status, comment }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['org', orgId, 'applications'] });
      if (selectedApp && (data as any)?.data?.application) {
        setSelectedApp((data as any).data.application);
      }
      toast.success('Applicant status updated');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to update status');
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: ({ appId, note }: { appId: string; note: string }) =>
      jobsApi.addAppNote(orgId, appId, { note }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['org', orgId, 'applications'] });
      setNewNote('');
      if (selectedApp && (data as any)?.data?.application) {
        setSelectedApp((data as any).data.application);
      }
      toast.success('Internal note added');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to add note');
    },
  });

  const filteredApplications = applications.filter((app) => {
    if (!searchQuery.trim()) {return true;}
    const q = searchQuery.toLowerCase();
    const nameMatch = app.applicant?.displayName?.toLowerCase().includes(q);
    const emailMatch = app.applicant?.email?.toLowerCase().includes(q);
    const jobMatch = app.jobTitle?.toLowerCase().includes(q);
    return nameMatch || emailMatch || jobMatch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case APPLICATION_STATUS.APPLIED:
        return <Badge variant="outline" className="bg-sky-500/10 text-sky-600 border-sky-500/20">Applied</Badge>;
      case APPLICATION_STATUS.SCREENING:
        return <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/20">Screening</Badge>;
      case APPLICATION_STATUS.INTERVIEW:
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">Interview</Badge>;
      case APPLICATION_STATUS.OFFERED:
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">Offered</Badge>;
      case APPLICATION_STATUS.HIRED:
        return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Hired</Badge>;
      case APPLICATION_STATUS.REJECTED:
        return <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-500/20">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (!orgId) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-bold">No Organization Selected</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Switch to an organization workspace to review applicant pipelines.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Applicant Pipeline & ATS</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Review candidates, track hiring stages, and record team evaluation notes.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 rounded-2xl border border-border/80 bg-card shadow-xs">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Job Filter */}
          <select
            value={selectedJobId}
            onChange={(e) => {
              if (e.target.value) {
                searchParams.set('jobId', e.target.value);
              } else {
                searchParams.delete('jobId');
              }
              setSearchParams(searchParams);
            }}
            className="h-9 px-3 rounded-xl border border-border bg-background text-xs font-medium focus:ring-2 focus:ring-primary/20"
          >
            <option value="">All Job Positions</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.title}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-3 rounded-xl border border-border bg-background text-xs font-medium focus:ring-2 focus:ring-primary/20"
          >
            <option value="ALL">All Stages</option>
            <option value={APPLICATION_STATUS.APPLIED}>Applied</option>
            <option value={APPLICATION_STATUS.SCREENING}>Screening</option>
            <option value={APPLICATION_STATUS.INTERVIEW}>Interview</option>
            <option value={APPLICATION_STATUS.OFFERED}>Offered</option>
            <option value={APPLICATION_STATUS.HIRED}>Hired</option>
            <option value={APPLICATION_STATUS.REJECTED}>Rejected</option>
          </select>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search candidate name or email..."
            className="pl-9 h-9 text-xs"
          />
        </div>
      </div>

      {/* Candidates List */}
      {isLoading ? (
        <div className="flex items-center justify-center p-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredApplications.length === 0 ? (
        <Card className="p-12 text-center">
          <FileCheck className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
          <h3 className="text-base font-semibold">No applications found</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {selectedJobId || statusFilter !== 'ALL' || searchQuery
              ? 'No candidates match your current filter criteria.'
              : 'When candidates apply for your published jobs, they will appear here.'}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filteredApplications.map((app) => (
            <Card
              key={app.id}
              className="hover:border-primary/40 transition-all duration-200 cursor-pointer overflow-hidden"
              onClick={() => setSelectedApp(app)}
            >
              <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold overflow-hidden shrink-0">
                    {app.applicant?.avatarUrl ? (
                      <img
                        src={app.applicant.avatarUrl}
                        alt={app.applicant.displayName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      app.applicant?.displayName?.charAt(0) || <User className="h-5 w-5" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-foreground text-sm sm:text-base">
                        {app.applicant?.displayName || 'Applicant'}
                      </h4>
                      {getStatusBadge(app.status)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Applied for <span className="font-semibold text-foreground">{app.jobTitle}</span> •{' '}
                      {new Date(app.createdAt).toLocaleDateString()}
                    </p>
                    {app.applicant?.headline && (
                      <p className="text-xs text-muted-foreground/80 line-clamp-1 mt-0.5">
                        {app.applicant.headline}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  {app.resumeUrl && (
                    <span className="flex items-center gap-1 text-xs text-primary font-medium px-2 py-1 rounded-md bg-primary/10">
                      <FileText className="h-3.5 w-3.5" /> Resume attached
                    </span>
                  )}
                  <Button variant="ghost" size="sm" className="gap-1 text-xs font-semibold">
                    Review Candidate <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Candidate Review Modal */}
      <Dialog
        open={!!selectedApp}
        onOpenChange={(open) => !open && setSelectedApp(null)}
        className="max-w-2xl"
      >
        {selectedApp && (
          <div className="space-y-5">
            <DialogHeader>
              <div className="flex items-center justify-between pr-6">
                <div>
                  <DialogTitle className="text-xl">
                    {selectedApp.applicant?.displayName || 'Candidate Review'}
                  </DialogTitle>
                  <DialogDescription className="mt-0.5">
                    Position: <span className="font-semibold text-foreground">{selectedApp.jobTitle}</span>
                  </DialogDescription>
                </div>
                {getStatusBadge(selectedApp.status)}
              </div>
            </DialogHeader>

            {/* Candidate Info & Resume Bar */}
            <div className="p-4 rounded-xl border border-border/80 bg-muted/20 space-y-3">
              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-primary" /> {selectedApp.applicant?.email}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" /> Applied on {new Date(selectedApp.createdAt).toLocaleDateString()}
                </span>
              </div>

              {selectedApp.applicant?.username && (
                <div className="pt-1">
                  <a
                    href={`/u/${selectedApp.applicant.username}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
                  >
                    View OneWinq Identity Profile <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}

              {selectedApp.resumeUrl && (
                <div className="pt-2 border-t border-border/60">
                  <a
                    href={selectedApp.resumeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:brightness-105 transition-all shadow-xs"
                  >
                    <FileText className="h-4 w-4" /> View Resume / CV <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </div>

            {/* Cover Letter */}
            {selectedApp.coverLetter && (
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                  Candidate Note / Cover Letter
                </span>
                <div className="p-3.5 rounded-xl border border-border bg-card text-xs leading-relaxed text-foreground whitespace-pre-wrap">
                  {selectedApp.coverLetter}
                </div>
              </div>
            )}

            {/* Pipeline Stage Transition */}
            <div className="p-4 rounded-xl border border-border bg-card space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                Update Pipeline Stage
              </span>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: APPLICATION_STATUS.SCREENING, label: 'Move to Screening' },
                  { key: APPLICATION_STATUS.INTERVIEW, label: 'Invite to Interview' },
                  { key: APPLICATION_STATUS.OFFERED, label: 'Extend Offer' },
                  { key: APPLICATION_STATUS.HIRED, label: 'Mark as Hired' },
                  { key: APPLICATION_STATUS.REJECTED, label: 'Reject' },
                ].map((action) => (
                  <Button
                    key={action.key}
                    size="sm"
                    variant={selectedApp.status === action.key ? 'default' : 'outline'}
                    disabled={updateStatusMutation.isPending}
                    onClick={() =>
                      updateStatusMutation.mutate({
                        appId: selectedApp.id,
                        status: action.key,
                      })
                    }
                    className="text-xs h-8"
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Internal Team Notes */}
            <div className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                Internal Recruiter Notes
              </span>
              <div className="flex gap-2">
                <Input
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add evaluation feedback, interviewer remarks..."
                  className="text-xs h-9"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newNote.trim()) {
                      addNoteMutation.mutate({ appId: selectedApp.id, note: newNote });
                    }
                  }}
                />
                <Button
                  size="sm"
                  disabled={!newNote.trim() || addNoteMutation.isPending}
                  onClick={() => addNoteMutation.mutate({ appId: selectedApp.id, note: newNote })}
                  className="h-9 px-3"
                >
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedApp(null)}>
                Close
              </Button>
            </DialogFooter>
          </div>
        )}
      </Dialog>
    </div>
  );
}
