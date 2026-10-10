import * as React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Building2,
  Users,
  ShieldCheck,
  CreditCard,
  ExternalLink,
  Calendar,
  Sparkles,
  QrCode,
  ArrowRight,
  Search,
  CheckCircle2,
  IdCard,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { organizationsApi } from '@/features/organizations/api/organizations.api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';

interface MemberHubViewProps {
  org: any;
  membership?: any;
}

export const MemberHubView: React.FC<MemberHubViewProps> = ({ org, membership }) => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [colleagueSearch, setColleagueSearch] = React.useState('');

  const orgId = org?.id || org?._id;

  // Fetch colleague directory preview (first 6 colleagues)
  const { data: membersData, isLoading: isLoadingMembers } = useQuery({
    queryKey: ['org', orgId, 'colleagues', colleagueSearch],
    queryFn: () =>
      organizationsApi.listMembers(orgId, {
        q: colleagueSearch || undefined,
        limit: 6,
      }),
    enabled: !!orgId,
  });

  const colleagues = (membersData as any)?.data?.members || [];
  const totalColleagues = (membersData as any)?.data?.pagination?.total ?? org?.membersCount ?? 1;

  // Formatted date
  const joinedDate = membership?.joinedAt
    ? new Date(membership.joinedAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'Recently';

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* 1. Header Banner */}
      <div className="rounded-3xl border border-border/80 bg-gradient-to-r from-card via-card to-primary/5 p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="flex items-center gap-4 relative z-10">
          <div className="h-16 w-16 rounded-2xl bg-white dark:bg-card border border-primary/20 flex items-center justify-center text-primary overflow-hidden shrink-0 p-1.5 shadow-xs">
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
                  <CheckCircle2 className="h-3 w-3 mr-1 inline" /> Verified
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {org.tagline || `${org.type || 'Organization'} Workspace & Team Hub`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto relative z-10">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`/c/${org.slug}`, '_blank')}
            className="flex-1 sm:flex-none shadow-2xs"
          >
            <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
            Public Showcase
          </Button>
          <Button
            size="sm"
            onClick={() => navigate('/app/org/members')}
            className="flex-1 sm:flex-none"
          >
            <Users className="h-4 w-4 mr-1.5" />
            Colleague Directory
          </Button>
        </div>
      </div>

      {/* 2. Main Two-Column Hub: Digital ID Card + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Official Digital Membership Pass (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="overflow-hidden border-primary/20 shadow-lg relative bg-gradient-to-b from-card to-primary/5">
            <div className="h-24 bg-gradient-to-r from-primary/80 via-primary to-primary-700 relative p-4 flex items-start justify-between text-white">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Verified Digital ID
                </span>
              </div>
              <span className="text-[11px] opacity-80 font-mono">
                {membership?.employeeId || org.slug?.toUpperCase()}
              </span>
            </div>

            <div className="px-6 pb-6 pt-0 relative">
              {/* Avatar overlay */}
              <div className="-mt-12 mb-4 flex items-end justify-between">
                <Avatar
                  src={user?.avatarUrl}
                  fallback={user?.displayName || user?.username}
                  className="h-20 w-20 ring-4 ring-card shadow-md"
                />
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 font-semibold px-2.5 py-1">
                  Member
                </Badge>
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-bold text-foreground">
                  {user?.displayName || user?.username}
                </h3>
                <p className="text-sm font-medium text-primary">
                  {membership?.jobTitle || 'Team Member'}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                  <Building2 className="h-3.5 w-3.5" />
                  {org.name}
                </p>
              </div>

              <div className="mt-5 pt-4 border-t border-border/80 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Member Since</span>
                  <span className="font-semibold text-foreground">{joinedDate}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Member ID</span>
                  <span className="font-mono font-semibold text-foreground">
                    {membership?.employeeId || 'OWQ-MBR'}
                  </span>
                </div>
              </div>

              {/* NFC & Physical Tap Info */}
              <div className="mt-5 p-3.5 rounded-2xl bg-muted/50 border border-border flex items-start gap-3">
                <CreditCard className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <span className="font-semibold text-foreground block">
                    NFC Business Card Linked
                  </span>
                  <p className="text-muted-foreground leading-relaxed">
                    You can link your personal NFC cards to this verified organization badge from your Cards Manager.
                  </p>
                  <Button
                    variant="link"
                    size="sm"
                    className="p-0 h-auto text-primary text-xs font-semibold hover:underline mt-1"
                    onClick={() => navigate('/app/cards')}
                  >
                    Configure My Cards <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Colleague Directory & Organization Events (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Colleague Directory Card */}
          <Card padding="md" className="space-y-4">
            <CardHeader className="flex flex-row items-center justify-between pb-1">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" /> Colleague Directory
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {totalColleagues} active members in {org.name}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/app/org/members')}
                className="text-xs text-primary font-semibold"
              >
                View All <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </CardHeader>

            {/* Quick Search */}
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={colleagueSearch}
                onChange={(e) => setColleagueSearch(e.target.value)}
                placeholder="Search colleagues by name or title..."
                className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-muted/40 border border-border focus:border-primary focus:outline-hidden transition-colors"
              />
            </div>

            {/* Colleagues Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {isLoadingMembers ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-16 rounded-xl bg-muted/30 animate-pulse" />
                ))
              ) : colleagues.length === 0 ? (
                <div className="col-span-2 p-6 text-center text-xs text-muted-foreground border border-dashed rounded-xl">
                  No colleagues found matching your query.
                </div>
              ) : (
                colleagues.map((colleague: any) => {
                  const colleagueUser = colleague.user || {};
                  return (
                    <div
                      key={colleague.id}
                      className="flex items-center gap-3 p-3 rounded-xl border border-border/70 bg-card hover:bg-muted/40 transition-colors"
                    >
                      <Avatar
                        src={colleagueUser.avatarUrl}
                        fallback={colleagueUser.displayName || colleagueUser.username}
                        className="h-10 w-10 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <h4 className="font-semibold text-xs text-foreground truncate">
                          {colleagueUser.displayName || colleagueUser.username || 'Member'}
                        </h4>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {colleague.jobTitle || colleague.role?.toLowerCase() || 'Member'}
                        </p>
                      </div>
                      {colleagueUser.username && (
                        <a
                          href={`/u/${colleagueUser.username}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary transition-colors p-1"
                          title="View Profile"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </Card>

          {/* Organization Events & Announcements */}
          <Card padding="md" className="space-y-4">
            <CardHeader className="flex flex-row items-center justify-between pb-1">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" /> Upcoming Company Events
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Workshops, town halls, and gatherings
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/app/org/events')}
                className="text-xs font-semibold"
              >
                Browse Events
              </Button>
            </CardHeader>

            <div className="p-5 rounded-2xl border border-border/80 bg-muted/20 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs font-bold text-foreground block">
                  Digital Event Passes Ready
                </span>
                <p className="text-xs text-muted-foreground">
                  RSVP for upcoming organization events and generate your instant digital ticket pass.
                </p>
              </div>
              <Button
                size="sm"
                variant="default"
                onClick={() => navigate('/app/org/events')}
                className="shrink-0 text-xs"
              >
                View Passes
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
