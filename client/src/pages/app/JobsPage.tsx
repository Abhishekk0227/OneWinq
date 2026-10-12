import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useOrganizationContextStore } from '@/stores/organizationContextStore';
import {
  Briefcase,
  Search,
  Filter,
  MapPin,
  Building2,
  Banknote,
  Calendar,
  CheckCircle2,
  Send,
  Loader2,
  ArrowRight,
  ExternalLink,
  Sparkles,
  UploadCloud,
  FileText,
  CheckCircle,
  Trash2,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { jobsApi } from '@/features/jobs/api/jobs.api';
import { mediaApi } from '@/features/media/api/media.api';
import { toast } from '@/stores/toastStore';
import { useAuthStore } from '@/stores/authStore';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog';
import { getCurrencySymbol } from '@/constants/app.constants';
import {
  EMPLOYMENT_TYPE,
  WORKPLACE_TYPE,
} from '@/constants/app.constants';
import type { Job, JobApplication } from '@/types/organization.types';

const applySchema = z.object({
  resumeUrl: z.string().trim().optional(),
  coverLetter: z.string().trim().max(3000).optional(),
});

type ApplyFormValues = z.infer<typeof applySchema>;

export default function JobsPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedEmployment, setSelectedEmployment] = React.useState<string>('ALL');
  const [selectedWorkplace, setSelectedWorkplace] = React.useState<string>('ALL');
  const [applyingJob, setApplyingJob] = React.useState<Job | null>(null);
  const [uploadedResume, setUploadedResume] = React.useState<{ name: string; url: string; size?: number } | null>(null);
  const [isUploadingResume, setIsUploadingResume] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

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

  // Fetch candidate's submitted applications to ensure instantaneous Applied badge synchronization
  const { data: myAppsData } = useQuery({
    queryKey: ['myApplications'],
    queryFn: () => jobsApi.getMyApplications({ limit: 100 }),
  });
  const myApplications: JobApplication[] = (myAppsData as any)?.data?.applications || [];

  const appliedJobIds = React.useMemo(() => {
    const set = new Set<string>();
    jobs.forEach((j) => {
      if (j.hasApplied) set.add(j.id);
    });
    myApplications.forEach((app) => {
      if (app.jobId) set.add(app.jobId);
    });
    return set;
  }, [jobs, myApplications]);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ApplyFormValues>({
    resolver: zodResolver(applySchema),
  });

  const handleResumeFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    if (!validTypes.includes(file.type) && !['pdf', 'doc', 'docx'].includes(fileExt || '')) {
      toast.error('Please upload a PDF, DOC, or DOCX document');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be under 10MB');
      return;
    }

    try {
      setIsUploadingResume(true);
      const result = await mediaApi.uploadFile(file, 'PRIVATE_DOCUMENT');
      setUploadedResume({
        name: file.name,
        url: result.publicUrl,
        size: file.size,
      });
      setValue('resumeUrl', result.publicUrl);
      toast.success('Resume uploaded successfully');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to upload resume document');
    } finally {
      setIsUploadingResume(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const { user } = useAuthStore();

  const applyMutation = useMutation({
    mutationFn: ({ jobId, values }: { jobId: string; values: ApplyFormValues }) =>
      jobsApi.apply(jobId, {
        resumeUrl: values.resumeUrl || uploadedResume?.url || null,
        oneWinqProfileUrl: user?.username ? `/u/${user.username}` : undefined,
        coverLetter: values.coverLetter || '',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['publicJobs'] });
      queryClient.invalidateQueries({ queryKey: ['myApplications'] });
      setApplyingJob(null);
      setUploadedResume(null);
      reset();
      toast.success('Your application has been submitted successfully!');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to submit application');
    },
  });

  const navigate = useNavigate();
  const { activeContext, memberships, switchToOrganization } = useOrganizationContextStore();

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Hero Header */}
      <div className="rounded-2xl border border-border/80 bg-gradient-to-r from-card via-card to-primary/5 p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="max-w-2xl space-y-2">
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 mb-2">
            <Sparkles className="h-3 w-3 mr-1" /> Verified Talent Marketplace
          </Badge>
          <h1 className="text-3xl font-extrabold tracking-tight">Explore Careers & Opportunities</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Discover roles from high-growth startups, colleges, and verified enterprises within the OneWinq ecosystem.
          </p>
        </div>

        <Button
          onClick={() => {
            if (activeContext.type === 'ORGANIZATION') {
              navigate('/app/org/jobs?action=create');
            } else if (memberships.length > 0) {
              const orgId = memberships[0].organization?.id || (memberships[0].organization as any)?._id;
              if (orgId) {
                switchToOrganization(orgId);
                navigate('/app/org/jobs?action=create');
              } else {
                navigate('/app/organizations/create');
              }
            } else {
              navigate('/app/organizations/create');
            }
          }}
          className="shrink-0 bg-primary hover:bg-primary-600 text-white shadow-md font-semibold cursor-pointer"
        >
          <Briefcase className="h-4 w-4 mr-2" />
          Post a Job Opening
        </Button>
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
                        {job.applicationMethod === 'EXTERNAL' ? (
                          <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-600 border-purple-500/20 flex items-center gap-1 font-medium">
                            <ExternalLink className="h-3 w-3" /> External Form
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs bg-sky-500/10 text-sky-600 border-sky-500/20 font-medium">
                            Easy Apply
                          </Badge>
                        )}
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
                        <p className="text-xs font-semibold text-emerald-600 flex items-center gap-1.5 pt-0.5">
                          <Banknote className="h-3.5 w-3.5" />
                          <span>
                            {getCurrencySymbol(job.salary.currency)} {job.salary.min.toLocaleString()}
                            {job.salary.max ? ` - ${job.salary.max.toLocaleString()}` : '+'} /{' '}
                            {job.salary.period?.toLowerCase()}
                          </span>
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
                    {job.hasApplied || appliedJobIds.has(job.id) ? (
                      <Button
                        disabled
                        variant="outline"
                        className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 cursor-default font-semibold shadow-none gap-1.5 h-10 px-4 select-none opacity-90"
                      >
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> Applied
                      </Button>
                    ) : job.applicationMethod === 'EXTERNAL' && job.externalApplyUrl ? (
                      <Button
                        onClick={() => window.open(job.externalApplyUrl!, '_blank', 'noopener,noreferrer')}
                        className="shadow-sm bg-purple-600 hover:bg-purple-700 text-white gap-1.5 h-10 px-4"
                      >
                        Apply via Form <ExternalLink className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        onClick={() => {
                          setApplyingJob(job);
                          setUploadedResume(null);
                          reset();
                        }}
                        className="shadow-sm h-10 px-4"
                      >
                        Quick Apply <ArrowRight className="h-4 w-4 ml-1.5" />
                      </Button>
                    )}
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
        onOpenChange={(open) => {
          if (!open) {
            setApplyingJob(null);
            setUploadedResume(null);
          }
        }}
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

            {/* Candidate OneWinq Profile Showcase */}
            <div className="p-3.5 rounded-xl border border-primary/25 bg-primary/5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-primary" /> Verified OneWinq Profile Attached
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  Auto-Shared
                </span>
              </div>
              <div className="flex items-center gap-3 pt-0.5">
                <Avatar
                  src={user?.avatarUrl}
                  fallback={user?.displayName}
                  alt={user?.displayName}
                  size="md"
                  className="rounded-full ring-2 ring-primary/20 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-sm text-foreground truncate">
                    {user?.displayName}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    @{user?.username} • {user?.headline || 'OneWinq Professional Profile'}
                  </div>
                </div>
                {user?.username && (
                  <a
                    href={`/u/${user.username}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 shrink-0 bg-background px-2.5 py-1.5 rounded-lg border border-border shadow-2xs"
                  >
                    <span>View Profile</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground pt-1.5 border-t border-primary/15">
                Your digital identity, work history, education, verified skills, and NFC card connections are automatically shared with this employer.
              </p>
            </div>

            {/* Resume Upload or Link (Optional) */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                  Resume / CV Document <span className="text-muted-foreground/70 normal-case font-normal">(Optional)</span>
                </label>
                <span className="text-[10px] text-muted-foreground font-medium">Optional</span>
              </div>

              {/* Document File Uploader */}
              <div className="p-3.5 rounded-xl border border-dashed border-border bg-muted/20 space-y-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleResumeFileUpload}
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                />

                {uploadedResume ? (
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-background border border-border">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground truncate max-w-[260px] sm:max-w-[340px]">
                          {uploadedResume.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                          <CheckCircle className="h-3 w-3 text-emerald-500" /> Document ready for submission
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setUploadedResume(null);
                        setValue('resumeUrl', '');
                      }}
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                      title="Remove file"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
                    <div>
                      <span className="text-xs font-medium text-foreground block">
                        Upload your Resume / CV <span className="text-muted-foreground font-normal">(Optional)</span>
                      </span>
                      <span className="text-[11px] text-muted-foreground block">
                        PDF, DOC, DOCX up to 10MB
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isUploadingResume}
                      onClick={() => fileInputRef.current?.click()}
                      className="shrink-0 gap-1.5 text-xs h-8"
                    >
                      {isUploadingResume ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading...
                        </>
                      ) : (
                        <>
                          <UploadCloud className="h-3.5 w-3.5 text-primary" /> Select File
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>

              {/* Or external portfolio / cloud link fallback */}
              <div className="pt-1">
                <span className="text-[11px] text-muted-foreground block mb-1">
                  Or enter link to online portfolio / Google Drive <span className="font-normal">(Optional)</span>:
                </span>
                <Input
                  {...register('resumeUrl')}
                  placeholder="https://drive.google.com/... or portfolio URL (Optional)"
                  className="h-9 text-xs"
                />
              </div>
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
              <Button type="submit" disabled={applyMutation.isPending || isUploadingResume}>
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
