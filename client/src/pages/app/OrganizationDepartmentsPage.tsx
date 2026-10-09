import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Network,
  Plus,
  Users,
  Edit2,
  Trash2,
  Building2,
  Loader2,
  Hash,
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
import type { Department } from '@/types/organization.types';

const deptSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  code: z.string().trim().max(10).toUpperCase().optional(),
  description: z.string().trim().max(500).optional(),
});

type DeptFormValues = z.infer<typeof deptSchema>;

export default function OrganizationDepartmentsPage() {
  const queryClient = useQueryClient();
  const { activeContext } = useOrganizationContextStore();
  const orgId = activeContext.type === 'ORGANIZATION' ? activeContext.organizationId : '';

  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingDept, setEditingDept] = React.useState<Department | null>(null);

  const { data: deptData, isLoading } = useQuery({
    queryKey: ['org', orgId, 'departments'],
    queryFn: () => organizationsApi.listDepartments(orgId),
    enabled: !!orgId,
  });
  const departments: Department[] = (deptData as any)?.data?.departments || [];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
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
      toast.success('Department deleted');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to delete department');
    },
  });

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
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Organization Departments</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Structure your teams, assign department codes, and organize member hierarchies.
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
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
            Create departments (e.g. Engineering, Sales, Marketing) to assign to members and jobs.
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
              className="p-5 flex flex-col justify-between hover:border-primary/40 transition-all"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                    <Network className="h-5 w-5" />
                  </div>
                  {dept.code && (
                    <Badge variant="outline" className="font-mono text-xs uppercase">
                      <Hash className="h-3 w-3 mr-0.5" />
                      {dept.code}
                    </Badge>
                  )}
                </div>

                <div>
                  <h3 className="font-bold text-base text-foreground">{dept.name}</h3>
                  {dept.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {dept.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-border flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  <span>{dept.membersCount ?? 0} members</span>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => handleOpenEdit(dept)}
                    title="Edit Department"
                  >
                    <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      if (confirm(`Delete department "${dept.name}"?`)) {
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

      {/* Create / Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen} className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editingDept ? 'Edit Department' : 'Create Department'}</DialogTitle>
          <DialogDescription>
            Group colleagues and roles under an organizational unit.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit((data) => saveMutation.mutate(data))} className="space-y-4 pt-2">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
              Department Name *
            </label>
            <Input {...register('name')} placeholder="e.g. Engineering, Product, Marketing" />
            {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
              Code (Optional)
            </label>
            <Input {...register('code')} placeholder="e.g. ENG, PRD, MKT" />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
              Description (Optional)
            </label>
            <Textarea
              {...register('description')}
              rows={3}
              placeholder="Focus areas and team scope..."
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : 'Save Department'}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  );
}
