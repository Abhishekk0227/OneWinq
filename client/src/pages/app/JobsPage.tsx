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
  Clock,
  CheckCircle2,
  Send,
  Loader2,
  ArrowRight,
  ExternalLink,
  UploadCloud,
  FileText,
  CheckCircle,
  Trash2,
  ChevronDown,
  Lock,
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
  const [viewingJobDetails, setViewingJobDetails] = React.useState<Job | null>(null);
  const [expandedJobDescId, setExpandedJobDescId] = React.useState<string | null>(null);
  const [uploadedResume, setUploadedResume] = React.useState<{ name: string; url: string; size?: number } | null>(null);
  const [isUploadingResume, setIsUploadingResume] = React.useState(false);
  const [shareProfile, setShareProfile] = React.useState<boolean>(true);
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
    mutationFn: ({
      jobId,
      values,
    }: {
      jobId: string;
      values: ApplyFormValues & { shareProfile?: boolean; oneWinqProfileUrl?: string | null };
    }) =>
      jobsApi.apply(jobId, {
        resumeUrl: values.resumeUrl || uploadedResume?.url || null,
        shareProfile: values.shareProfile,
        oneWinqProfileUrl: values.oneWinqProfileUrl,
        coverLetter: values.coverLetter || '',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['publicJobs'] });
      queryClient.invalidateQueries({ queryKey: ['myApplications'] });
      setApplyingJob(null);
      setUploadedResume(null);
      setShareProfile(true);
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
    <div className="space-y-4 max-w-5xl mx-auto pb-12">
      {/* Section Header */}
      <div className="space-y-0.5 text-left">
        <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
          Jobs & Opportunities
        </h1>
        <p className="text-xs text-muted-foreground">
          Explore and apply to verified career opportunities and internships across the network.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 sm:p-3.5 rounded-2xl border border-border/80 bg-card shadow-xs">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search title, skills, keywords..."
            className="pl-10 h-10 text-xs sm:text-sm rounded-xl"
          />
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
          {/* Employment Type */}
          <div className="relative flex-1 sm:flex-initial min-w-0">
            <select
              value={selectedEmployment}
              onChange={(e) => setSelectedEmployment(e.target.value)}
              className="w-full sm:w-48 h-10 pl-3.5 pr-8 rounded-xl border border-border/80 bg-background hover:bg-muted/40 text-xs sm:text-sm font-medium text-foreground appearance-none cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-primary/20 transition-all shadow-2xs"
            >
              <option value="ALL">All Employment Types</option>
              <option value={EMPLOYMENT_TYPE.FULL_TIME}>Full Time</option>
              <option value={EMPLOYMENT_TYPE.PART_TIME}>Part Time</option>
              <option value={EMPLOYMENT_TYPE.CONTRACT}>Contract</option>
              <option value={EMPLOYMENT_TYPE.INTERNSHIP}>Internship</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          </div>

          {/* Workplace Type */}
          <div className="relative flex-1 sm:flex-initial min-w-0">
            <select
              value={selectedWorkplace}
              onChange={(e) => setSelectedWorkplace(e.target.value)}
              className="w-full sm:w-44 h-10 pl-3.5 pr-8 rounded-xl border border-border/80 bg-background hover:bg-muted/40 text-xs sm:text-sm font-medium text-foreground appearance-none cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-primary/20 transition-all shadow-2xs"
            >
              <option value="ALL">All Workplaces</option>
              <option value={WORKPLACE_TYPE.REMOTE}>Remote</option>
              <option value={WORKPLACE_TYPE.HYBRID}>Hybrid</option>
              <option value={WORKPLACE_TYPE.ON_SITE}>On-Site</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          </div>
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
        <div className="grid grid-cols-1 gap-2.5">
          {jobs.map((job) => {
            const org = job.organization;
            return (
              <Card
                key={job.id}
                className="hover:border-primary/40 transition-all duration-200 overflow-hidden shadow-xs"
              >
                <div className="p-3.5 sm:p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sm:gap-4">
                  <div className="flex items-start gap-3 sm:gap-3.5 flex-1 min-w-0">
                    <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-muted/40 border border-border/80 flex items-center justify-center text-primary font-bold overflow-hidden shrink-0 p-1">
                      {org?.logoUrl ? (
                        <img src={org.logoUrl} alt={org.name} className="h-full w-full object-contain max-h-full max-w-full block" />
                      ) : (
                        <Building2 className="h-5 w-5 text-primary/80" />
                      )}
                    </div>

                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <h3 className="text-sm sm:text-base font-bold tracking-tight text-foreground">
                          {job.title}
                        </h3>
                        <Badge variant="outline" className="text-[10px] sm:text-[11px] py-0 px-2 font-medium">
                          {job.employmentType.replace('_', ' ')}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] sm:text-[11px] py-0 px-2 bg-primary/5 text-primary font-medium">
                          {job.workplaceType.replace('_', ' ')}
                        </Badge>
                        {job.applicationMethod === 'EXTERNAL' ? (
                          <Badge variant="outline" className="text-[10px] sm:text-[11px] py-0 px-2 bg-purple-500/10 text-purple-600 border-purple-500/20 flex items-center gap-1 font-medium">
                            <ExternalLink className="h-2.5 w-2.5" /> External Form
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] sm:text-[11px] py-0 px-2 bg-sky-500/10 text-sky-600 border-sky-500/20 font-medium">
                            Easy Apply
                          </Badge>
                        )}
                        {job.expiresAt ? (
                          <Badge variant="outline" className="text-[10px] sm:text-[11px] py-0 px-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25 flex items-center gap-1 font-semibold">
                            <Calendar className="h-2.5 w-2.5" /> Closes: {new Date(job.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] sm:text-[11px] py-0 px-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25 flex items-center gap-1 font-medium">
                            <Clock className="h-2.5 w-2.5" /> Open
                          </Badge>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
                        <span className="text-foreground font-semibold">{org?.name}</span>
                        {org?.isVerified && (
                          <Badge variant="default" className="bg-primary/20 text-primary border-primary/30 text-[9px] py-0 px-1.5">
                            Verified
                          </Badge>
                        )}
                        {job.location?.city && (
                          <span className="text-muted-foreground flex items-center gap-1">
                            • <MapPin className="h-3 w-3" />
                            {job.location.city}
                          </span>
                        )}
                        {job.salary && job.salary.min && job.salary.isDisclosed && (
                          <span className="text-emerald-600 font-semibold flex items-center gap-1">
                            • <Banknote className="h-3 w-3" />
                            {getCurrencySymbol(job.salary.currency)} {job.salary.min.toLocaleString()}
                            {job.salary.max ? ` - ${job.salary.max.toLocaleString()}` : '+'} /{' '}
                            {job.salary.period?.toLowerCase()}
                          </span>
                        )}
                        {job.expiresAt && (
                          <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                            • <Clock className="h-3 w-3" />
                            Deadline: {new Date(job.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        )}
                      </div>

                      {job.description && (
                        <div className="space-y-1 pt-0.5">
                          <p className={cn(
                            "text-xs text-muted-foreground leading-relaxed whitespace-pre-line",
                            expandedJobDescId === job.id ? "" : "line-clamp-2"
                          )}>
                            {job.description}
                          </p>
                          <div className="flex items-center gap-3">
                            {job.description.length > 110 && (
                              <button
                                type="button"
                                onClick={() => setExpandedJobDescId(expandedJobDescId === job.id ? null : job.id)}
                                className="text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                              >
                                {expandedJobDescId === job.id ? 'Show less' : 'Read more'}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setViewingJobDetails(job)}
                              className="text-[11px] font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
                            >
                              View full details <ArrowRight className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        </div>
                      )}

                      {job.skills && job.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {job.skills.map((skill) => (
                            <span
                              key={skill}
                              className="px-2 py-0.5 rounded-md bg-muted/70 text-[10px] sm:text-[11px] font-medium text-muted-foreground"
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
                        className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 cursor-default font-semibold shadow-none gap-1.5 h-8.5 px-3.5 text-xs select-none opacity-90"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> Applied
                      </Button>
                    ) : job.applicationMethod === 'EXTERNAL' && job.externalApplyUrl ? (
                      <Button
                        onClick={() => window.open(job.externalApplyUrl!, '_blank', 'noopener,noreferrer')}
                        className="shadow-xs bg-purple-600 hover:bg-purple-700 text-white gap-1.5 h-8.5 px-3.5 text-xs font-semibold"
                      >
                        Apply via Form <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    ) : (
                      <Button
                        onClick={() => {
                          setApplyingJob(job);
                          setUploadedResume(null);
                          reset();
                        }}
                        className="shadow-xs h-8.5 px-3.5 text-xs font-semibold"
                      >
                        Quick Apply <ArrowRight className="h-3.5 w-3.5 ml-1" />
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
            setShareProfile(true);
          }
        }}
        className="max-w-xl"
      >
        {applyingJob && (
          <form
            onSubmit={handleSubmit((values) => {
              const resume = values.resumeUrl || uploadedResume?.url;
              if (!shareProfile && !resume) {
                toast.error('Please upload your Resume or provide a document link when keeping your profile private.');
                return;
              }
              applyMutation.mutate({
                jobId: applyingJob.id,
                values: {
                  ...values,
                  resumeUrl: resume || null,
                  shareProfile,
                  oneWinqProfileUrl: shareProfile && user?.username ? `/u/${user.username}` : null,
                },
              });
            })}
            className="space-y-4"
          >
            <DialogHeader>
              <DialogTitle>Apply for {applyingJob.title}</DialogTitle>
              <DialogDescription>
                at <span className="font-semibold text-foreground">{applyingJob.organization?.name}</span>
                {applyingJob.expiresAt && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 font-semibold ml-2">
                    • <Calendar className="h-3 w-3" /> Last Date: {new Date(applyingJob.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>

            {/* Quick Job Overview Box */}
            <div className="p-3 rounded-xl bg-muted/40 border border-border/70 space-y-1">
              <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                <span>Role Summary</span>
                <span className="text-[11px] font-normal text-muted-foreground">
                  {applyingJob.employmentType.replace('_', ' ')} • {applyingJob.workplaceType.replace('_', ' ')}
                </span>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed whitespace-pre-line">
                {applyingJob.description}
              </p>
            </div>

            {/* Candidate Profile Sharing & Privacy Selection */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                Profile & Identity Sharing Preference
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Option 1: Attach OneWinq Profile */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setShareProfile(true)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setShareProfile(true); }}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between text-left ${
                    shareProfile
                      ? 'border-primary bg-primary/5 shadow-2xs ring-1 ring-primary/20'
                      : 'border-border bg-card hover:bg-muted/30 text-muted-foreground'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg ${shareProfile ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                        <CheckCircle2 className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-foreground">Share OneWinq Profile</div>
                        <div className="text-[10px] text-muted-foreground">Attach public profile & experience</div>
                      </div>
                    </div>
                    <div className={`h-4 w-4 rounded-full border flex items-center justify-center shrink-0 ${shareProfile ? 'border-primary bg-primary text-white' : 'border-border'}`}>
                      {shareProfile && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                    </div>
                  </div>
                </div>

                {/* Option 2: Apply with Resume Only */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setShareProfile(false)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setShareProfile(false); }}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between text-left ${
                    !shareProfile
                      ? 'border-primary bg-primary/5 shadow-2xs ring-1 ring-primary/20'
                      : 'border-border bg-card hover:bg-muted/30 text-muted-foreground'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg ${!shareProfile ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                        <Lock className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-foreground">Resume Only (Private)</div>
                        <div className="text-[10px] text-muted-foreground">Do not attach OneWinq profile</div>
                      </div>
                    </div>
                    <div className={`h-4 w-4 rounded-full border flex items-center justify-center shrink-0 ${!shareProfile ? 'border-primary bg-primary text-white' : 'border-border'}`}>
                      {!shareProfile && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                    </div>
                  </div>
                </div>
              </div>

              {/* Dynamic details for the selected mode */}
              {shareProfile ? (
                <div className="p-3.5 rounded-xl border border-primary/25 bg-primary/5 space-y-2.5 mt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-primary" /> Verified OneWinq Profile Attached
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${user?.appearInDiscovery === false ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-primary/10 text-primary'}`}>
                      {user?.appearInDiscovery === false ? 'Private Account (Shared for this Job)' : 'Public Profile Attached'}
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
                        <span>Preview</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                  {user?.appearInDiscovery === false && (
                    <div className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-500/10 p-2 rounded-lg flex items-center gap-1.5">
                      <Lock className="h-3.5 w-3.5 shrink-0" />
                      <span>Note: Your account is in Private Discovery mode. Selecting this option grants only this employer access to review your verified profile.</span>
                    </div>
                  )}
                  <p className="text-[11px] text-muted-foreground pt-1 border-t border-primary/15">
                    Your public OneWinq profile (work experience, education, and skills) will be shared with this employer.
                  </p>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl border border-border bg-muted/30 space-y-1.5 mt-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                    <Lock className="h-3.5 w-3.5 text-primary" />
                    <span>Profile Kept Completely Private</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Your OneWinq profile link and network connections will NOT be shared. The employer will only review your uploaded resume document and name/email.
                  </p>
                </div>
              )}
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

      {/* Full Job Details Modal */}
      <Dialog
        open={!!viewingJobDetails}
        onOpenChange={(open) => {
          if (!open) setViewingJobDetails(null);
        }}
        className="max-w-2xl max-h-[90vh] flex flex-col"
      >
        {viewingJobDetails && (
          <div className="space-y-4 flex flex-col min-h-0">
            <DialogHeader>
              <div className="flex items-start gap-3">
                <div className="h-12 w-12 rounded-xl bg-muted/40 border border-border/80 flex items-center justify-center text-primary font-bold overflow-hidden shrink-0 p-1">
                  {viewingJobDetails.organization?.logoUrl ? (
                    <img
                      src={viewingJobDetails.organization.logoUrl}
                      alt={viewingJobDetails.organization.name}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <Building2 className="h-6 w-6 text-primary/80" />
                  )}
                </div>
                <div className="space-y-1 min-w-0 flex-1">
                  <DialogTitle className="text-lg font-bold">
                    {viewingJobDetails.title}
                  </DialogTitle>
                  <DialogDescription className="text-xs flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-foreground">{viewingJobDetails.organization?.name}</span>
                    {viewingJobDetails.location?.city && (
                      <span className="text-muted-foreground flex items-center gap-1">
                        • <MapPin className="h-3 w-3" /> {viewingJobDetails.location.city}
                      </span>
                    )}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {/* Badges / Highlights */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Badge variant="outline" className="py-0.5 px-2 font-medium">
                {viewingJobDetails.employmentType.replace('_', ' ')}
              </Badge>
              <Badge variant="outline" className="py-0.5 px-2 bg-primary/5 text-primary font-medium">
                {viewingJobDetails.workplaceType.replace('_', ' ')}
              </Badge>
              {viewingJobDetails.salary && viewingJobDetails.salary.min && viewingJobDetails.salary.isDisclosed && (
                <Badge variant="outline" className="py-0.5 px-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-semibold flex items-center gap-1">
                  <Banknote className="h-3 w-3" />
                  {getCurrencySymbol(viewingJobDetails.salary.currency)} {viewingJobDetails.salary.min.toLocaleString()}
                  {viewingJobDetails.salary.max ? ` - ${viewingJobDetails.salary.max.toLocaleString()}` : '+'} / {viewingJobDetails.salary.period?.toLowerCase()}
                </Badge>
              )}
              {viewingJobDetails.expiresAt ? (
                <Badge variant="outline" className="py-0.5 px-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25 flex items-center gap-1 font-semibold">
                  <Calendar className="h-3 w-3" /> Last Date: {new Date(viewingJobDetails.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </Badge>
              ) : (
                <Badge variant="outline" className="py-0.5 px-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 flex items-center gap-1 font-medium">
                  <Clock className="h-3 w-3" /> Open Applications
                </Badge>
              )}
            </div>

            {/* Scrollable Description Body */}
            <div className="space-y-3 overflow-y-auto max-h-[45vh] pr-1 py-1 custom-scrollbar">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Job Description & Responsibilities
                </h4>
                <div className="text-xs text-foreground/90 whitespace-pre-line leading-relaxed bg-muted/20 p-3.5 rounded-xl border border-border/60">
                  {viewingJobDetails.description}
                </div>
              </div>

              {viewingJobDetails.skills && viewingJobDetails.skills.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Required Skills
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {viewingJobDetails.skills.map((skill) => (
                      <span
                        key={skill}
                        className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary border border-primary/20 text-xs font-medium"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="pt-2 border-t border-border/60 flex items-center justify-between sm:justify-end gap-2">
              <Button variant="outline" onClick={() => setViewingJobDetails(null)}>
                Close
              </Button>
              {viewingJobDetails.hasApplied || appliedJobIds.has(viewingJobDetails.id) ? (
                <Button disabled variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 font-semibold gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Already Applied
                </Button>
              ) : viewingJobDetails.applicationMethod === 'EXTERNAL' && viewingJobDetails.externalApplyUrl ? (
                <Button
                  onClick={() => window.open(viewingJobDetails.externalApplyUrl!, '_blank', 'noopener,noreferrer')}
                  className="bg-purple-600 hover:bg-purple-700 text-white gap-1.5 font-semibold"
                >
                  Apply via External Form <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    const job = viewingJobDetails;
                    setViewingJobDetails(null);
                    setApplyingJob(job);
                    setUploadedResume(null);
                    reset();
                  }}
                  className="gap-1.5 font-semibold"
                >
                  Apply Now <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              )}
            </DialogFooter>
          </div>
        )}
      </Dialog>
    </div>
  );
}
