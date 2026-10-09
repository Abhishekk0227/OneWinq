import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Globe,
  Mail,
  Phone,
  MapPin,
  Save,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Sliders,
  Image as ImageIcon,
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
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { ORGANIZATION_TYPE } from '@/constants/app.constants';

const profileSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(120),
  tagline: z.string().trim().max(200).optional(),
  description: z.string().trim().max(5000).optional(),
  type: z.enum([
    ORGANIZATION_TYPE.COMPANY,
    ORGANIZATION_TYPE.STARTUP,
    ORGANIZATION_TYPE.COLLEGE,
    ORGANIZATION_TYPE.UNIVERSITY,
    ORGANIZATION_TYPE.HOSPITAL,
    ORGANIZATION_TYPE.NGO,
    ORGANIZATION_TYPE.OTHER,
  ]),
  industry: z.string().trim().max(80).optional(),
  size: z.string().optional(),
  foundedYear: z.preprocess((val) => (val === '' ? undefined : Number(val)), z.number().optional()),
  website: z.string().trim().optional(),
  contactEmail: z.string().trim().email('Invalid email').or(z.literal('')).optional(),
  contactPhone: z.string().trim().optional(),
  logoUrl: z.string().trim().optional(),
  bannerUrl: z.string().trim().optional(),
  address: z.string().trim().optional(),
  city: z.string().trim().optional(),
  state: z.string().trim().optional(),
  country: z.string().trim().optional(),
  isRemoteFriendly: z.boolean().optional(),
  allowMemberJobPosting: z.boolean().optional(),
  requireApprovalForCards: z.boolean().optional(),
  isPublicDirectory: z.boolean().optional(),
});

type FormValues = z.infer<typeof profileSchema>;

export default function OrganizationProfilePage() {
  const queryClient = useQueryClient();
  const { activeContext } = useOrganizationContextStore();

  const orgId = activeContext.type === 'ORGANIZATION' ? activeContext.organizationId : '';

  const { data: orgData, isLoading } = useQuery({
    queryKey: ['org', orgId, 'details'],
    queryFn: () => organizationsApi.getById(orgId),
    enabled: !!orgId,
  });

  const org = (orgData as any)?.data?.organization;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: '',
      type: ORGANIZATION_TYPE.COMPANY,
      size: '1-10',
      isRemoteFriendly: false,
      allowMemberJobPosting: true,
      requireApprovalForCards: true,
      isPublicDirectory: true,
    },
  });

  React.useEffect(() => {
    if (org) {
      reset({
        name: org.name || '',
        tagline: org.tagline || '',
        description: org.description || '',
        type: org.type || ORGANIZATION_TYPE.COMPANY,
        industry: org.industry || '',
        size: org.size || '1-10',
        foundedYear: org.foundedYear || undefined,
        website: org.website || '',
        contactEmail: org.contactEmail || '',
        contactPhone: org.contactPhone || '',
        logoUrl: org.logoUrl || '',
        bannerUrl: org.bannerUrl || '',
        address: org.location?.address || '',
        city: org.location?.city || '',
        state: org.location?.state || '',
        country: org.location?.country || '',
        isRemoteFriendly: org.location?.isRemoteFriendly || false,
        allowMemberJobPosting: org.settings?.allowMemberJobPosting ?? true,
        requireApprovalForCards: org.settings?.requireApprovalForCards ?? true,
        isPublicDirectory: org.settings?.isPublicDirectory ?? true,
      });
    }
  }, [org, reset]);

  const updateMutation = useMutation({
    mutationFn: (data: FormValues) => {
      const payload: any = {
        name: data.name,
        tagline: data.tagline,
        description: data.description,
        type: data.type,
        industry: data.industry,
        size: data.size,
        foundedYear: data.foundedYear || null,
        website: data.website,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        logoUrl: data.logoUrl || null,
        bannerUrl: data.bannerUrl || null,
        location: {
          address: data.address,
          city: data.city,
          state: data.state,
          country: data.country,
          isRemoteFriendly: data.isRemoteFriendly,
        },
        settings: {
          allowMemberJobPosting: data.allowMemberJobPosting,
          requireApprovalForCards: data.requireApprovalForCards,
          isPublicDirectory: data.isPublicDirectory,
        },
      };
      return organizationsApi.update(orgId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org', orgId] });
      toast.success('Organization profile updated successfully');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to update organization profile');
    },
  });

  const onSubmit = (values: FormValues) => {
    updateMutation.mutate(values);
  };

  const previewLogo = watch('logoUrl');
  const previewBanner = watch('bannerUrl');
  const previewName = watch('name') || org?.name || 'Organization';

  if (!orgId) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-bold">No Organization Selected</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Switch to an organization workspace to manage its profile.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header Banner Preview */}
      <div className="relative rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
        <div className="h-40 w-full bg-gradient-to-r from-primary/20 via-primary/10 to-muted relative overflow-hidden">
          {previewBanner ? (
            <img src={previewBanner} alt="Banner" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground/40 text-xs">
              Banner preview (customize below)
            </div>
          )}
        </div>

        <div className="p-6 pt-0 relative flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 -mt-12">
          <div className="flex items-end gap-4">
            <div className="h-24 w-24 rounded-2xl bg-card border-4 border-card shadow-md flex items-center justify-center text-primary overflow-hidden shrink-0">
              {previewLogo ? (
                <img src={previewLogo} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <Building2 className="h-10 w-10 text-muted-foreground" />
              )}
            </div>
            <div className="mb-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">{previewName}</h1>
                {org?.isVerified && (
                  <Badge variant="default" className="bg-primary/20 text-primary border-primary/30">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Verified
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                slug: <span className="font-mono text-xs font-semibold text-foreground">/{org?.slug}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto mb-1">
            {org?.website && (
              <a
                href={org.website.startsWith('http') ? org.website : `https://${org.website}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border border-border hover:bg-muted text-muted-foreground transition-colors"
              >
                <Globe className="h-3.5 w-3.5" /> Website <ExternalLink className="h-3 w-3 opacity-60" />
              </a>
            )}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Tabs defaultValue="general">
          <TabsList className="grid grid-cols-4 w-full max-w-xl">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="branding">Branding</TabsTrigger>
            <TabsTrigger value="contact">Location & Contact</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Tab 1: General Info */}
          <TabsContent value="general" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Organization Overview</CardTitle>
                <CardDescription>
                  Core details displayed on public profiles, job vacancies, and digital cards.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                      Organization Name *
                    </label>
                    <Input {...register('name')} placeholder="Acme Technologies Inc." />
                    {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                      Organization Type *
                    </label>
                    <select
                      {...register('type')}
                      className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value={ORGANIZATION_TYPE.COMPANY}>Company / Corporation</option>
                      <option value={ORGANIZATION_TYPE.STARTUP}>Startup</option>
                      <option value={ORGANIZATION_TYPE.COLLEGE}>College</option>
                      <option value={ORGANIZATION_TYPE.UNIVERSITY}>University</option>
                      <option value={ORGANIZATION_TYPE.HOSPITAL}>Hospital / Clinic</option>
                      <option value={ORGANIZATION_TYPE.NGO}>NGO / Non-Profit</option>
                      <option value={ORGANIZATION_TYPE.OTHER}>Other Organization</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                    Tagline
                  </label>
                  <Input {...register('tagline')} placeholder="Building the next generation of intelligence" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                      Industry
                    </label>
                    <Input {...register('industry')} placeholder="Software & Cloud" />
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                      Company Size
                    </label>
                    <select
                      {...register('size')}
                      className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="1-10">1-10 Employees</option>
                      <option value="11-50">11-50 Employees</option>
                      <option value="51-200">51-200 Employees</option>
                      <option value="201-500">201-500 Employees</option>
                      <option value="500+">500+ Employees</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                      Founded Year
                    </label>
                    <Input {...register('foundedYear')} type="number" placeholder="2022" />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                    About / Description
                  </label>
                  <Textarea
                    {...register('description')}
                    rows={4}
                    placeholder="Describe your organization, mission, and culture..."
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 2: Branding */}
          <TabsContent value="branding" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Logos & Media Assets</CardTitle>
                <CardDescription>
                  Assets used for employee profile banners, NFC badge covers, and corporate identity.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                    Logo Image URL
                  </label>
                  <Input {...register('logoUrl')} placeholder="https://example.com/logo.png" />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Square PNG or SVG recommended (512x512px).
                  </p>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                    Cover Banner Image URL
                  </label>
                  <Input {...register('bannerUrl')} placeholder="https://example.com/cover-banner.jpg" />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Horizontal image recommended (1920x640px).
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 3: Contact & Location */}
          <TabsContent value="contact" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Headquarters & Contact</CardTitle>
                <CardDescription>
                  Help talent and partners reach your organization.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                      Website URL
                    </label>
                    <Input {...register('website')} placeholder="https://acme.org" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                      Contact Email
                    </label>
                    <Input {...register('contactEmail')} placeholder="contact@acme.org" />
                    {errors.contactEmail && (
                      <p className="text-xs text-destructive mt-1">{errors.contactEmail.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                      Contact Phone
                    </label>
                    <Input {...register('contactPhone')} placeholder="+1 (555) 000-0000" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                      Street Address
                    </label>
                    <Input {...register('address')} placeholder="100 Innovation Way, Suite 400" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                      City
                    </label>
                    <Input {...register('city')} placeholder="San Francisco" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                      State / Province
                    </label>
                    <Input {...register('state')} placeholder="California" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                      Country
                    </label>
                    <Input {...register('country')} placeholder="United States" />
                  </div>
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      {...register('isRemoteFriendly')}
                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20"
                    />
                    <div>
                      <span className="text-sm font-medium">Remote-Friendly Organization</span>
                      <p className="text-xs text-muted-foreground">
                        Displays a badge showing candidates that distributed and remote roles are supported.
                      </p>
                    </div>
                  </label>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 4: Governance & Settings */}
          <TabsContent value="settings" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Permissions & Workspace Governance</CardTitle>
                <CardDescription>
                  Configure internal member capabilities and visibility preferences.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <label className="flex items-start gap-3 p-3 rounded-xl border border-border/80 bg-muted/20 cursor-pointer">
                  <input
                    type="checkbox"
                    {...register('allowMemberJobPosting')}
                    className="h-4 w-4 mt-0.5 rounded border-border text-primary focus:ring-primary/20"
                  />
                  <div>
                    <span className="text-sm font-semibold">Allow Managers to Post Jobs</span>
                    <p className="text-xs text-muted-foreground">
                      When enabled, members with MANAGER role can publish vacancies directly.
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
                    <span className="text-sm font-semibold">Require Approval for Corporate NFC Cards</span>
                    <p className="text-xs text-muted-foreground">
                      Physical and digital card orders must be signed off by an Admin before production.
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
                    <span className="text-sm font-semibold">Public Directory Visibility</span>
                    <p className="text-xs text-muted-foreground">
                      Display your organization in the public discovery network and search results.
                    </p>
                  </div>
                </label>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Action Button Bar */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
          <Button
            type="submit"
            disabled={updateMutation.isPending || !isDirty}
            className="px-6 py-2.5 font-semibold"
          >
            {updateMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving Changes...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" /> Save Profile
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
