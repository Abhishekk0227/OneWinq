import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
} from 'lucide-react';
import { useOrganizationContextStore } from '@/stores/organizationContextStore';
import { organizationsApi } from '@/features/organizations/api/organizations.api';
import { toast } from '@/stores/toastStore';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { ORGANIZATION_ROLE } from '@/constants/app.constants';

export default function OrganizationMembersPage() {
  const queryClient = useQueryClient();
  const { activeContext } = useOrganizationContextStore();
  const [search, setSearch] = React.useState('');
  const [isInviteOpen, setIsInviteOpen] = React.useState(false);
  const [inviteEmail, setInviteEmail] = React.useState('');
  const [inviteRole, setInviteRole] = React.useState<string>(ORGANIZATION_ROLE.MEMBER);
  const [inviteTitle, setInviteTitle] = React.useState('');
  const [isInviting, setIsInviting] = React.useState(false);

  if (activeContext.type !== 'ORGANIZATION') {
    return <div className="p-8 text-center text-muted-foreground">Select an organization first</div>;
  }

  const orgId = activeContext.organizationId;

  const { data, isLoading } = useQuery({
    queryKey: ['org', orgId, 'members', search],
    queryFn: () => organizationsApi.listMembers(orgId, { q: search }),
  });

  const members = (data as any)?.data?.members || [];

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    try {
      setIsInviting(true);
      const res = await organizationsApi.inviteMember(orgId, {
        email: inviteEmail.trim(),
        role: inviteRole,
        jobTitle: inviteTitle.trim(),
      });
      toast.success('Invitation sent successfully!');
      setIsInviteOpen(false);
      setInviteEmail('');
      setInviteTitle('');
      queryClient.invalidateQueries({ queryKey: ['org', orgId, 'members'] });
    } catch (err: any) {
      toast.error(err.message || 'Failed to send invitation');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return;
    try {
      await organizationsApi.removeMember(orgId, memberId);
      toast.success('Member removed');
      queryClient.invalidateQueries({ queryKey: ['org', orgId, 'members'] });
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove member');
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Team Members</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage your employees, faculty, and team members within {activeContext.name}.
          </p>
        </div>

        <Button onClick={() => setIsInviteOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Invite Member
        </Button>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search members by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Members List */}
      <Card padding="none">
        <div className="divide-y divide-border/60">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading members...</div>
          ) : members.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No members found matching your search.
            </div>
          ) : (
            members.map((member: any) => (
              <div
                key={member.id}
                className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden">
                    {member.avatarUrl ? (
                      <img src={member.avatarUrl} alt={member.displayName} className="h-full w-full object-cover" />
                    ) : (
                      member.displayName?.[0] || 'U'
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm truncate">{member.displayName}</span>
                      <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider">
                        {member.role}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {member.jobTitle || 'Team Member'} • {member.email}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
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
            ))
          )}
        </div>
      </Card>

      {/* Invite Member Modal */}
      {isInviteOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in-50 zoom-in-95">
            <h3 className="text-lg font-bold">Invite New Member</h3>
            <p className="text-xs text-muted-foreground">
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
                <label className="text-xs font-semibold mb-1 block">Job Title / Role</label>
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
          </div>
        </div>
      )}
    </div>
  );
}
