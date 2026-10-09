import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Network,
  Plus,
  Users,
  Edit2,
  Trash2,
  Building2,
  Loader2,
  Hash,
  UserPlus,
  UserMinus,
  ExternalLink,
  X,
  Check,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useOrganizationContextStore } from '@/stores/organizationContextStore';
import { organizationsApi } from '@/features/organizations/api/organizations.api';
import { toast } from '@/stores/toastStore';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog';
import type { Department, OrganizationMember } from '@/types/organization.types';

const deptSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  code: z.string().trim().max(10).toUpperCase().optional(),
  description: z.string().trim().max(500).optional(),
});

type DeptFormValues = z.infer<typeof deptSchema>;

export default function OrganizationDepartmentsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { activeContext } = useOrganizationContextStore();
  const orgId = activeContext.type === 'ORGANIZATION' ? activeContext.organizationId : '';

  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingDept, setEditingDept] = React.useState<Department | null>(null);

  // Manage Department Members state
  const [managingDept, setManagingDept] = React.useState<Department | null>(null);
  const [selectedMemberToAssign, setSelectedMemberToAssign] = React.useState<string>('');
  const [isAssigning, setIsAssigning] = React.useState(false);

  const { data: deptData, isLoading } = useQuery({
    queryKey: ['org', orgId, 'departments'],
    queryFn: () => organizationsApi.listDepartments(orgId),
    enabled: !!orgId,
  });
  const departments: Department[] = (deptData as any)?.data?.departments || [];

  // All organization members for assignment dropdown
  const { data: allMembersData } = useQuery({
    queryKey: ['org', orgId, 'members', 'all'],
    queryFn: () => organizationsApi.listMembers(orgId, { limit: 100 }),
    enabled: !!orgId && !!managingDept,
  });
  const allMembers: OrganizationMember[] = (allMembersData as any)?.data?.members || [];

  // Specific department members for the modal
  const { data: deptMembersData, isLoading: isLoadingDeptMembers } = useQuery({
    queryKey: ['org', orgId, 'members', 'dept', managingDept?.id],
    queryFn: () => organizationsApi.listMembers(orgId, { departmentId: managingDept!.id }),
    enabled: !!orgId && !!managingDept?.id,
  });
  const deptMembers: OrganizationMember[] = (deptMembersData as any)?.data?.members || [];

  const unassignedOrOtherMembers = allMembers.filter(
    (m) => m.department?.id !== managingDept?.id
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DeptFormValues>({
    resolver: zodResolver(deptSchema),
  });

  const handleOpenCreate = () => {
    setEditingDept(null);
    reset({ name: '', code: '', description: '' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (dept: Department) => {
    setEditingDept(dept);
    reset({
      name: dept.name,
      code: dept.code || '',
      description: dept.description || '',
    });
    setIsModalOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: (data: DeptFormValues) => {
      if (editingDept) {
        return organizationsApi.updateDepartment(orgId, editingDept.id, data);
      } else {
        return organizationsApi.createDepartment(orgId, data as any);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org', orgId, 'departments'] });
      setIsModalOpen(false);
      toast.success(editingDept ? 'Department updated' : 'Department created');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to save department');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (deptId: string) => organizationsApi.deleteDepartment(orgId, deptId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org', orgId, 'departments'] });
      queryClient.invalidateQueries({ queryKey: ['org', orgId, 'members'] });
      toast.success('Department deleted');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to delete department');
    },
  });

  // Assign member to managing department
  const handleAssignMember = async () => {
    if (!managingDept || !selectedMemberToAssign) {
      toast.error('Please select a member to assign');
      return;
    }

    try {
      setIsAssigning(true);
      await organizationsApi.updateMember(orgId, selectedMemberToAssign, {
        departmentId: managingDept.id,
      });
      toast.success(`Member assigned to ${managingDept.name}`);
      setSelectedMemberToAssign('');
      queryClient.invalidateQueries({ queryKey: ['org', orgId, 'members'] });
      queryClient.invalidateQueries({ queryKey: ['org', orgId, 'departments'] });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to assign member');
    } finally {
      setIsAssigning(false);
    }
  };

  // Remove member from department
  const handleRemoveMemberFromDept = async (memberId: string) => {
    try {
      await organizationsApi.updateMember(orgId, memberId, {
        departmentId: null,
      });
      toast.success('Member unassigned from department');
      queryClient.invalidateQueries({ queryKey: ['org', orgId, 'members'] });
      queryClient.invalidateQueries({ queryKey: ['org', orgId, 'departments'] });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to unassign member');
    }
  };

  if (!orgId) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-bold">No Organization Selected</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Switch to an organization workspace to manage departments.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Organization Departments</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Structure your workforce into departments, manage team assignments, and organize roles.
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="shadow-xs font-semibold">
          <Plus className="h-4 w-4 mr-2" /> New Department
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : departments.length === 0 ? (
        <Card className="p-12 text-center">
          <Network className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
          <h3 className="text-base font-semibold">No departments defined yet</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-6">
            Create departments (e.g. Engineering, Medicine, Operations, Sales) to assign team members.
          </p>
          <Button onClick={handleOpenCreate} variant="outline">
            <Plus className="h-4 w-4 mr-2" /> Add First Department
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map((dept) => (
            <Card
              key={dept.id}
              className="p-5 flex flex-col justify-between hover:border-primary/40 transition-all shadow-xs border-border/80 group"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="h-11 w-11 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-2xs">
                    <Network className="h-5 w-5" />
                  </div>
                  {dept.code && (
                    <Badge variant="outline" className="font-mono text-xs uppercase bg-muted/40 font-bold">
                      <Hash className="h-3 w-3 mr-0.5 opacity-60" />
                      {dept.code}
                    </Badge>
                  )}
                </div>

                <div>
                  <h3 className="font-bold text-base text-foreground">{dept.name}</h3>
                  {dept.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                      {dept.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-border flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs font-semibold gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
                  onClick={() => setManagingDept(dept)}
                >
                  <Users className="h-3.5 w-3.5" />
                  <span>{dept.membersCount ?? 0} Members</span>
                </Button>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => handleOpenEdit(dept)}
                    title="Edit Department Details"
                  >
                    <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      if (confirm(`Delete department "${dept.name}"? Members will be set to unassigned.`)) {
                        deleteMutation.mutate(dept.id);
                      }
                    }}
                    title="Delete Department"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Department Details Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen} className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editingDept ? 'Edit Department' : 'Create Department'}</DialogTitle>
          <DialogDescription>
            Define an organizational unit or division to group team members.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit((data) => saveMutation.mutate(data))} className="space-y-4 pt-2">
          <div>
            <label className="text-xs font-semibold mb-1 block">Department Name *</label>
            <Input placeholder="e.g. Clinical Oncology, Engineering, Sales" {...register('name')} />
            {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="text-xs font-semibold mb-1 block">Department Code (Optional)</label>
            <Input placeholder="e.g. ENG, MED, SLS" {...register('code')} />
            {errors.code && <p className="text-xs text-destructive mt-1">{errors.code.message}</p>}
          </div>

          <div>
            <label className="text-xs font-semibold mb-1 block">Description (Optional)</label>
            <Textarea
              rows={3}
              placeholder="Responsibilities, scope, or mission of this team..."
              {...register('description')}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : editingDept ? 'Update Department' : 'Create Department'}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Manage Members in Department Modal */}
      {managingDept && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in-50 zoom-in-95 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-border/80 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                    <Network className="h-4 w-4" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground">{managingDept.name}</h3>
                  {managingDept.code && (
                    <Badge variant="outline" className="font-mono text-xs uppercase">
                      {managingDept.code}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Manage team members assigned to this department.
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs font-semibold gap-1"
                  onClick={() => {
                    navigate(`/app/org/members?dept=${managingDept.id}`);
                  }}
                  title="Filter in Directory"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Directory</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setManagingDept(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Quick Add Member Section */}
            <div className="p-3.5 rounded-xl border border-dashed border-border bg-muted/20 space-y-2.5">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <UserPlus className="h-3.5 w-3.5 text-primary" /> Assign Member to {managingDept.name}
              </span>
              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  value={selectedMemberToAssign}
                  onChange={(e) => setSelectedMemberToAssign(e.target.value)}
                  className="flex-1 h-9 px-3 rounded-xl border border-input bg-background text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Select an organization member...</option>
                  {unassignedOrOtherMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.displayName} ({m.email}) {m.department ? `[Currently in ${m.department.name}]` : '[Unassigned]'}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAssignMember}
                  disabled={!selectedMemberToAssign || isAssigning}
                  className="h-9 text-xs font-semibold shrink-0"
                >
                  {isAssigning ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add to Department
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Assigned Members List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[200px]">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-2">
                Assigned Team Members ({deptMembers.length})
              </span>

              {isLoadingDeptMembers ? (
                <div className="p-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span>Loading members...</span>
                </div>
              ) : deptMembers.length === 0 ? (
                <div className="p-8 text-center border rounded-xl border-dashed border-border/80 bg-muted/10 space-y-2">
                  <Users className="h-8 w-8 text-muted-foreground/40 mx-auto" />
                  <p className="text-xs font-semibold text-foreground">No members in this department yet</p>
                  <p className="text-[11px] text-muted-foreground">
                    Use the selector above to assign existing colleagues, or invite new members directly into this department.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border/60 border rounded-xl bg-card overflow-hidden">
                  {deptMembers.map((member) => (
                    <div
                      key={member.id}
                      className="p-3 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                          {member.avatarUrl ? (
                            <img src={member.avatarUrl} alt={member.displayName} className="h-full w-full object-cover" />
                          ) : (
                            member.displayName?.[0] || 'U'
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs truncate text-foreground">{member.displayName}</span>
                            <Badge variant="outline" className="text-[9px] uppercase font-mono py-0">
                              {member.role}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {member.jobTitle || 'Team Member'} • {member.email}
                          </p>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-destructive hover:bg-destructive/10 shrink-0 gap-1 px-2"
                        onClick={() => handleRemoveMemberFromDept(member.id)}
                        title="Remove member from this department"
                      >
                        <UserMinus className="h-3 w-3" />
                        <span className="hidden sm:inline">Unassign</span>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-border flex justify-end">
              <Button type="button" onClick={() => setManagingDept(null)}>
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
