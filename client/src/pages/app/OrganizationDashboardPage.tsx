import * as React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Building2,
  Users,
  Briefcase,
  FileCheck,
  Plus,
  ArrowRight,
  TrendingUp,
  FileText,
  Heart,
  MessageSquare,
  Share2,
  CheckCircle2,
  PenSquare,
} from 'lucide-react';
import { useOrganizationContextStore } from '@/stores/organizationContextStore';
import { useUIStore } from '@/stores/uiStore';
import { organizationsApi } from '@/features/organizations/api/organizations.api';
import { jobsApi } from '@/features/jobs/api/jobs.api';
import { postsApi } from '@/features/posts/api/posts.api';
import { PostCard } from '@/components/posts/PostCard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { MemberHubView } from '@/components/organization/MemberHubView';

export default function OrganizationDashboardPage() {
  const navigate = useNavigate();
  const { openModal } = useUIStore();
  const { activeContext, memberships } = useOrganizationContextStore();

  if (activeContext.type !== 'ORGANIZATION') {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-bold">No Active Organization Selected</h2>
        <p className="text-sm text-muted-foreground mt-1 mb-6">
          Please select an organization from the workspace switcher or create a new one.
        </p>
        <Button onClick={() => navigate('/app/organizations/create')}>
          <Plus className="h-4 w-4 mr-2" />
          Create Organization
        </Button>
      </div>
    );
  }

  const orgId = activeContext.organizationId;
  const role = (activeContext.role || 'MEMBER').toUpperCase();
  const currentMembership = memberships.find((m: any) => m.organization?.id === orgId);

  // Fetch organization details
  const { data: orgData } = useQuery({
    queryKey: ['org', orgId, 'details'],
    queryFn: () => organizationsApi.getById(orgId),
  });
  const org = (orgData as any)?.data?.organization || activeContext;

  // If user joined as regular MEMBER, show the dedicated Member Hub
  if (role === 'MEMBER') {
    return <MemberHubView org={org} membership={currentMembership} />;
  }

  // Fetch jobs
  const { data: jobsData } = useQuery({
    queryKey: ['org', orgId, 'jobs'],
    queryFn: () => jobsApi.listOrgJobs(orgId, { limit: 5 }),
  });
  const jobs = (jobsData as any)?.data?.jobs || [];
  const jobsCount = (jobsData as any)?.data?.pagination?.total ?? org.jobsCount ?? 0;

  // Fetch members
  const { data: membersData } = useQuery({
    queryKey: ['org', orgId, 'members'],
    queryFn: () => organizationsApi.listMembers(orgId, { limit: 5 }),
  });
  const members = (membersData as any)?.data?.members || [];
  const membersCount = (membersData as any)?.data?.pagination?.total ?? org.membersCount ?? 1;

  // Fetch recent applications
  const { data: appsData } = useQuery({
    queryKey: ['org', orgId, 'applications'],
    queryFn: () => jobsApi.listApplications(orgId, { limit: 5 }),
  });
  const applications = (appsData as any)?.data?.applications || [];
  const applicationsCount = (appsData as any)?.data?.pagination?.total ?? 0;

  // Fetch organization posts
  const { data: postsData, refetch: refetchPosts } = useQuery({
    queryKey: ['org', orgId, 'posts'],
    queryFn: () => postsApi.getFeed({ organizationId: orgId }),
  });
  const orgPosts = (postsData as any)?.data?.posts || [];

  // Aggregate post engagement stats (moved from Organization Posts)
  const postStats = React.useMemo(() => {
    const totalPosts = orgPosts.length;
    const totalLikes = orgPosts.reduce((sum: number, p: any) => sum + (p.likesCount || 0), 0);
    const totalComments = orgPosts.reduce((sum: number, p: any) => sum + (p.commentsCount || 0), 0);
    const totalShares = orgPosts.reduce((sum: number, p: any) => sum + (p.sharesCount || 0), 0);
    return { totalPosts, totalLikes, totalComments, totalShares };
  }, [orgPosts]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto text-left">
      {/* Organization Header Banner */}
      <div className="rounded-2xl border border-border/80 bg-gradient-to-r from-card via-card to-primary/5 p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-white dark:bg-card border border-primary/20 flex items-center justify-center text-primary overflow-hidden shrink-0 p-1.5 shadow-2xs">
            {org.logoUrl ? (
              <img src={org.logoUrl} alt={org.name} className="h-full w-full object-contain" />
            ) : (
              <Building2 className="h-8 w-8" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{org.name}</h1>
              {org.isVerified && (
                <Badge variant="default" className="bg-primary/20 text-primary border-primary/30">
                  Verified
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {org.tagline || `${org.type || 'Organization'} Workspace`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => openModal('CREATE_POST')}
            className="flex-1 sm:flex-none shadow-xs"
          >
            <PenSquare className="h-4 w-4 mr-1.5" />
            Share Update
          </Button>
          <Button
            size="sm"
            onClick={() => navigate('/app/org/jobs?action=create')}
            className="flex-1 sm:flex-none shadow-xs"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Post a Job
          </Button>
        </div>
      </div>

      {/* Metrics Row: Workspace Operations */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="hover:border-primary/40 transition-colors">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Team Members
              </p>
              <h3 className="text-2xl font-black mt-1">{membersCount}</h3>
              <Link
                to="/app/org/members"
                className="text-xs text-primary font-medium flex items-center gap-1 mt-2 hover:underline"
              >
                Manage team <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="h-12 w-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <Users className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/40 transition-colors">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Active Job Postings
              </p>
              <h3 className="text-2xl font-black mt-1">{jobsCount}</h3>
              <Link
                to="/app/org/jobs"
                className="text-xs text-primary font-medium flex items-center gap-1 mt-2 hover:underline"
              >
                View postings <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="h-12 w-12 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
              <Briefcase className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/40 transition-colors">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Candidates & Applications
              </p>
              <h3 className="text-2xl font-black mt-1">{applicationsCount}</h3>
              <Link
                to="/app/org/applications"
                className="text-xs text-primary font-medium flex items-center gap-1 mt-2 hover:underline"
              >
                Review applicants <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="h-12 w-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <FileCheck className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Post Engagement Stats (Moved from Organization Posts Page) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-2xl border border-border bg-card p-3.5 sm:p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
            <span>Published Posts</span>
            <FileText className="h-4 w-4 text-primary shrink-0" />
          </div>
          <div className="text-2xl font-extrabold text-foreground tracking-tight">
            {postStats.totalPosts}
          </div>
          <div className="text-[11px] text-muted-foreground flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
            <span>Active on organization feed</span>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-3.5 sm:p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
            <span>Total Reactions</span>
            <Heart className="h-4 w-4 text-rose-500 shrink-0" />
          </div>
          <div className="text-2xl font-extrabold text-foreground tracking-tight">
            {postStats.totalLikes}
          </div>
          <div className="text-[11px] text-muted-foreground flex items-center gap-1">
            <TrendingUp className="h-3 w-3 text-primary" />
            <span>Audience engagement</span>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-3.5 sm:p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
            <span>Total Comments</span>
            <MessageSquare className="h-4 w-4 text-blue-500 shrink-0" />
          </div>
          <div className="text-2xl font-extrabold text-foreground tracking-tight">
            {postStats.totalComments}
          </div>
          <div className="text-[11px] text-muted-foreground">Community discussions</div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-3.5 sm:p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
            <span>Total Shares</span>
            <Share2 className="h-4 w-4 text-amber-500 shrink-0" />
          </div>
          <div className="text-2xl font-extrabold text-foreground tracking-tight">
            {postStats.totalShares}
          </div>
          <div className="text-[11px] text-muted-foreground">Network reach</div>
        </div>
      </div>

      {/* Two Column Layout: Recent Postings & Recent Applicants */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Jobs */}
        <Card padding="md">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-bold">Recent Job Postings</CardTitle>
            <Link to="/app/org/jobs" className="text-xs text-primary font-semibold hover:underline">
              View all
            </Link>
          </CardHeader>
          <div className="space-y-3">
            {jobs.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground border border-dashed rounded-xl">
                No active job postings. Start hiring by creating your first post!
              </div>
            ) : (
              jobs.map((job: any) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between p-3.5 rounded-xl border border-border/70 bg-card hover:bg-muted/40 transition-colors"
                >
                  <div className="min-w-0 pr-3">
                    <h4 className="font-semibold text-sm truncate">{job.title}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {job.workplaceType} • {job.employmentType}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {job.applicationsCount || 0} applicants
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Recent Applicants */}
        <Card padding="md">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-bold">Recent Candidate Applications</CardTitle>
            <Link
              to="/app/org/applications"
              className="text-xs text-primary font-semibold hover:underline"
            >
              View all
            </Link>
          </CardHeader>
          <div className="space-y-3">
            {applications.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground border border-dashed rounded-xl">
                No candidate applications received yet.
              </div>
            ) : (
              applications.map((app: any) => (
                <div
                  key={app.id}
                  className="flex items-center justify-between p-3.5 rounded-xl border border-border/70 bg-card hover:bg-muted/40 transition-colors"
                >
                  <div className="min-w-0 pr-3">
                    <h4 className="font-semibold text-sm truncate">
                      {app.applicant?.displayName || 'Candidate'}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      Applied for {app.jobTitle}
                    </p>
                  </div>
                  <Badge variant="default" className="text-[11px] capitalize">
                    {app.status?.toLowerCase()?.replace('_', ' ')}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Organization Updates & Broadcasts */}
      <Card padding="md" className="space-y-4">
        <CardHeader className="flex flex-row items-center justify-between pb-1">
          <div>
            <CardTitle className="text-base font-bold">
              Organization Updates & Broadcasts
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Official organization updates, announcements, and articles published by {org.name}.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => openModal('CREATE_POST')} className="text-xs">
            <PenSquare className="h-3.5 w-3.5 mr-1.5" /> New Post
          </Button>
        </CardHeader>
        <CardContent>
          {orgPosts.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-muted/20 border border-dashed border-border text-xs text-muted-foreground space-y-3">
              <p>No organization updates published yet. Broadcast milestones, news, or insights to engage your followers!</p>
              <Button size="sm" onClick={() => openModal('CREATE_POST')}>
                Share First Post
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {orgPosts.map((p: any) => (
                <PostCard key={p._id} post={p} onRefresh={() => refetchPosts()} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
