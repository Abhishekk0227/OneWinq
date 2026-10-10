import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import {
  Users,
  UserPlus,
  Mail,
  Shield,
  Search,
  Trash2,
  Building2,
  Copy,
  Check,
  Loader2,
  Network,
  Edit2,
  Crown,
  Sparkles,
  RefreshCw,
  Ban,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Send,
  X,
  ExternalLink,
} from 'lucide-react';
import { useOrganizationContextStore } from '@/stores/organizationContextStore';
import { organizationsApi } from '@/features/organizations/api/organizations.api';
import { toast } from '@/stores/toastStore';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { ORGANIZATION_ROLE } from '@/constants/app.constants';
import type { Department, OrganizationMember, OrganizationInvitationItem } from '@/types/organization.types';

const EXECUTIVE_POSITIONS = [
  { value: 'CEO', label: 'CEO (Chief Executive Officer)' },
  { value: 'FOUNDER', label: 'Founder' },
  { value: 'CO_FOUNDER', label: 'Co-Founder' },
  { value: 'MANAGING_DIRECTOR', label: 'Managing Director' },
  { value: 'DIRECTOR', label: 'Director' },
  { value: 'CHAIRMAN', label: 'Chairman of the Board' },
  { value: 'PRESIDENT', label: 'President' },
  { value: 'VICE_PRESIDENT', label: 'Vice President' },
  { value: 'CTO', label: 'CTO (Chief Technology Officer)' },
  { value: 'COO', label: 'COO (Chief Operating Officer)' },
  { value: 'CFO', label: 'CFO (Chief Financial Officer)' },
  { value: 'DEAN', label: 'Dean (Academic / Institution)' },
  { value: 'PRINCIPAL', label: 'Principal (Educational)' },
  { value: 'MEDICAL_DIRECTOR', label: 'Medical Director (Healthcare)' },
  { value: 'OTHER', label: 'Other Executive Leadership' },
];

export default function OrganizationMembersPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const deptQueryParam = searchParams.get('dept') || 'ALL';

  const { activeContext } = useOrganizationContextStore();
  const [activeTab, setActiveTab] = React.useState<'WORKFORCE' | 'INVITATIONS'>('WORKFORCE');

  // Active workforce filters
  const [search, setSearch] = React.useState('');
  const [selectedDeptId, setSelectedDeptId] = React.useState<string>(deptQueryParam);
  const [executiveFilter, setExecutiveFilter] = React.useState<'ALL' | 'EXECUTIVES' | 'STANDARD'>('ALL');

  // Invitations filters
  const [inviteSearch, setInviteSearch] = React.useState('');
  const [inviteStatusFilter, setInviteStatusFilter] = React.useState<string>('ALL');

  // Invite Member Modal State
  const [isInviteOpen, setIsInviteOpen] = React.useState(false);
  const [inviteEmail, setInviteEmail] = React.useState('');
  const [inviteRole, setInviteRole] = React.useState<string>(ORGANIZATION_ROLE.MEMBER);
  const [inviteTitle, setInviteTitle] = React.useState('');
  const [inviteDeptId, setInviteDeptId] = React.useState<string>('');
  const [isInviting, setIsInviting] = React.useState(false);

  // Edit Member Modal State
  const [editingMember, setEditingMember] = React.useState<OrganizationMember | null>(null);
  const [editRole, setEditRole] = React.useState<string>('');
  const [editTitle, setEditTitle] = React.useState<string>('');
  const [editDeptId, setEditDeptId] = React.useState<string>('');
  const [editIsExecutive, setEditIsExecutive] = React.useState<boolean>(false);
  const [editExecutivePosition, setEditExecutivePosition] = React.useState<string>('CEO');
  const [editExecutiveOrder, setEditExecutiveOrder] = React.useState<number>(0);
  const [isSavingEdit, setIsSavingEdit] = React.useState(false);

  const [lastInviteLink, setLastInviteLink] = React.useState<string | null>(null);
  const [copiedLink, setCopiedLink] = React.useState(false);

  // Action pending states for invitations
  const [resendingId, setResendingId] = React.useState<string | null>(null);
  const [revokingId, setRevokingId] = React.useState<string | null>(null);

  if (activeContext.type !== 'ORGANIZATION') {
    return <div className="p-8 text-center text-muted-foreground">Select an organization first</div>;
  }

  const userRole = (activeContext.role || 'MEMBER').toUpperCase();
  const permissions = activeContext.permissions || [];
  const isOwner = userRole === 'OWNER';
  const isAdmin = isOwner || userRole === 'ADMIN';
  const isHR = isAdmin || userRole === 'HR_MANAGER';
  const canInvite = isHR || isOwner || permissions.includes('members:invite');
  const canEditMember = isAdmin || isOwner || permissions.includes('members:edit');
  const canRemoveMember = isAdmin || isOwner || permissions.includes('members:remove');
  const isMemberOnly = !canInvite && !canEditMember && !canRemoveMember;

  const orgId = activeContext.organizationId;

  // Fetch departments for dropdowns & filters
  const { data: deptData } = useQuery({
    queryKey: ['org', orgId, 'departments'],
    queryFn: () => organizationsApi.listDepartments(orgId),
    enabled: !!orgId,
  });
  const departments: Department[] = (deptData as any)?.data?.departments || [];

  // Fetch active members
  const { data, isLoading } = useQuery({
    queryKey: ['org', orgId, 'members', search, selectedDeptId],
    queryFn: () =>
      organizationsApi.listMembers(orgId, {
        q: search || undefined,
        departmentId: selectedDeptId !== 'ALL' && selectedDeptId !== 'UNASSIGNED' ? selectedDeptId : undefined,
      }),
    enabled: !!orgId,
  });

  let rawMembers: OrganizationMember[] = (data as any)?.data?.members || [];
  if (selectedDeptId === 'UNASSIGNED') {
    rawMembers = rawMembers.filter((m) => !m.department);
  }
  if (executiveFilter === 'EXECUTIVES') {
    rawMembers = rawMembers.filter((m) => Boolean(m.isExecutive));
  } else if (executiveFilter === 'STANDARD') {
    rawMembers = rawMembers.filter((m) => !m.isExecutive);
  }
  const members = rawMembers;

  // Fetch invitations
  const { data: inviteData, isLoading: isLoadingInvites } = useQuery({
    queryKey: ['org', orgId, 'invitations', inviteSearch, inviteStatusFilter],
    queryFn: () =>
      organizationsApi.listInvitations(orgId, {
        q: inviteSearch || undefined,
        status: inviteStatusFilter !== 'ALL' ? inviteStatusFilter : undefined,
      }),
    enabled: !!orgId,
  });

  const invitations: OrganizationInvitationItem[] = (inviteData as any)?.data?.invitations || [];
  const pendingInvitesCount = invitations.filter((i) => i.status === 'PENDING').length;

  const handleOpenInvite = () => {
    setLastInviteLink(null);
    setInviteEmail('');
    setInviteTitle('');
    setInviteRole(ORGANIZATION_ROLE.MEMBER);
    setInviteDeptId(selectedDeptId !== 'ALL' && selectedDeptId !== 'UNASSIGNED' ? selectedDeptId : '');
    setIsInviteOpen(true);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    try {
      setIsInviting(true);
      const res: any = await organizationsApi.inviteMember(orgId, {
        email: inviteEmail.trim(),
        role: inviteRole,
        jobTitle: inviteTitle.trim(),
        departmentId: inviteDeptId || undefined,
      });
      const generatedLink = res?.data?.inviteLink || res?.inviteLink;
      if (generatedLink) {
        setLastInviteLink(generatedLink);
      } else {
        setIsInviteOpen(false);
      }
      toast.success('Invitation dispatched successfully!');
      setInviteEmail('');
      setInviteTitle('');
      queryClient.invalidateQueries({ queryKey: ['org', orgId, 'members'] });
      queryClient.invalidateQueries({ queryKey: ['org', orgId, 'invitations'] });
      queryClient.invalidateQueries({ queryKey: ['org', orgId, 'departments'] });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to send invitation');
    } finally {
      setIsInviting(false);
    }
  };

  const handleCopyLink = (linkToCopy?: string) => {
    const link = linkToCopy || lastInviteLink;
    if (!link) return;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    toast.success('Invitation link copied to clipboard!');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleOpenEdit = (member: OrganizationMember) => {
    setEditingMember(member);
    setEditRole(member.role);
    setEditTitle(member.jobTitle || '');
    setEditDeptId(member.department?.id || '');
    setEditIsExecutive(Boolean(member.isExecutive));
    setEditExecutivePosition(member.executivePosition || 'CEO');
    setEditExecutiveOrder(member.executiveOrder || 0);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;

    try {
      setIsSavingEdit(true);
      await organizationsApi.updateMember(orgId, editingMember.id, {
        role: editRole,
        jobTitle: editTitle.trim(),
        departmentId: editDeptId ? editDeptId : null,
        isExecutive: editIsExecutive,
        executivePosition: editIsExecutive ? editExecutivePosition : null,
        executiveOrder: editIsExecutive ? Number(editExecutiveOrder) : 0,
      });
      toast.success('Member updated successfully with executive settings');
      setEditingMember(null);
      queryClient.invalidateQueries({ queryKey: ['org', orgId, 'members'] });
      queryClient.invalidateQueries({ queryKey: ['org', orgId, 'departments'] });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to update member');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member from the organization?')) return;
    try {
      await organizationsApi.removeMember(orgId, memberId);
      toast.success('Member removed');
      queryClient.invalidateQueries({ queryKey: ['org', orgId, 'members'] });
      queryClient.invalidateQueries({ queryKey: ['org', orgId, 'departments'] });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to remove member');
    }
  };

  const handleResendInvite = async (invitationId: string) => {
    try {
      setResendingId(invitationId);
      const res: any = await organizationsApi.resendInvitation(orgId, invitationId);
      const newLink = res?.data?.inviteLink || res?.inviteLink;
      if (newLink) {
        navigator.clipboard.writeText(newLink);
        toast.success('Invitation refreshed & link copied to clipboard!');
      } else {
        toast.success('Invitation email re-sent successfully!');
      }
      queryClient.invalidateQueries({ queryKey: ['org', orgId, 'invitations'] });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to resend invitation');
    } finally {
      setResendingId(null);
    }
  };

  const handleRevokeInvite = async (invitationId: string) => {
    if (!confirm('Are you sure you want to revoke this invitation? The recipient will no longer be able to use it.')) return;
    try {
      setRevokingId(invitationId);
      await organizationsApi.revokeInvitation(orgId, invitationId);
      toast.success('Invitation revoked');
      queryClient.invalidateQueries({ queryKey: ['org', orgId, 'invitations'] });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to revoke invitation');
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Header & Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isMemberOnly ? 'Colleague Directory' : 'User Management & Workforce'}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isMemberOnly
              ? `Browse, connect with, and view verified members of ${activeContext.name}.`
              : `Manage your team, appoint executive leadership, and track workforce invitations for ${activeContext.name}.`}
          </p>
        </div>

        {canInvite && (
          <Button onClick={handleOpenInvite} className="shadow-xs font-semibold">
            <UserPlus className="h-4 w-4 mr-2" />
            Invite Member
          </Button>
        )}
      </div>

      {/* Segmented Navigation Tabs */}
      {!isMemberOnly && (
        <div className="flex items-center gap-2 border-b border-border pb-px">
          <button
            onClick={() => setActiveTab('WORKFORCE')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'WORKFORCE'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Active Workforce</span>
            <Badge variant="secondary" className="text-[11px] px-1.5 py-0 h-5 font-bold">
              {members.length}
            </Badge>
          </button>

          <button
            onClick={() => setActiveTab('INVITATIONS')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'INVITATIONS'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Mail className="h-4 w-4" />
            <span>Invitations & Onboarding</span>
            {pendingInvitesCount > 0 && (
              <Badge className="bg-amber-500 text-white text-[10px] px-1.5 py-0 h-5 font-bold">
                {pendingInvitesCount} Pending
              </Badge>
            )}
          </button>
        </div>
      )}

      {/* TAB 1: ACTIVE WORKFORCE */}
      {activeTab === 'WORKFORCE' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border/80 shadow-2xs">
            <div className="relative flex-1">
              <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search active team by name, email, or role..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9.5 h-10 bg-background"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {/* Executive Filter Dropdown */}
              <div className="flex items-center gap-1.5">
                <Crown className="h-3.5 w-3.5 text-amber-500 hidden sm:inline" />
                <select
                  value={executiveFilter}
                  onChange={(e) => setExecutiveFilter(e.target.value as any)}
                  className="h-10 px-3 rounded-xl border border-input bg-background text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="ALL">All Roles</option>
                  <option value="EXECUTIVES">👑 Executives & C-Suite</option>
                  <option value="STANDARD">Regular Team</option>
                </select>
              </div>

              {/* Department Filter Dropdown */}
              <div className="flex items-center gap-1.5">
                <Network className="h-3.5 w-3.5 text-primary hidden sm:inline" />
                <select
                  value={selectedDeptId}
                  onChange={(e) => {
                    setSelectedDeptId(e.target.value);
                    setSearchParams(e.target.value !== 'ALL' ? { dept: e.target.value } : {});
                  }}
                  className="h-10 px-3 rounded-xl border border-input bg-background text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="ALL">All Departments ({departments.reduce((acc, d) => acc + (d.membersCount || 0), 0)})</option>
                  <option value="UNASSIGNED">Unassigned</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name} {dept.code ? `[${dept.code}]` : ''} ({dept.membersCount || 0})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Members List Card */}
          <Card padding="none" className="overflow-hidden shadow-xs border-border/80">
            <div className="divide-y divide-border/60">
              {isLoading ? (
                <div className="p-12 text-center text-sm text-muted-foreground flex flex-col items-center justify-center gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span>Loading workforce directory...</span>
                </div>
              ) : members.length === 0 ? (
                <div className="p-12 text-center text-sm text-muted-foreground space-y-3">
                  <Users className="h-10 w-10 text-muted-foreground/40 mx-auto" />
                  <p className="font-semibold text-foreground">No members found</p>
                  <p className="text-xs max-w-sm mx-auto">
                    {selectedDeptId !== 'ALL'
                      ? 'There are currently no members matching these filter criteria.'
                      : 'No team members match your active search.'}
                  </p>
                  {(selectedDeptId !== 'ALL' || executiveFilter !== 'ALL') && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedDeptId('ALL');
                        setExecutiveFilter('ALL');
                      }}
                    >
                      Reset Filters
                    </Button>
                  )}
                </div>
              ) : (
                members.map((member: any) => (
                  <div
                    key={member.id}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <div className="relative">
                        <div className="h-11 w-11 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden shadow-2xs">
                          {member.avatarUrl ? (
                            <img src={member.avatarUrl} alt={member.displayName} className="h-full w-full object-cover" />
                          ) : (
                            member.displayName?.[0] || 'U'
                          )}
                        </div>
                        {member.isExecutive && (
                          <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-xs border-2 border-background" title="Executive Leader">
                            <Crown className="h-2.5 w-2.5" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-sm truncate text-foreground">{member.displayName}</span>

                          {/* Executive Badge */}
                          {member.isExecutive && (
                            <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-2xs">
                              <Crown className="h-3 w-3 text-amber-500" />
                              <span>{member.executivePosition?.replace(/_/g, ' ') || 'Executive'}</span>
                            </Badge>
                          )}

                          <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider">
                            {member.role}
                          </Badge>

                          {/* Department Badge */}
                          {member.department ? (
                            <Badge
                              variant="secondary"
                              className="text-[11px] font-medium bg-primary/10 text-primary border border-primary/20"
                            >
                              <Network className="h-3 w-3 mr-1 shrink-0" />
                              {member.department.name} {member.department.code ? `[${member.department.code}]` : ''}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-muted-foreground/70">
                              Unassigned
                            </Badge>
                          )}
                        </div>

                        <p className="text-xs text-muted-foreground truncate">
                          <span className="font-medium text-foreground/80">{member.jobTitle || 'Team Member'}</span> • {member.email}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 self-end sm:self-auto">
                      {/* Automated Profile Completion Score */}
                      <div className="hidden md:flex flex-col items-end gap-1 min-w-[90px]">
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
                          <span>{member.profileCompletionScore ?? 0}%</span>
                          <span className="text-[10px] text-muted-foreground">Profile</span>
                        </div>
                        <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all duration-300"
                            style={{ width: `${member.profileCompletionScore ?? 0}%` }}
                          />
                        </div>
                      </div>

                      {canEditMember ? (
                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEdit(member)}
                            className="h-8 text-xs font-semibold gap-1.5"
                            title="Edit Member / Appoint Executive Position"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                            <span>Edit & Appoint</span>
                          </Button>

                          {canRemoveMember && member.role !== 'OWNER' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveMember(member.id)}
                              className="text-muted-foreground hover:text-destructive h-8 w-8 p-0"
                              title="Remove member"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ) : (
                        (member.user?.username || (member as any).username) && (
                          <a
                            href={`/u/${member.user?.username || (member as any).username}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border text-xs font-semibold hover:border-primary/50 hover:text-primary transition-colors bg-card shadow-2xs"
                          >
                            <span>Profile</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      )}

      {/* TAB 2: INVITATIONS & PENDING */}
      {activeTab === 'INVITATIONS' && (
        <div className="space-y-4">
          {/* Invitation Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border/80 shadow-2xs">
            <div className="relative flex-1">
              <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search invitations by recipient email or role..."
                value={inviteSearch}
                onChange={(e) => setInviteSearch(e.target.value)}
                className="pl-9.5 h-10 bg-background"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto">
              {['ALL', 'PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED'].map((st) => (
                <Button
                  key={st}
                  size="sm"
                  variant={inviteStatusFilter === st ? 'default' : 'outline'}
                  onClick={() => setInviteStatusFilter(st)}
                  className="h-9 text-xs font-semibold shrink-0"
                >
                  {st === 'ALL' ? 'All' : st.charAt(0) + st.slice(1).toLowerCase()}
                </Button>
              ))}
            </div>
          </div>

          {/* Invitations List */}
          <Card padding="none" className="overflow-hidden shadow-xs border-border/80">
            <div className="divide-y divide-border/60">
              {isLoadingInvites ? (
                <div className="p-12 text-center text-sm text-muted-foreground flex flex-col items-center justify-center gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span>Loading invitations...</span>
                </div>
              ) : invitations.length === 0 ? (
                <div className="p-12 text-center text-sm text-muted-foreground space-y-3">
                  <Mail className="h-10 w-10 text-muted-foreground/40 mx-auto" />
                  <p className="font-semibold text-foreground">No invitations found</p>
                  <p className="text-xs max-w-sm mx-auto">
                    There are no sent invitations matching your current filter. Send a new invitation to onboard team members!
                  </p>
                  <Button size="sm" onClick={handleOpenInvite} className="gap-1.5">
                    <UserPlus className="h-4 w-4" /> Send Invite
                  </Button>
                </div>
              ) : (
                invitations.map((inv) => (
                  <div
                    key={inv.id}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <div className="h-10 w-10 rounded-2xl bg-muted border border-border flex items-center justify-center text-muted-foreground shrink-0 shadow-2xs">
                        <Mail className="h-5 w-5" />
                      </div>

                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-sm truncate text-foreground">{inv.email}</span>

                          {/* Status Badge */}
                          {inv.status === 'PENDING' && (
                            <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px] font-bold flex items-center gap-1.5">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                              Pending Accept
                            </Badge>
                          )}
                          {inv.status === 'ACCEPTED' && (
                            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] font-bold flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Accepted & Joined
                            </Badge>
                          )}
                          {inv.status === 'EXPIRED' && (
                            <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-[10px] font-bold flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Expired
                            </Badge>
                          )}
                          {inv.status === 'REVOKED' && (
                            <Badge variant="outline" className="text-[10px] text-muted-foreground">
                              Revoked
                            </Badge>
                          )}

                          <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider">
                            {inv.role}
                          </Badge>

                          {inv.department && (
                            <Badge
                              variant="secondary"
                              className="text-[11px] font-medium bg-primary/10 text-primary border border-primary/20"
                            >
                              <Network className="h-3 w-3 mr-1 shrink-0" />
                              {inv.department.name}
                            </Badge>
                          )}
                        </div>

                        <p className="text-xs text-muted-foreground">
                          {inv.jobTitle ? <span className="font-medium text-foreground/80">{inv.jobTitle} • </span> : null}
                          Sent {new Date(inv.createdAt).toLocaleDateString()}
                          {inv.invitedBy?.displayName ? ` by ${inv.invitedBy.displayName}` : ''}
                          {inv.status === 'PENDING' && ` • Expires ${new Date(inv.expiresAt).toLocaleDateString()}`}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      {(inv.status === 'PENDING' || inv.status === 'EXPIRED') && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleResendInvite(inv.id)}
                          disabled={resendingId === inv.id}
                          className="h-8 text-xs font-semibold gap-1.5"
                          title="Resend invitation email and refresh expiry"
                        >
                          {resendingId === inv.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3.5 w-3.5" />
                          )}
                          <span>Resend</span>
                        </Button>
                      )}

                      {inv.status === 'PENDING' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRevokeInvite(inv.id)}
                          disabled={revokingId === inv.id}
                          className="h-8 text-xs font-semibold text-muted-foreground hover:text-destructive gap-1"
                          title="Revoke this invitation"
                        >
                          {revokingId === inv.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Ban className="h-3.5 w-3.5" />
                          )}
                          <span>Revoke</span>
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      )}

      {/* MODAL 1: INVITE MEMBER MODAL */}
      {isInviteOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in-50 zoom-in-95">
            {lastInviteLink ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                    <Check className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Invitation Dispatched!</h3>
                    <p className="text-xs text-muted-foreground">
                      An invitation email has been sent. You can also copy and share this link directly:
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Input value={lastInviteLink} readOnly className="font-mono text-xs select-all bg-muted/40" />
                  <Button type="button" size="sm" onClick={() => handleCopyLink()} className="shrink-0 font-semibold">
                    {copiedLink ? (
                      <>
                        <Check className="h-3.5 w-3.5 mr-1 text-emerald-400" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 mr-1" /> Copy
                      </>
                    )}
                  </Button>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    type="button"
                    onClick={() => {
                      setIsInviteOpen(false);
                      setLastInviteLink(null);
                    }}
                  >
                    Done
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold">Invite New Member</h3>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setIsInviteOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground -mt-2">
                  Send an email invitation link to join {activeContext.name}.
                </p>

                <form onSubmit={handleInvite} className="space-y-3.5">
                  <div>
                    <label className="text-xs font-semibold mb-1 block">Email Address *</label>
                    <Input
                      type="email"
                      placeholder="colleague@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold mb-1 block">Target Department</label>
                    <select
                      value={inviteDeptId}
                      onChange={(e) => setInviteDeptId(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">No Department (General / Unassigned)</option>
                      {departments.map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name} {dept.code ? `[${dept.code}]` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold mb-1 block">Role / Authorization Level</label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value={ORGANIZATION_ROLE.MEMBER}>Member (Standard Employee Access)</option>
                      <option value={ORGANIZATION_ROLE.MANAGER}>Department Manager (Team Oversight)</option>
                      <option value={ORGANIZATION_ROLE.HR_MANAGER}>HR Manager (Recruitment & Approvals)</option>
                      <option value={ORGANIZATION_ROLE.ADMIN}>Administrator (Full Operational Control)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold mb-1 block">Job Title / Designation</label>
                    <Input
                      placeholder="e.g. Senior Software Engineer"
                      value={inviteTitle}
                      onChange={(e) => setInviteTitle(e.target.value)}
                    />
                  </div>

                  <div className="pt-2 flex justify-end gap-2.5">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsInviteOpen(false)}
                      disabled={isInviting}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isInviting}>
                      {isInviting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        'Send Invitation'
                      )}
                    </Button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT MEMBER & APPOINT EXECUTIVE LEADERSHIP */}
      {editingMember && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in-50 zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">Edit Member & Appointments</h3>
                <p className="text-xs text-muted-foreground">{editingMember.displayName} ({editingMember.email})</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setEditingMember(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold mb-1 block flex items-center gap-1.5">
                  <Network className="h-3.5 w-3.5 text-primary" /> Assign Department
                </label>
                <select
                  value={editDeptId}
                  onChange={(e) => setEditDeptId(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">No Department (Unassigned)</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name} {dept.code ? `[${dept.code}]` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold mb-1 block flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-primary" /> Organization Role & Authorization
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  disabled={editingMember.role === 'OWNER'}
                >
                  <option value={ORGANIZATION_ROLE.OWNER}>Owner (Complete Governance & Billing)</option>
                  <option value={ORGANIZATION_ROLE.ADMIN}>Administrator (Full Operational Control)</option>
                  <option value={ORGANIZATION_ROLE.HR_MANAGER}>HR Manager (Recruitment & Approvals)</option>
                  <option value={ORGANIZATION_ROLE.MANAGER}>Department Manager (Team Oversight)</option>
                  <option value={ORGANIZATION_ROLE.MEMBER}>Member (Standard Employee Access)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold mb-1 block">Job Title / Designation</label>
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="e.g. Chief Product Officer, Professor, etc."
                />
              </div>

              {/* Special Executive Leadership Appointment Section */}
              <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Crown className="h-4 w-4 text-amber-500" />
                    <div>
                      <p className="text-xs font-bold text-foreground">Executive Leadership Appointment</p>
                      <p className="text-[11px] text-muted-foreground">
                        Showcase on company leadership board and highlight with C-Suite honors.
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    id="isExecutiveCheckbox"
                    checked={editIsExecutive}
                    onChange={(e) => setEditIsExecutive(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                  />
                </div>

                {editIsExecutive && (
                  <div className="space-y-3 pt-2 border-t border-amber-500/20">
                    <div>
                      <label className="text-xs font-semibold mb-1 block text-foreground">
                        Executive Position / Title
                      </label>
                      <select
                        value={editExecutivePosition}
                        onChange={(e) => setEditExecutivePosition(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 font-semibold"
                      >
                        {EXECUTIVE_POSITIONS.map((pos) => (
                          <option key={pos.value} value={pos.value}>
                            {pos.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold mb-1 block text-foreground">
                        Leadership Hierarchy Order (Rank)
                      </label>
                      <Input
                        type="number"
                        min="0"
                        value={editExecutiveOrder}
                        onChange={(e) => setEditExecutiveOrder(parseInt(e.target.value, 10) || 0)}
                        placeholder="0 for primary (CEO/Founder), 1, 2..."
                      />
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Lower numbers appear first on the public leadership board and showcases.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-end gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingMember(null)}
                  disabled={isSavingEdit}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSavingEdit}>
                  {isSavingEdit ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving Changes...
                    </>
                  ) : (
                    'Save Appointments'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
