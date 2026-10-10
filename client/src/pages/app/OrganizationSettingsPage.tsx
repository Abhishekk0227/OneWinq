import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Settings,
  Shield,
  Building2,
  AlertTriangle,
  Save,
  CheckCircle2,
  Loader2,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useOrganizationContextStore } from '@/stores/organizationContextStore';
import { organizationsApi } from '@/features/organizations/api/organizations.api';
import { toast } from '@/stores/toastStore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';

const settingsSchema = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, 'Slug must be at least 3 characters')
    .max(60)
    .regex(/^[a-z0-9-]+$/, 'Only lowercase alphanumeric and hyphens'),
  allowMemberJobPosting: z.boolean(),
  requireApprovalForCards: z.boolean(),
  requireApprovalForProfileChanges: z.boolean(),
  allowCustomThemes: z.boolean(),
  defaultVisibility: z.enum(['public', 'internal', 'private']),
  isPublicDirectory: z.boolean(),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

export default function OrganizationSettingsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { activeContext, switchToPersonal, fetchMemberships } = useOrganizationContextStore();
  const orgId = activeContext.type === 'ORGANIZATION' ? activeContext.organizationId : '';

  const userRole = (activeContext.role || 'MEMBER').toUpperCase();
  const permissions = activeContext.permissions || [];
  const canManageSettings = userRole === 'OWNER' || userRole === 'ADMIN' || permissions.includes('settings:manage');

  const { data: orgData, isLoading } = useQuery({
    queryKey: ['org', orgId, 'details'],
    queryFn: () => organizationsApi.getById(orgId),
    enabled: !!orgId && canManageSettings,
  });
  const org = (orgData as any)?.data?.organization;

  if (!canManageSettings) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center max-w-md mx-auto">
        <div className="h-14 w-14 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mb-4">
          <Settings className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-bold">Access Restricted</h2>
        <p className="text-sm text-muted-foreground mt-1 mb-6">
          Organization governance and privacy settings are managed exclusively by organization administrators.
        </p>
        <Button onClick={() => navigate('/app/org/dashboard')} variant="outline">
          Return to Dashboard
        </Button>
      </div>
    );
  }

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      slug: '',
      allowMemberJobPosting: true,
      requireApprovalForCards: true,
      requireApprovalForProfileChanges: true,
      allowCustomThemes: true,
      defaultVisibility: 'public',
      isPublicDirectory: true,
    },
  });

  React.useEffect(() => {
    if (org) {
      reset({
        slug: org.slug || '',
        allowMemberJobPosting: org.settings?.allowMemberJobPosting ?? true,
        requireApprovalForCards: org.settings?.requireApprovalForCards ?? true,
        requireApprovalForProfileChanges: org.settings?.requireApprovalForProfileChanges ?? true,
        allowCustomThemes: org.settings?.allowCustomThemes ?? true,
        defaultVisibility: org.settings?.defaultVisibility || 'public',
        isPublicDirectory: org.settings?.isPublicDirectory ?? true,
      });
    }
  }, [org, reset]);

  const updateMutation = useMutation({
    mutationFn: (data: SettingsFormValues) => {
      return organizationsApi.update(orgId, {
        slug: data.slug,
        settings: {
          allowMemberJobPosting: data.allowMemberJobPosting,
          requireApprovalForCards: data.requireApprovalForCards,
          requireApprovalForProfileChanges: data.requireApprovalForProfileChanges,
          allowCustomThemes: data.allowCustomThemes,
          defaultVisibility: data.defaultVisibility,
          isPublicDirectory: data.isPublicDirectory,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org', orgId] });
      fetchMemberships();
      toast.success('Organization settings updated successfully');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to update settings');
    },
  });

  if (!orgId) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-bold">No Organization Selected</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Switch to an organization workspace to configure its settings.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Organization Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Workspace governance, vanity web address, and corporate policies.
        </p>
      </div>

      <form onSubmit={handleSubmit((d) => updateMutation.mutate(d))} className="space-y-6">
        {/* Vanity URL & Web Address */}
        <Card>
          <CardHeader>
            <CardTitle>Vanity Web Address & Slug</CardTitle>
            <CardDescription>
              Your public workspace URL for sharing company profiles and job vacancies.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                Custom Slug
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-mono text-muted-foreground">{window.location.host}/c/</span>
                <Input {...register('slug')} className="font-mono text-sm max-w-xs" />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const url = `${window.location.origin}/c/${org?.slug}`;
                    navigator.clipboard.writeText(url);
                    toast.success('Company profile link copied to clipboard');
                  }}
                  className="h-10 px-3"
                >
                  <Copy className="h-4 w-4 mr-1" /> Copy Link
                </Button>
                {org?.slug && (
                  <a
                    href={`/c/${org.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 h-10 px-3 text-xs font-semibold rounded-md border border-border bg-background hover:bg-muted text-foreground transition-colors shadow-xs"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Preview Profile
                  </a>
                )}
              </div>
              {errors.slug && <p className="text-xs text-destructive mt-1">{errors.slug.message}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Member Permissions & Governance */}
        <Card>
          <CardHeader>
            <CardTitle>Member Governance Policies</CardTitle>
            <CardDescription>
              Controls what standard members and managers are permitted to execute.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-start gap-3 p-3 rounded-xl border border-border/80 bg-muted/20 cursor-pointer">
              <input
                type="checkbox"
                {...register('requireApprovalForProfileChanges')}
                className="h-4 w-4 mt-0.5 rounded border-border text-primary focus:ring-primary/20"
              />
              <div>
                <span className="text-sm font-semibold">Enforce Profile Change Moderation Workflow</span>
                <p className="text-xs text-muted-foreground">
                  When enabled, employee/member profile edits are saved in a draft sandbox and require administrator sign-off before being published live.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 rounded-xl border border-border/80 bg-muted/20 cursor-pointer">
              <input
                type="checkbox"
                {...register('allowCustomThemes')}
                className="h-4 w-4 mt-0.5 rounded border-border text-primary focus:ring-primary/20"
              />
              <div>
                <span className="text-sm font-semibold">Allow Members to Customize Profile Color Themes</span>
                <p className="text-xs text-muted-foreground">
                  When disabled, all member cards strictly adhere to corporate brand colors and layouts.
                </p>
              </div>
            </label>

            <div className="p-3 rounded-xl border border-border/80 bg-muted/20 space-y-1.5">
              <label className="text-sm font-semibold block text-foreground">
                Default Member Profile Visibility
              </label>
              <p className="text-xs text-muted-foreground mb-2">
                Governs initial exposure for newly onboarded staff and students.
              </p>
              <select
                {...register('defaultVisibility')}
                className="w-full sm:w-64 h-9 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="public">Public (Worldwide discovery & NFC taps)</option>
                <option value="internal">Internal (Authenticated organization members only)</option>
                <option value="private">Private (Restricted to member and admins)</option>
              </select>
            </div>

            <label className="flex items-start gap-3 p-3 rounded-xl border border-border/80 bg-muted/20 cursor-pointer">
              <input
                type="checkbox"
                {...register('allowMemberJobPosting')}
                className="h-4 w-4 mt-0.5 rounded border-border text-primary focus:ring-primary/20"
              />
              <div>
                <span className="text-sm font-semibold">Allow Department Leads to Post Jobs</span>
                <p className="text-xs text-muted-foreground">
                  Managers can create and manage openings for their assigned department.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 rounded-xl border border-border/80 bg-muted/20 cursor-pointer">
              <input
                type="checkbox"
                {...register('requireApprovalForCards')}
                className="h-4 w-4 mt-0.5 rounded border-border text-primary focus:ring-primary/20"
              />
              <div>
                <span className="text-sm font-semibold">Require Approval for Employee Cards</span>
                <p className="text-xs text-muted-foreground">
                  New physical or digital NFC cards assigned to employees must be authorized by an Admin.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 rounded-xl border border-border/80 bg-muted/20 cursor-pointer">
              <input
                type="checkbox"
                {...register('isPublicDirectory')}
                className="h-4 w-4 mt-0.5 rounded border-border text-primary focus:ring-primary/20"
              />
              <div>
                <span className="text-sm font-semibold">Public Enterprise Directory</span>
                <p className="text-xs text-muted-foreground">
                  Allow your organization to appear in the public talent search and partner discovery feeds.
                </p>
              </div>
            </label>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={updateMutation.isPending || !isDirty}>
            {updateMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" /> Save Settings
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Danger Zone */}
      <Card className="border-rose-500/30 bg-rose-500/5">
        <CardHeader>
          <div className="flex items-center gap-2 text-rose-600">
            <AlertTriangle className="h-5 w-5" />
            <CardTitle className="text-rose-600">Danger Zone</CardTitle>
          </div>
          <CardDescription>
            Switch workspace or leave this organization.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border border-rose-500/20 bg-card">
            <div>
              <h4 className="font-bold text-sm text-foreground">Switch to Personal Workspace</h4>
              <p className="text-xs text-muted-foreground">
                Leave the corporate management context and return to your individual OneWinq profile.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                switchToPersonal();
                navigate('/app/dashboard');
              }}
            >
              Exit to Personal
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
