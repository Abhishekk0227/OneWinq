import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import {
  Users,
  UserPlus,
  Mail,
  Shield,
  Search,
  MoreVertical,
  Trash2,
  Building2,
  Copy,
  Check,
  Loader2,
  Network,
  Edit2,
  Filter,
  X,
} from 'lucide-react';
import { useOrganizationContextStore } from '@/stores/organizationContextStore';
import { organizationsApi } from '@/features/organizations/api/organizations.api';
import { toast } from '@/stores/toastStore';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { ORGANIZATION_ROLE } from '@/constants/app.constants';
import type { Department, OrganizationMember } from '@/types/organization.types';

export default function OrganizationMembersPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const deptQueryParam = searchParams.get('dept') || 'ALL';

  const { activeContext } = useOrganizationContextStore();
  const [search, setSearch] = React.useState('');
  const [selectedDeptId, setSelectedDeptId] = React.useState<string>(deptQueryParam);

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
  const [isSavingEdit, setIsSavingEdit] = React.useState(false);

  const [lastInviteLink, setLastInviteLink] = React.useState<string | null>(null);
  const [copiedLink, setCopiedLink] = React.useState(false);

  if (activeContext.type !== 'ORGANIZATION') {
    return <div className="p-8 text-center text-muted-foreground">Select an organization first</div>;
  }

  const orgId = activeContext.organizationId;

  // Fetch departments for dropdowns & filters
  const { data: deptData } = useQuery({
    queryKey: ['org', orgId, 'departments'],
    queryFn: () => organizationsApi.listDepartments(orgId),
    enabled: !!orgId,
  });
  const departments: Department[] = (deptData as any)?.data?.departments || [];

  // Fetch members with query & department filter
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
  const members = rawMembers;

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
      toast.success('Invitation sent successfully!');
      setInviteEmail('');
      setInviteTitle('');
      queryClient.invalidateQueries({ queryKey: ['org', orgId, 'members'] });
      queryClient.invalidateQueries({ queryKey: ['org', orgId, 'departments'] });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to send invitation');
    } finally {
      setIsInviting(false);
    }
  };

  const handleCopyLink = () => {
    if (!lastInviteLink) return;
    navigator.clipboard.writeText(lastInviteLink);
    setCopiedLink(true);
    toast.success('Invitation link copied to clipboard!');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleOpenEdit = (member: OrganizationMember) => {
    setEditingMember(member);
    setEditRole(member.role);
    setEditTitle(member.jobTitle || '');
    setEditDeptId(member.department?.id || '');
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
      });
      toast.success('Member details updated successfully');
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
    if (!confirm('Are you sure you want to remove this member?')) return;
    try {
      await organizationsApi.removeMember(orgId, memberId);
      toast.success('Member removed');
      queryClient.invalidateQueries({ queryKey: ['org', orgId, 'members'] });
      queryClient.invalidateQueries({ queryKey: ['org', orgId, 'departments'] });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to remove member');
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Team Members</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage your employees, faculty, and departments within {activeContext.name}.
          </p>
        </div>

        <Button onClick={handleOpenInvite} className="shadow-xs font-semibold">
          <UserPlus className="h-4 w-4 mr-2" />
          Invite Member
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border/80 shadow-2xs">
        <div className="relative flex-1">
          <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9.5 h-10 bg-background"
          />
        </div>

        {/* Department Filter Dropdown */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground pl-1">
            <Network className="h-3.5 w-3.5 text-primary" />
            <span className="font-medium hidden md:inline">Department:</span>
          </div>
          <select
            value={selectedDeptId}
            onChange={(e) => {
              setSelectedDeptId(e.target.value);
              setSearchParams(e.target.value !== 'ALL' ? { dept: e.target.value } : {});
            }}
            className="h-10 px-3 rounded-xl border border-input bg-background text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="ALL">All Departments ({departments.reduce((acc, d) => acc + (d.membersCount || 0), 0)} assigned)</option>
            <option value="UNASSIGNED">Unassigned / No Department</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name} {dept.code ? `[${dept.code}]` : ''} ({dept.membersCount || 0})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Members List */}
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
                  ? 'There are currently no members assigned to this department.'
                  : 'No team members match your active search filters.'}
              </p>
              {selectedDeptId !== 'ALL' && (
                <Button size="sm" variant="outline" onClick={() => setSelectedDeptId('ALL')}>
                  Show All Members
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
                  <div className="h-11 w-11 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden shadow-2xs">
                    {member.avatarUrl ? (
                      <img src={member.avatarUrl} alt={member.displayName} className="h-full w-full object-cover" />
                    ) : (
                      member.displayName?.[0] || 'U'
                    )}
                  </div>
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-sm truncate text-foreground">{member.displayName}</span>
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
                      {member.approvalStatus && (
                        <Badge
                          variant="outline"
                          className={
                            member.approvalStatus === 'PENDING_REVIEW'
                              ? 'bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]'
                              : member.approvalStatus === 'APPROVED'
                              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]'
                              : 'bg-muted text-muted-foreground text-[10px]'
                          }
                        >
                          {member.approvalStatus.replace('_', ' ')}
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

                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEdit(member)}
                      className="h-8 text-xs font-semibold gap-1.5"
                      title="Edit Member / Change Department"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      <span>Edit & Assign</span>
                    </Button>

                    {member.role !== 'OWNER' && (
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
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Invite Member Modal with Department Selector */}
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
                    <h3 className="text-lg font-bold">Invitation Created!</h3>
                    <p className="text-xs text-muted-foreground">
                      An invitation email has been dispatched. You can also copy and share this link directly:
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Input value={lastInviteLink} readOnly className="font-mono text-xs select-all bg-muted/40" />
                  <Button type="button" size="sm" onClick={handleCopyLink} className="shrink-0 font-semibold">
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
                    <label className="text-xs font-semibold mb-1 block">Role</label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value={ORGANIZATION_ROLE.MEMBER}>Member / Employee</option>
                      <option value={ORGANIZATION_ROLE.MANAGER}>Department Manager</option>
                      <option value={ORGANIZATION_ROLE.HR_MANAGER}>HR / Recruiter</option>
                      <option value={ORGANIZATION_ROLE.ADMIN}>Administrator</option>
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

      {/* Edit Member & Assign Department Modal */}
      {editingMember && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in-50 zoom-in-95">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">Edit Member & Department</h3>
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

            <form onSubmit={handleSaveEdit} className="space-y-3.5">
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
                <p className="text-[11px] text-muted-foreground mt-1">
                  Assign this member to a specific organizational department or team.
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold mb-1 block">Role</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  disabled={editingMember.role === 'OWNER'}
                >
                  <option value={ORGANIZATION_ROLE.OWNER}>Owner</option>
                  <option value={ORGANIZATION_ROLE.ADMIN}>Administrator</option>
                  <option value={ORGANIZATION_ROLE.HR_MANAGER}>HR / Recruiter</option>
                  <option value={ORGANIZATION_ROLE.MANAGER}>Department Manager</option>
                  <option value={ORGANIZATION_ROLE.MEMBER}>Member / Employee</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold mb-1 block">Job Title / Designation</label>
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="e.g. Lead Clinical Specialist"
                />
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
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
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
