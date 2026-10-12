import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Shield,
  Plus,
  Lock,
  Edit2,
  Trash2,
  CheckCircle2,
  Building2,
  Loader2,
  Users,
  Briefcase,
  Calendar,
  Sparkles,
  KeyRound,
  FileCheck,
  Settings,
  AlertCircle,
  CreditCard,
  ChevronDown,
  ChevronUp,
  Eye,
  X,
} from 'lucide-react';
import { useOrganizationContextStore } from '@/stores/organizationContextStore';
import { organizationsApi } from '@/features/organizations/api/organizations.api';
import { toast } from '@/stores/toastStore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import { ORGANIZATION_PERMISSION } from '@/constants/app.constants';
import { cn } from '@/lib/utils/cn';
import type { OrganizationRoleItem } from '@/types/organization.types';

// Group permissions into logical business domains (All 24 granular permissions)
const PERMISSION_GROUPS = [
  {
    name: 'Workforce & Members',
    icon: Users,
    permissions: [
      { key: ORGANIZATION_PERMISSION.MEMBERS_VIEW, label: 'View Member Directory' },
      { key: ORGANIZATION_PERMISSION.MEMBERS_INVITE, label: 'Invite New Members' },
      { key: ORGANIZATION_PERMISSION.MEMBERS_EDIT, label: 'Edit Member Roles & Departments' },
      { key: ORGANIZATION_PERMISSION.MEMBERS_REMOVE, label: 'Remove Members' },
    ],
  },
  {
    name: 'Departments & Hierarchy',
    icon: Building2,
    permissions: [
      { key: ORGANIZATION_PERMISSION.DEPARTMENTS_MANAGE, label: 'Create & Manage Departments' },
    ],
  },
  {
    name: 'Career & Talent Vacancies',
    icon: Briefcase,
    permissions: [
      { key: ORGANIZATION_PERMISSION.JOBS_VIEW, label: 'View Job Openings' },
      { key: ORGANIZATION_PERMISSION.JOBS_CREATE, label: 'Create Job Postings' },
      { key: ORGANIZATION_PERMISSION.JOBS_EDIT, label: 'Edit & Close Postings' },
      { key: ORGANIZATION_PERMISSION.JOBS_DELETE, label: 'Delete Vacancies' },
      { key: ORGANIZATION_PERMISSION.APPLICATIONS_VIEW, label: 'View Applications' },
      { key: ORGANIZATION_PERMISSION.APPLICATIONS_MANAGE, label: 'Review & Manage Applicants' },
    ],
  },
  {
    name: 'Events, Seminars & Passes',
    icon: Calendar,
    permissions: [
      { key: ORGANIZATION_PERMISSION.EVENTS_VIEW, label: 'View Events Calendar' },
      { key: ORGANIZATION_PERMISSION.EVENTS_MANAGE, label: 'Create & Manage Events' },
    ],
  },
  {
    name: 'Profile Approvals & Governance',
    icon: FileCheck,
    permissions: [
      { key: ORGANIZATION_PERMISSION.APPROVALS_VIEW, label: 'View Pending Profile Edits' },
      { key: ORGANIZATION_PERMISSION.APPROVALS_MANAGE, label: 'Approve or Reject Profile Changes' },
    ],
  },
  {
    name: 'Digital ID Cards & Badges',
    icon: CreditCard,
    permissions: [
      { key: ORGANIZATION_PERMISSION.CARDS_MANAGE, label: 'Manage NFC & Smart Cards' },
    ],
  },
  {
    name: 'Organization Studio & Governance',
    icon: Settings,
    permissions: [
      { key: ORGANIZATION_PERMISSION.ORG_EDIT, label: 'Edit Organization Profile & Studio' },
      { key: ORGANIZATION_PERMISSION.SHOWCASE_MANAGE, label: 'Manage Brand Showcase & Offerings' },
      { key: ORGANIZATION_PERMISSION.ROLES_VIEW, label: 'View Custom Roles' },
      { key: ORGANIZATION_PERMISSION.ROLES_MANAGE, label: 'Create & Edit Custom Roles' },
      { key: ORGANIZATION_PERMISSION.SETTINGS_MANAGE, label: 'Manage Governance Policies' },
      { key: ORGANIZATION_PERMISSION.POSTS_MANAGE, label: 'Publish & Manage Company Updates & Posts' },
      { key: ORGANIZATION_PERMISSION.AUDIT_VIEW, label: 'View Compliance Audit Logs' },
      { key: ORGANIZATION_PERMISSION.ANALYTICS_VIEW, label: 'View Workspace Analytics' },
      { key: ORGANIZATION_PERMISSION.ORG_DELETE, label: 'Delete Organization Workspace' },
    ],
  },
];

const ALL_PERMISSIONS_MAP: Record<string, { label: string; groupName: string }> = Object.fromEntries(
  PERMISSION_GROUPS.flatMap((group) =>
    group.permissions.map((p) => [
      p.key,
      { label: p.label, groupName: group.name },
    ])
  )
);

export default function OrganizationRolesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { activeContext } = useOrganizationContextStore();
  const orgId = activeContext.type === 'ORGANIZATION' ? activeContext.organizationId : '';

  const userRole = (activeContext.role || 'MEMBER').toUpperCase();
  const permissions = activeContext.permissions || [];
  const canManageRoles = userRole === 'OWNER' || userRole === 'ADMIN' || permissions.includes('roles:manage');

  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingRole, setEditingRole] = React.useState<OrganizationRoleItem | null>(null);
  const [inspectingRole, setInspectingRole] = React.useState<OrganizationRoleItem | null>(null);
  const [expandedRoleIds, setExpandedRoleIds] = React.useState<Record<string, boolean>>({});

  // Form State
  const [name, setName] = React.useState('');
  const [displayName, setDisplayName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [selectedPermissions, setSelectedPermissions] = React.useState<string[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ['org', orgId, 'roles'],
    queryFn: () => organizationsApi.listRoles(orgId),
    enabled: !!orgId && canManageRoles,
  });

  const roles = (data as any)?.data?.roles || [];

  if (!canManageRoles) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center max-w-md mx-auto">
        <div className="h-14 w-14 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mb-4">
          <KeyRound className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-bold">Access Restricted</h2>
        <p className="text-sm text-muted-foreground mt-1 mb-6">
          Custom roles and permission matrices are managed exclusively by organization administrators.
        </p>
        <Button onClick={() => navigate('/app/org/dashboard')} variant="outline">
          Return to Dashboard
        </Button>
      </div>
    );
  }

  const createMutation = useMutation({
    mutationFn: (payload: any) => organizationsApi.createRole(orgId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org', orgId, 'roles'] });
      toast.success('Custom role created successfully');
      handleCloseModal();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to create role');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ roleId, payload }: { roleId: string; payload: any }) =>
      organizationsApi.updateRole(orgId, roleId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org', orgId, 'roles'] });
      toast.success('Custom role updated successfully');
      handleCloseModal();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to update role');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (roleId: string) => organizationsApi.deleteRole(orgId, roleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org', orgId, 'roles'] });
      toast.success('Custom role deleted successfully');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to delete role');
    },
  });

  const handleOpenCreate = () => {
    setEditingRole(null);
    setName('');
    setDisplayName('');
    setDescription('');
    setSelectedPermissions([]);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (role: OrganizationRoleItem) => {
    setEditingRole(role);
    setName(role.name);
    setDisplayName(role.displayName);
    setDescription(role.description || '');
    setSelectedPermissions(role.permissions || []);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingRole(null);
  };

  const togglePermission = (permKey: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permKey) ? prev.filter((p) => p !== permKey) : [...prev, permKey]
    );
  };

  const handleSelectAllGroup = (groupPerms: string[]) => {
    const allSelected = groupPerms.every((p) => selectedPermissions.includes(p));
    if (allSelected) {
      setSelectedPermissions((prev) => prev.filter((p) => !groupPerms.includes(p)));
    } else {
      setSelectedPermissions((prev) => Array.from(new Set([...prev, ...groupPerms])));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      toast.error('Role display name is required');
      return;
    }

    if (editingRole) {
      const roleId = (editingRole as any)._id || editingRole.id;
      updateMutation.mutate({
        roleId,
        payload: {
          displayName,
          description,
          permissions: selectedPermissions,
        },
      });
    } else {
      if (!name.trim()) {
        toast.error('Role technical key is required');
        return;
      }
      createMutation.mutate({
        name,
        displayName,
        description,
        permissions: selectedPermissions,
      });
    }
  };

  if (!orgId) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-bold">No Organization Selected</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Switch to an organization workspace to configure custom roles.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <KeyRound className="h-6 w-6 text-primary" /> Roles & Permission Matrix
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure custom organizational roles (e.g. Dean, Medical Lead, HR Coordinator) with granular permissions.
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="font-semibold shadow-xs">
          <Plus className="h-4 w-4 mr-2" /> Create Custom Role
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {roles.map((role: OrganizationRoleItem, idx: number) => {
            const roleId = (role as any)._id || role.id;
            const isSystem = role.isSystem;

            return (
              <Card
                key={roleId || idx}
                className={isSystem ? 'border-border/80 bg-card/60' : 'border-primary/30 bg-card shadow-xs'}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base font-bold">{role.displayName}</CardTitle>
                        {isSystem ? (
                          <Badge variant="outline" className="text-[10px] py-0 text-muted-foreground">
                            <Lock className="h-2.5 w-2.5 mr-1" /> Built-in
                          </Badge>
                        ) : (
                          <Badge variant="default" className="text-[10px] py-0 bg-primary/20 text-primary border-primary/30">
                            Custom
                          </Badge>
                        )}
                      </div>
                      <p className="font-mono text-xs text-muted-foreground">{role.name}</p>
                    </div>

                    {!isSystem && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(role)}
                          className="h-8 w-8 p-0"
                          title="Edit role"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={deleteMutation.isPending}
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to delete custom role "${role.displayName}"?`)) {
                              deleteMutation.mutate(roleId);
                            }
                          }}
                          className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                          title="Delete role"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <CardDescription className="text-xs line-clamp-2 mt-1">
                    {role.description || 'No description provided.'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  <div className="border-t border-border/70 pt-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground/90">
                      {role.permissions?.length || 0} of 24 permissions granted
                    </span>
                    {isSystem && <span className="text-[11px] font-medium text-primary">System Managed</span>}
                  </div>

                  {/* Inline preview toggle & view modal trigger */}
                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedRoleIds((prev) => ({
                          ...prev,
                          [roleId]: !prev[roleId],
                        }))
                      }
                      className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>{expandedRoleIds[roleId] ? 'Hide access list' : 'View granted access'}</span>
                      {expandedRoleIds[roleId] ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                    </button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setInspectingRole(role)}
                      className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                    >
                      Full Matrix
                    </Button>
                  </div>

                  {/* Inline Expanded Granted Permissions List */}
                  {expandedRoleIds[roleId] && (
                    <div className="pt-2 border-t border-dashed border-border/60 space-y-2 animate-in fade-in duration-200">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Granted Capabilities:
                      </div>
                      {(!role.permissions || role.permissions.length === 0) ? (
                        <p className="text-xs text-muted-foreground italic">No permissions granted.</p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5 max-h-52 overflow-y-auto pr-1">
                          {role.permissions.map((permKey: string) => {
                            const meta = ALL_PERMISSIONS_MAP[permKey];
                            return (
                              <span
                                key={permKey}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-primary/10 text-primary border border-primary/20"
                                title={permKey}
                              >
                                <CheckCircle2 className="h-2.5 w-2.5 text-emerald-500 shrink-0" />
                                <span>{meta?.label || permKey}</span>
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create / Edit Role Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card border border-border rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-in fade-in-50 zoom-in-95 duration-200">
            <div className="p-6 border-b border-border flex items-center justify-between sticky top-0 bg-card z-10">
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  {editingRole ? `Edit Role: ${editingRole.displayName}` : 'Create Custom Organizational Role'}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Grant granular authority across workforce modules.
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={handleCloseModal}>
                ✕
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                    Role Display Name *
                  </label>
                  <Input
                    placeholder="e.g. Dean of Academics, Clinical Lead"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                    Role System Key *
                  </label>
                  <Input
                    placeholder="e.g. DEAN_ACADEMICS"
                    value={name}
                    disabled={!!editingRole}
                    onChange={(e) => setName(e.target.value.toUpperCase().replace(/\s+/g, '_'))}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                  Description
                </label>
                <Textarea
                  placeholder="Outline responsibilities and operational scope..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                />
              </div>

              {/* Permission Groups Matrix */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                    <Shield className="h-4 w-4 text-primary" /> Permission Access Matrix
                  </h4>
                  <span className="text-xs text-muted-foreground">
                    {selectedPermissions.length} selected
                  </span>
                </div>

                <div className="space-y-3">
                  {PERMISSION_GROUPS.map((group) => {
                    const GroupIcon = group.icon;
                    const groupPermKeys = group.permissions.map((p) => p.key);
                    const allSelected = groupPermKeys.every((p) => selectedPermissions.includes(p));

                    return (
                      <div
                        key={group.name}
                        className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                            <GroupIcon className="h-4 w-4 text-primary" /> {group.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleSelectAllGroup(groupPermKeys)}
                            className="text-[11px] text-primary hover:underline font-medium cursor-pointer"
                          >
                            {allSelected ? 'Deselect All' : 'Select All'}
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          {group.permissions.map((perm) => {
                            const isChecked = selectedPermissions.includes(perm.key);
                            return (
                              <label
                                key={perm.key}
                                className="flex items-center gap-2 p-2 rounded-lg bg-card/60 hover:bg-card border border-border/50 text-xs cursor-pointer transition-colors"
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => togglePermission(perm.key)}
                                  className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary/20"
                                />
                                <span className={isChecked ? 'font-medium text-foreground' : 'text-muted-foreground'}>
                                  {perm.label}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <Button type="button" variant="outline" onClick={handleCloseModal}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="font-semibold"
                >
                  {createMutation.isPending || updateMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      {editingRole ? 'Save Changes' : 'Create Role'}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detailed Role Permissions Breakdown Modal */}
      {inspectingRole && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card border border-border rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-in fade-in-50 zoom-in-95 duration-200">
            <div className="p-6 border-b border-border flex items-start justify-between sticky top-0 bg-card z-10">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-foreground">
                    {inspectingRole.displayName}
                  </h3>
                  {inspectingRole.isSystem ? (
                    <Badge variant="outline" className="text-[10px] py-0 text-muted-foreground">
                      <Lock className="h-2.5 w-2.5 mr-1" /> Built-in
                    </Badge>
                  ) : (
                    <Badge variant="default" className="text-[10px] py-0 bg-primary/20 text-primary border-primary/30">
                      Custom
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  System key: <span className="font-mono">{inspectingRole.name}</span> • Granted{' '}
                  <span className="font-bold text-primary">
                    {inspectingRole.permissions?.length || 0} of 24
                  </span>{' '}
                  permissions
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setInspectingRole(null)}>
                ✕
              </Button>
            </div>

            <div className="p-6 space-y-6">
              {/* Description */}
              {inspectingRole.description && (
                <div className="p-3.5 rounded-xl bg-muted/40 border border-border text-xs text-muted-foreground leading-relaxed">
                  {inspectingRole.description}
                </div>
              )}

              {/* Grouped Permission Breakdown */}
              <div className="space-y-4">
                {PERMISSION_GROUPS.map((group) => {
                  const GroupIcon = group.icon;
                  const grantedInGroup = group.permissions.filter((p) =>
                    inspectingRole.permissions?.includes(p.key)
                  );

                  return (
                    <div
                      key={group.name}
                      className="rounded-xl border border-border/80 bg-muted/15 p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                            <GroupIcon className="h-3.5 w-3.5" />
                          </div>
                          <span className="text-xs font-bold text-foreground">
                            {group.name}
                          </span>
                        </div>
                        <span className="text-[11px] font-medium text-muted-foreground">
                          {grantedInGroup.length} / {group.permissions.length} granted
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {group.permissions.map((perm) => {
                          const isGranted = inspectingRole.permissions?.includes(perm.key);
                          return (
                            <div
                              key={perm.key}
                              className={cn(
                                'flex items-center gap-2 p-2 rounded-lg text-xs border transition-colors',
                                isGranted
                                  ? 'bg-emerald-500/10 border-emerald-500/20 text-foreground font-medium'
                                  : 'bg-muted/30 border-border/40 text-muted-foreground opacity-60'
                              )}
                            >
                              {isGranted ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                              ) : (
                                <X className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                              )}
                              <span className="truncate">{perm.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-4 border-t border-border flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setInspectingRole(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
