import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase,
  Plus,
  Search,
  MoreVertical,
  Users,
  Eye,
  Calendar,
  DollarSign,
  MapPin,
  Building2,
  Trash2,
  Edit2,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useOrganizationContextStore } from '@/stores/organizationContextStore';
import { jobsApi } from '@/features/jobs/api/jobs.api';
import { organizationsApi } from '@/features/organizations/api/organizations.api';
import { toast } from '@/stores/toastStore';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog';
import {
  JOB_STATUS,
  EMPLOYMENT_TYPE,
  WORKPLACE_TYPE,
} from '@/constants/app.constants';
import type { Job } from '@/types/organization.types';

const jobFormSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(120),
  departmentId: z.string().optional(),
  employmentType: z.enum([
    EMPLOYMENT_TYPE.FULL_TIME,
    EMPLOYMENT_TYPE.PART_TIME,
    EMPLOYMENT_TYPE.CONTRACT,
    EMPLOYMENT_TYPE.INTERNSHIP,
    EMPLOYMENT_TYPE.FREELANCE,
  ]),
  workplaceType: z.enum([
    WORKPLACE_TYPE.ON_SITE,
    WORKPLACE_TYPE.REMOTE,
    WORKPLACE_TYPE.HYBRID,
  ]),
  city: z.string().optional(),
  country: z.string().optional(),
  minSalary: z.preprocess((v) => (v === '' ? undefined : Number(v)), z.number().optional()),
  maxSalary: z.preprocess((v) => (v === '' ? undefined : Number(v)), z.number().optional()),
  currency: z.string().default('USD'),
  period: z.enum(['YEARLY', 'MONTHLY', 'HOURLY']).default('YEARLY'),
  isDisclosed: z.boolean().default(true),
  skills: z.string().optional(), // Comma-delimited
  experienceLevel: z.string().optional(),
  description: z.string().trim().min(20, 'Description must be at least 20 characters'),
  status: z.enum([
    JOB_STATUS.DRAFT,
    JOB_STATUS.PUBLISHED,
    JOB_STATUS.CLOSED,
    JOB_STATUS.ARCHIVED,
  ]).default(JOB_STATUS.PUBLISHED),
});

type JobFormValues = z.infer<typeof jobFormSchema>;

export default function OrganizationJobsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { activeContext } = useOrganizationContextStore();
  const orgId = activeContext.type === 'ORGANIZATION' ? activeContext.organizationId : '';

  const [activeTab, setActiveTab] = React.useState<string>('ALL');
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingJob, setEditingJob] = React.useState<Job | null>(null);

  // Fetch Jobs
  const { data: jobsData, isLoading } = useQuery({
    queryKey: ['org', orgId, 'jobs'],
    queryFn: () => jobsApi.listOrgJobs(orgId, { limit: 50 }),
    enabled: !!orgId,
  });
  const allJobs: Job[] = (jobsData as any)?.data?.jobs || [];

  // Fetch Departments
  const { data: deptData } = useQuery({
    queryKey: ['org', orgId, 'departments'],
    queryFn: () => organizationsApi.listDepartments(orgId),
    enabled: !!orgId,
  });
  const departments = (deptData as any)?.data?.departments || [];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<JobFormValues>({
    resolver: zodResolver(jobFormSchema),
    defaultValues: {
      employmentType: EMPLOYMENT_TYPE.FULL_TIME,
      workplaceType: WORKPLACE_TYPE.REMOTE,
      currency: 'USD',
      period: 'YEARLY',
      isDisclosed: true,
      status: JOB_STATUS.PUBLISHED,
    },
  });

  const handleOpenCreate = () => {
    setEditingJob(null);
    reset({
      title: '',
      departmentId: '',
      employmentType: EMPLOYMENT_TYPE.FULL_TIME,
      workplaceType: WORKPLACE_TYPE.REMOTE,
      city: '',
      country: '',
      minSalary: undefined,
      maxSalary: undefined,
      currency: 'USD',
      period: 'YEARLY',
      isDisclosed: true,
      skills: '',
      experienceLevel: 'Mid-Level',
      description: '',
      status: JOB_STATUS.PUBLISHED,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (job: Job) => {
    setEditingJob(job);
    reset({
      title: job.title,
      departmentId: (job.department as any)?.id || (job.department as any) || '',
      employmentType: job.employmentType,
      workplaceType: job.workplaceType,
      city: job.location?.city || '',
      country: job.location?.country || '',
      minSalary: job.salary?.min ?? undefined,
      maxSalary: job.salary?.max ?? undefined,
      currency: job.salary?.currency || 'USD',
      period: job.salary?.period || 'YEARLY',
      isDisclosed: job.salary?.isDisclosed ?? true,
      skills: (job.skills || []).join(', '),
      experienceLevel: job.experienceLevel || '',
      description: job.description,
      status: job.status,
    });
    setIsModalOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async (data: JobFormValues) => {
      const skillsArray = (data.skills || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const payload: any = {
        title: data.title,
        departmentId: data.departmentId || null,
        employmentType: data.employmentType,
        workplaceType: data.workplaceType,
        location: {
          city: data.city || '',
          country: data.country || '',
          isRemote: data.workplaceType === WORKPLACE_TYPE.REMOTE,
        },
        salary: {
          min: data.minSalary || null,
          max: data.maxSalary || null,
          currency: data.currency,
          period: data.period,
          isDisclosed: data.isDisclosed,
        },
        skills: skillsArray,
        experienceLevel: data.experienceLevel,
        description: data.description,
        status: data.status,
      };

      if (editingJob) {
        return jobsApi.updateOrgJob(orgId, editingJob.id, payload);
      } else {
        return jobsApi.createOrgJob(orgId, payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org', orgId, 'jobs'] });
      setIsModalOpen(false);
      toast.success(editingJob ? 'Job updated successfully' : 'Job published successfully');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to save job');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (jobId: string) => jobsApi.deleteOrgJob(orgId, jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org', orgId, 'jobs'] });
      toast.success('Job removed successfully');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to delete job');
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ jobId, status }: { jobId: string; status: any }) =>
      jobsApi.updateOrgJob(orgId, jobId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org', orgId, 'jobs'] });
      toast.success('Job status updated');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to update status');
    },
  });

  const filteredJobs = allJobs.filter((job) => {
    if (activeTab !== 'ALL' && job.status !== activeTab) {return false;}
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = job.title.toLowerCase().includes(q);
      const matchSkills = (job.skills || []).some((s) => s.toLowerCase().includes(q));
      return matchTitle || matchSkills;
    }
    return true;
  });

  if (!orgId) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-bold">No Organization Selected</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Switch to an organization workspace to view job openings.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Job Openings & Recruitment</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage your open positions, track applicants, and attract world-class talent.
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="shadow-sm">
          <Plus className="h-4 w-4 mr-2" /> Post New Job
        </Button>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-xl w-full sm:w-auto">
          {['ALL', JOB_STATUS.PUBLISHED, JOB_STATUS.DRAFT, JOB_STATUS.CLOSED].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all capitalize ${
                activeTab === tab
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.toLowerCase()}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search roles or skills..."
            className="pl-9 h-9 text-xs"
          />
        </div>
      </div>

      {/* Jobs Listing */}
      {isLoading ? (
        <div className="flex items-center justify-center p-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredJobs.length === 0 ? (
        <Card className="p-12 text-center">
          <Briefcase className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
          <h3 className="text-base font-semibold">No job postings found</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-6">
            {searchQuery
              ? 'Try modifying your search criteria or filter.'
              : 'Create your first vacancy to start receiving qualified applicants.'}
          </p>
          <Button onClick={handleOpenCreate} variant="outline">
            <Plus className="h-4 w-4 mr-2" /> Post a Job Now
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredJobs.map((job) => {
            const isPublished = job.status === JOB_STATUS.PUBLISHED;
            return (
              <Card
                key={job.id}
                className="hover:border-primary/40 transition-all duration-200 overflow-hidden"
              >
                <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-bold tracking-tight text-foreground">
                        {job.title}
                      </h3>
                      <Badge
                        variant={isPublished ? 'default' : 'outline'}
                        className={
                          isPublished
                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                            : job.status === JOB_STATUS.DRAFT
                            ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                            : 'bg-muted text-muted-foreground'
                        }
                      >
                        {job.status}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {job.employmentType.replace('_', ' ')}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {job.workplaceType.replace('_', ' ')}
                      </Badge>
                      {job.department && (
                        <Badge variant="outline" className="text-xs bg-primary/5 text-primary">
                          {job.department.name}
                        </Badge>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                      {job.location?.city && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {job.location.city}
                          {job.location.country ? `, ${job.location.country}` : ''}
                        </span>
                      )}
                      {job.salary && job.salary.min && job.salary.isDisclosed && (
                        <span className="flex items-center gap-1 font-semibold text-foreground">
                          <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
                          {job.salary.currency}{' '}
                          {job.salary.min.toLocaleString()}
                          {job.salary.max ? ` - ${job.salary.max.toLocaleString()}` : '+'} /{' '}
                          {job.salary.period?.toLowerCase()}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        Posted {new Date(job.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    {job.skills && job.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
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

                  {/* Metrics & Actions */}
                  <div className="flex items-center justify-between md:justify-end gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-border">
                    <button
                      onClick={() => navigate(`/app/org/applications?jobId=${job.id}`)}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <Users className="h-4 w-4" />
                      <span>{job.applicationsCount ?? 0} Applicants</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEdit(job)}
                        className="h-8 w-8 p-0"
                        title="Edit Job"
                      >
                        <Edit2 className="h-4 w-4 text-muted-foreground" />
                      </Button>

                      {isPublished ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            updateStatusMutation.mutate({ jobId: job.id, status: JOB_STATUS.CLOSED })
                          }
                          className="h-8 w-8 p-0 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                          title="Close Job"
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            updateStatusMutation.mutate({
                              jobId: job.id,
                              status: JOB_STATUS.PUBLISHED,
                            })
                          }
                          className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                          title="Publish Job"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete the job "${job.title}"?`)) {
                            deleteMutation.mutate(job.id);
                          }
                        }}
                        className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                        title="Delete Job"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create / Edit Job Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen} className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editingJob ? 'Edit Job Opening' : 'Post New Job'}</DialogTitle>
          <DialogDescription>
            Provide details about the role, workplace environment, and compensation.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit((data) => saveMutation.mutate(data))} className="space-y-4 pt-2">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
              Job Title *
            </label>
            <Input {...register('title')} placeholder="e.g. Senior Backend Engineer" />
            {errors.title && <p className="text-xs text-destructive mt-1">{errors.title.message}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                Department
              </label>
              <select
                {...register('departmentId')}
                className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">No Department</option>
                {departments.map((d: any) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                Employment Type *
              </label>
              <select
                {...register('employmentType')}
                className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value={EMPLOYMENT_TYPE.FULL_TIME}>Full Time</option>
                <option value={EMPLOYMENT_TYPE.PART_TIME}>Part Time</option>
                <option value={EMPLOYMENT_TYPE.CONTRACT}>Contract</option>
                <option value={EMPLOYMENT_TYPE.INTERNSHIP}>Internship</option>
                <option value={EMPLOYMENT_TYPE.FREELANCE}>Freelance</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                Workplace Type *
              </label>
              <select
                {...register('workplaceType')}
                className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value={WORKPLACE_TYPE.REMOTE}>Remote</option>
                <option value={WORKPLACE_TYPE.HYBRID}>Hybrid</option>
                <option value={WORKPLACE_TYPE.ON_SITE}>On-Site</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                City / Location
              </label>
              <Input {...register('city')} placeholder="San Francisco or Global" />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                Experience Level
              </label>
              <Input {...register('experienceLevel')} placeholder="Mid-Senior, 4+ years" />
            </div>
          </div>

          {/* Compensation */}
          <div className="p-3.5 rounded-xl border border-border/80 bg-muted/20 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Compensation Range
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] text-muted-foreground block mb-1">Min Salary</label>
                <Input {...register('minSalary')} type="number" placeholder="80000" />
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground block mb-1">Max Salary</label>
                <Input {...register('maxSalary')} type="number" placeholder="130000" />
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground block mb-1">Currency & Period</label>
                <div className="flex gap-2">
                  <Input {...register('currency')} className="w-20" placeholder="USD" />
                  <select
                    {...register('period')}
                    className="flex-1 h-10 px-2 rounded-xl border border-border bg-background text-xs"
                  >
                    <option value="YEARLY">Yearly</option>
                    <option value="MONTHLY">Monthly</option>
                    <option value="HOURLY">Hourly</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
              Required Skills (comma separated)
            </label>
            <Input {...register('skills')} placeholder="React, Node.js, MongoDB, TypeScript" />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
              Job Description & Responsibilities *
            </label>
            <Textarea
              {...register('description')}
              rows={5}
              placeholder="Outline responsibilities, requirements, benefits, and team vision..."
            />
            {errors.description && (
              <p className="text-xs text-destructive mt-1">{errors.description.message}</p>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
              Publishing Status
            </label>
            <select
              {...register('status')}
              className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value={JOB_STATUS.PUBLISHED}>Published (Live immediately)</option>
              <option value={JOB_STATUS.DRAFT}>Draft (Save for later review)</option>
              <option value={JOB_STATUS.CLOSED}>Closed</option>
            </select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...
                </>
              ) : (
                'Save Vacancy'
              )}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  );
}
