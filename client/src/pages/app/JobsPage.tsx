import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Briefcase,
  Search,
  Filter,
  MapPin,
  Building2,
  DollarSign,
  Calendar,
  CheckCircle2,
  Send,
  Loader2,
  ArrowRight,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { jobsApi } from '@/features/jobs/api/jobs.api';
import { toast } from '@/stores/toastStore';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog';
import {
  EMPLOYMENT_TYPE,
  WORKPLACE_TYPE,
} from '@/constants/app.constants';
import type { Job } from '@/types/organization.types';

const applySchema = z.object({
  resumeUrl: z.string().trim().url('Please provide a valid URL to your resume/portfolio').or(z.literal('')).optional(),
  coverLetter: z.string().trim().max(3000).optional(),
});

type ApplyFormValues = z.infer<typeof applySchema>;

export default function JobsPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedEmployment, setSelectedEmployment] = React.useState<string>('ALL');
  const [selectedWorkplace, setSelectedWorkplace] = React.useState<string>('ALL');
  const [applyingJob, setApplyingJob] = React.useState<Job | null>(null);

  const { data: jobsData, isLoading } = useQuery({
    queryKey: ['publicJobs', { q: searchQuery, employmentType: selectedEmployment, workplaceType: selectedWorkplace }],
    queryFn: () =>
      jobsApi.listPublicJobs({
        q: searchQuery || undefined,
        employmentType: selectedEmployment === 'ALL' ? undefined : selectedEmployment,
        workplaceType: selectedWorkplace === 'ALL' ? undefined : selectedWorkplace,
        limit: 50,
      }),
  });

  const jobs: Job[] = (jobsData as any)?.data?.jobs || [];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ApplyFormValues>({
    resolver: zodResolver(applySchema),
  });

  const applyMutation = useMutation({
    mutationFn: ({ jobId, values }: { jobId: string; values: ApplyFormValues }) =>
      jobsApi.apply(jobId, {
        resumeUrl: values.resumeUrl || null,
        coverLetter: values.coverLetter || '',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['publicJobs'] });
      queryClient.invalidateQueries({ queryKey: ['myApplications'] });
      setApplyingJob(null);
      reset();
      toast.success('Your application has been submitted successfully!');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to submit application');
    },
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Hero Header */}
      <div className="rounded-2xl border border-border/80 bg-gradient-to-r from-card via-card to-primary/5 p-6 sm:p-8 shadow-xs">
        <div className="max-w-2xl space-y-2">
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 mb-2">
            <Sparkles className="h-3 w-3 mr-1" /> Verified Talent Marketplace
          </Badge>
          <h1 className="text-3xl font-extrabold tracking-tight">Explore Careers & Opportunities</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Discover roles from high-growth startups, colleges, and verified enterprises within the OneWinq ecosystem.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 rounded-2xl border border-border/80 bg-card shadow-xs">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search title, skills, keywords..."
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Employment Type */}
          <select
            value={selectedEmployment}
            onChange={(e) => setSelectedEmployment(e.target.value)}
            className="h-9 px-3 rounded-xl border border-border bg-background text-xs font-medium focus:ring-2 focus:ring-primary/20"
          >
            <option value="ALL">All Employment Types</option>
            <option value={EMPLOYMENT_TYPE.FULL_TIME}>Full Time</option>
            <option value={EMPLOYMENT_TYPE.PART_TIME}>Part Time</option>
            <option value={EMPLOYMENT_TYPE.CONTRACT}>Contract</option>
            <option value={EMPLOYMENT_TYPE.INTERNSHIP}>Internship</option>
          </select>

          {/* Workplace Type */}
          <select
            value={selectedWorkplace}
            onChange={(e) => setSelectedWorkplace(e.target.value)}
            className="h-9 px-3 rounded-xl border border-border bg-background text-xs font-medium focus:ring-2 focus:ring-primary/20"
          >
            <option value="ALL">All Workplaces</option>
            <option value={WORKPLACE_TYPE.REMOTE}>Remote</option>
            <option value={WORKPLACE_TYPE.HYBRID}>Hybrid</option>
            <option value={WORKPLACE_TYPE.ON_SITE}>On-Site</option>
          </select>
        </div>
      </div>

      {/* Jobs Feed */}
      {isLoading ? (
        <div className="flex items-center justify-center p-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : jobs.length === 0 ? (
        <Card className="p-12 text-center">
          <Briefcase className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
          <h3 className="text-base font-semibold">No open positions found</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Try adjusting your search query or filters to discover other opportunities.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {jobs.map((job) => {
            const org = job.organization;
            return (
              <Card
                key={job.id}
                className="hover:border-primary/40 transition-all duration-200 overflow-hidden"
              >
                <div className="p-5 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold overflow-hidden shrink-0">
                      {org?.logoUrl ? (
                        <img src={org.logoUrl} alt={org.name} className="h-full w-full object-cover" />
                      ) : (
                        <Building2 className="h-7 w-7 text-primary/80" />
                      )}
                    </div>

                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-bold tracking-tight text-foreground">
                          {job.title}
                        </h3>
                        <Badge variant="outline" className="text-xs">
                          {job.employmentType.replace('_', ' ')}
                        </Badge>
                        <Badge variant="outline" className="text-xs bg-primary/5 text-primary">
                          {job.workplaceType.replace('_', ' ')}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
                        <span className="text-foreground font-semibold">{org?.name}</span>
                        {org?.isVerified && (
                          <Badge variant="default" className="bg-primary/20 text-primary border-primary/30 text-[10px] py-0">
                            Verified
                          </Badge>
                        )}
                        {job.location?.city && (
                          <span className="text-muted-foreground flex items-center gap-1">
                            • <MapPin className="h-3 w-3" />
                            {job.location.city}
                          </span>
                        )}
                      </div>

                      {job.salary && job.salary.min && job.salary.isDisclosed && (
                        <p className="text-xs font-semibold text-emerald-600 flex items-center gap-1 pt-0.5">
                          <DollarSign className="h-3.5 w-3.5" />
                          {job.salary.currency} {job.salary.min.toLocaleString()}
                          {job.salary.max ? ` - ${job.salary.max.toLocaleString()}` : '+'} /{' '}
                          {job.salary.period?.toLowerCase()}
                        </p>
                      )}

                      <p className="text-xs text-muted-foreground line-clamp-2 pt-1 leading-relaxed">
                        {job.description}
                      </p>

                      {job.skills && job.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-2">
                          {job.skills.map((skill) => (
                            <span
                              key={skill}
                              className="px-2 py-0.5 rounded-md bg-muted text-[11px] font-medium text-muted-foreground"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="self-end md:self-center shrink-0">
                    <Button
                      onClick={() => {
                        setApplyingJob(job);
                        reset();
                      }}
                      className="shadow-sm"
                    >
                      Quick Apply <ArrowRight className="h-4 w-4 ml-1.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Quick Apply Modal */}
      <Dialog
        open={!!applyingJob}
        onOpenChange={(open) => !open && setApplyingJob(null)}
        className="max-w-xl"
      >
        {applyingJob && (
          <form
            onSubmit={handleSubmit((values) =>
              applyMutation.mutate({ jobId: applyingJob.id, values })
            )}
            className="space-y-4"
          >
            <DialogHeader>
              <DialogTitle>Apply for {applyingJob.title}</DialogTitle>
              <DialogDescription>
                at <span className="font-semibold text-foreground">{applyingJob.organization?.name}</span>
              </DialogDescription>
            </DialogHeader>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                Resume / CV Link (URL)
              </label>
              <Input
                {...register('resumeUrl')}
                placeholder="https://drive.google.com/file/... or LinkedIn/GitHub profile"
              />
              {errors.resumeUrl && (
                <p className="text-xs text-destructive mt-1">{errors.resumeUrl.message}</p>
              )}
              <p className="text-[11px] text-muted-foreground mt-1">
                Your OneWinq verified profile information will be shared automatically.
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                Cover Note / Message to Recruiter
              </label>
              <Textarea
                {...register('coverLetter')}
                rows={4}
                placeholder="Introduce yourself, your key achievements, and why you are excited about this role..."
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setApplyingJob(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={applyMutation.isPending}>
                {applyMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" /> Submit Application
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </Dialog>
    </div>
  );
}
