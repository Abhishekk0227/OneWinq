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
  UploadCloud,
  Camera,
  Trash2,
  Link as LinkIcon,
  Sparkles,
  Plus,
  Package,
  Award,
  Layers,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useOrganizationContextStore } from '@/stores/organizationContextStore';
import { organizationsApi } from '@/features/organizations/api/organizations.api';
import { mediaApi } from '@/features/media/api/media.api';
import { toast } from '@/stores/toastStore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { ORGANIZATION_TYPE } from '@/constants/app.constants';
import type { OrganizationProduct, OrganizationProject, OrganizationAchievement } from '@/types/organization.types';

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

  const [uploadingLogo, setUploadingLogo] = React.useState(false);
  const [uploadingBanner, setUploadingBanner] = React.useState(false);
  const [showManualUrls, setShowManualUrls] = React.useState(false);

  const [products, setProducts] = React.useState<OrganizationProduct[]>([]);
  const [projects, setProjects] = React.useState<OrganizationProject[]>([]);
  const [achievements, setAchievements] = React.useState<OrganizationAchievement[]>([]);
  const [showcaseDirty, setShowcaseDirty] = React.useState(false);

  const [newProduct, setNewProduct] = React.useState({ name: '', description: '', linkUrl: '', tag: '' });
  const [newProject, setNewProject] = React.useState({ title: '', description: '', client: '', linkUrl: '', metrics: '' });
  const [newAchievement, setNewAchievement] = React.useState({ title: '', issuer: '', year: '', description: '' });

  const logoFileInputRef = React.useRef<HTMLInputElement>(null);
  const bannerFileInputRef = React.useRef<HTMLInputElement>(null);

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
    setValue,
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

      setProducts(org.products || []);
      setProjects(org.projects || []);
      setAchievements(org.achievements || []);
      setShowcaseDirty(false);
    }
  }, [org, reset]);

  const handleAddProduct = () => {
    if (!newProduct.name.trim()) {
      toast.error('Product / Service name is required');
      return;
    }
    setProducts((prev) => [...prev, { ...newProduct }]);
    setNewProduct({ name: '', description: '', linkUrl: '', tag: '' });
    setShowcaseDirty(true);
  };

  const handleRemoveProduct = (index: number) => {
    setProducts((prev) => prev.filter((_, i) => i !== index));
    setShowcaseDirty(true);
  };

  const handleAddProject = () => {
    if (!newProject.title.trim()) {
      toast.error('Project title is required');
      return;
    }
    setProjects((prev) => [...prev, { ...newProject }]);
    setNewProject({ title: '', description: '', client: '', linkUrl: '', metrics: '' });
    setShowcaseDirty(true);
  };

  const handleRemoveProject = (index: number) => {
    setProjects((prev) => prev.filter((_, i) => i !== index));
    setShowcaseDirty(true);
  };

  const handleAddAchievement = () => {
    if (!newAchievement.title.trim()) {
      toast.error('Achievement title is required');
      return;
    }
    setAchievements((prev) => [
      ...prev,
      {
        title: newAchievement.title,
        issuer: newAchievement.issuer,
        year: newAchievement.year ? Number(newAchievement.year) : null,
        description: newAchievement.description,
      },
    ]);
    setNewAchievement({ title: '', issuer: '', year: '', description: '' });
    setShowcaseDirty(true);
  };

  const handleRemoveAchievement = (index: number) => {
    setAchievements((prev) => prev.filter((_, i) => i !== index));
    setShowcaseDirty(true);
  };

  // Upload Handlers
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Logo image must be smaller than 5MB');
      if (logoFileInputRef.current) logoFileInputRef.current.value = '';
      return;
    }

    try {
      setUploadingLogo(true);
      const res = await mediaApi.uploadFile(file, 'PROFILE_PHOTO');
      setValue('logoUrl', res.publicUrl, { shouldDirty: true });
      toast.success('Logo uploaded! Click "Save Profile" to finalize.');
    } catch (err: any) {
      console.error('[LogoUploadError]', err);
      toast.error(err?.message || 'Failed to upload logo image');
    } finally {
      setUploadingLogo(false);
      if (logoFileInputRef.current) logoFileInputRef.current.value = '';
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Banner image must be smaller than 10MB');
      if (bannerFileInputRef.current) bannerFileInputRef.current.value = '';
      return;
    }

    try {
      setUploadingBanner(true);
      const res = await mediaApi.uploadFile(file, 'PROFILE_COVER');
      setValue('bannerUrl', res.publicUrl, { shouldDirty: true });
      toast.success('Cover banner uploaded! Click "Save Profile" to finalize.');
    } catch (err: any) {
      console.error('[BannerUploadError]', err);
      toast.error(err?.message || 'Failed to upload banner image');
    } finally {
      setUploadingBanner(false);
      if (bannerFileInputRef.current) bannerFileInputRef.current.value = '';
    }
  };

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
        products,
        projects,
        achievements,
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
      setShowcaseDirty(false);
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
      {/* Hidden file inputs for direct media uploads */}
      <input
        ref={logoFileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="hidden"
        onChange={handleLogoUpload}
      />
      <input
        ref={bannerFileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={handleBannerUpload}
      />

      {/* Header Banner & Logo Interactive Preview */}
      <div className="relative rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs group">
        <div className="h-44 sm:h-52 w-full bg-gradient-to-r from-primary/20 via-primary/10 to-muted relative overflow-hidden">
          {previewBanner ? (
            <img src={previewBanner} alt="Banner" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground/50 text-xs gap-1">
              <ImageIcon className="h-6 w-6 opacity-40" />
              <span>No cover banner uploaded</span>
            </div>
          )}

          {/* Quick Upload Banner Overlay Button */}
          <div className="absolute top-3 right-3 flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={uploadingBanner}
              onClick={() => bannerFileInputRef.current?.click()}
              className="bg-card/85 hover:bg-card backdrop-blur-md border-border/80 text-foreground text-xs shadow-sm h-8"
            >
              {uploadingBanner ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Uploading...
                </>
              ) : (
                <>
                  <Camera className="h-3.5 w-3.5 mr-1.5" /> Change Banner
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="p-6 pt-0 relative flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 -mt-14">
          <div className="flex items-end gap-4">
            {/* Interactive Logo Avatar with Quick Upload Overlay */}
            <div className="relative group/logo">
              <div className="h-28 w-28 rounded-2xl bg-card border-4 border-card shadow-lg flex items-center justify-center text-primary overflow-hidden shrink-0">
                {previewLogo ? (
                  <img src={previewLogo} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <Building2 className="h-12 w-12 text-muted-foreground/60" />
                )}
              </div>

              {/* Hover upload badge on Logo */}
              <button
                type="button"
                disabled={uploadingLogo}
                onClick={() => logoFileInputRef.current?.click()}
                className="absolute inset-0 rounded-2xl bg-black/50 backdrop-blur-2xs opacity-0 group-hover/logo:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[11px] font-semibold cursor-pointer m-1"
                title="Upload new logo image"
              >
                {uploadingLogo ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <Camera className="h-5 w-5 mb-0.5" />
                    <span>Upload</span>
                  </>
                )}
              </button>
            </div>

            <div className="mb-2">
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

          <div className="flex items-center gap-2 self-end sm:self-auto mb-2">
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
        <Tabs defaultValue="branding">
          <TabsList className="grid grid-cols-5 w-full max-w-2xl">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="branding">Branding & Media</TabsTrigger>
            <TabsTrigger value="contact">Location & Contact</TabsTrigger>
            <TabsTrigger value="showcase">Showcase</TabsTrigger>
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

          {/* Tab 2: Branding & Media Assets with Direct File Upload */}
          <TabsContent value="branding" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Logos & Visual Brand Assets</CardTitle>
                <CardDescription>
                  Upload your high-resolution company logo and cover banner used across employee badges, job posts, and profiles.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 1. Logo Upload Section */}
                <div className="p-5 rounded-2xl border border-border/80 bg-muted/20 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-foreground">Organization Logo</h4>
                      <p className="text-xs text-muted-foreground">
                        Recommended: Square image (PNG, JPG, SVG, WebP up to 5MB, at least 512×512px).
                      </p>
                    </div>
                    {previewLogo && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setValue('logoUrl', '', { shouldDirty: true })}
                        className="text-xs text-destructive hover:bg-destructive/10 h-8"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove
                      </Button>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-5">
                    <div className="h-24 w-24 rounded-2xl bg-card border-2 border-dashed border-border flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
                      {previewLogo ? (
                        <img src={previewLogo} alt="Logo" className="w-full h-full object-cover" />
                      ) : (
                        <Building2 className="h-10 w-10 text-muted-foreground/40" />
                      )}
                    </div>

                    <div className="space-y-2 text-center sm:text-left flex-1">
                      <Button
                        type="button"
                        disabled={uploadingLogo}
                        onClick={() => logoFileInputRef.current?.click()}
                        className="font-semibold shadow-xs"
                      >
                        {uploadingLogo ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading Logo...
                          </>
                        ) : (
                          <>
                            <UploadCloud className="h-4 w-4 mr-2" /> Upload Logo File
                          </>
                        )}
                      </Button>
                      <p className="text-[11px] text-muted-foreground">
                        Files are automatically optimized and served via high-speed CDN.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 2. Banner Upload Section */}
                <div className="p-5 rounded-2xl border border-border/80 bg-muted/20 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-foreground">Cover Banner Image</h4>
                      <p className="text-xs text-muted-foreground">
                        Recommended: Horizontal image (PNG, JPG, WebP up to 10MB, at least 1920×640px).
                      </p>
                    </div>
                    {previewBanner && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setValue('bannerUrl', '', { shouldDirty: true })}
                        className="text-xs text-destructive hover:bg-destructive/10 h-8"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove
                      </Button>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="h-36 sm:h-44 w-full rounded-2xl bg-card border-2 border-dashed border-border overflow-hidden relative flex items-center justify-center shadow-xs">
                      {previewBanner ? (
                        <img src={previewBanner} alt="Banner" className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-muted-foreground/40 text-xs gap-1.5 p-4 text-center">
                          <ImageIcon className="h-8 w-8" />
                          <span>No cover banner uploaded</span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                      <Button
                        type="button"
                        disabled={uploadingBanner}
                        onClick={() => bannerFileInputRef.current?.click()}
                        className="font-semibold shadow-xs w-full sm:w-auto"
                      >
                        {uploadingBanner ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading Banner...
                          </>
                        ) : (
                          <>
                            <UploadCloud className="h-4 w-4 mr-2" /> Upload Banner File
                          </>
                        )}
                      </Button>
                      <span className="text-[11px] text-muted-foreground">
                        Displayed on top of company profile and job openings.
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. Manual URL override accordion toggle */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setShowManualUrls(!showManualUrls)}
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors cursor-pointer"
                  >
                    <LinkIcon className="h-3.5 w-3.5" />
                    <span>{showManualUrls ? 'Hide manual image URLs' : 'Or paste custom image URLs directly'}</span>
                  </button>

                  {showManualUrls && (
                    <div className="mt-4 p-4 rounded-xl border border-border/70 bg-card space-y-4 animate-in fade-in-50 duration-200">
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                          Direct Logo Image URL
                        </label>
                        <Input {...register('logoUrl')} placeholder="https://example.com/logo.png" />
                      </div>
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                          Direct Cover Banner URL
                        </label>
                        <Input {...register('bannerUrl')} placeholder="https://example.com/cover-banner.jpg" />
                      </div>
                    </div>
                  )}
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

          {/* Tab 4: Company Showcase & Offerings */}
          <TabsContent value="showcase" className="mt-6 space-y-6">
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Live Public Showcase Experience</h3>
                    <p className="text-xs text-muted-foreground">
                      Visitors can explore your 8-section company landing page at /company/{org?.slug}
                    </p>
                  </div>
                </div>
                {org?.slug && (
                  <a
                    href={`/company/${org.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs shrink-0"
                  >
                    View Live Showcase <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </CardContent>
            </Card>

            {/* Products & Services Sub-manager */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-primary" />
                    <div>
                      <CardTitle className="text-base">Products & Offerings ({products.length})</CardTitle>
                      <CardDescription>Featured products and solutions created by your team.</CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {products.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {products.map((prod, idx) => (
                      <div key={idx} className="p-3.5 rounded-xl border border-border bg-card/60 flex items-start justify-between gap-3">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm truncate">{prod.name}</span>
                            {prod.tag && <Badge variant="outline" className="text-[10px] py-0">{prod.tag}</Badge>}
                          </div>
                          {prod.description && <p className="text-xs text-muted-foreground line-clamp-2">{prod.description}</p>}
                          {prod.linkUrl && (
                            <a href={prod.linkUrl} target="_blank" rel="noreferrer" className="text-[11px] text-primary hover:underline inline-flex items-center gap-1">
                              Visit Link <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveProduct(idx)}
                          className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10 shrink-0"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add product form */}
                <div className="p-4 rounded-xl border border-dashed border-border/80 bg-muted/20 space-y-3">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Plus className="h-3.5 w-3.5 text-primary" /> Add Product or Service
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <Input
                      placeholder="Product Name *"
                      value={newProduct.name}
                      onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                    />
                    <Input
                      placeholder="Tag (e.g. SaaS, Hardware)"
                      value={newProduct.tag}
                      onChange={(e) => setNewProduct({ ...newProduct, tag: e.target.value })}
                    />
                    <Input
                      placeholder="Direct URL (optional)"
                      value={newProduct.linkUrl}
                      onChange={(e) => setNewProduct({ ...newProduct, linkUrl: e.target.value })}
                    />
                  </div>
                  <Input
                    placeholder="Short description of this product or solution..."
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                  />
                  <div className="flex justify-end">
                    <Button type="button" size="sm" variant="outline" onClick={handleAddProduct} className="text-xs">
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add Product
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Projects & Case Studies Sub-manager */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="h-5 w-5 text-primary" />
                    <div>
                      <CardTitle className="text-base">Projects & Client Case Studies ({projects.length})</CardTitle>
                      <CardDescription>Highlight high-impact initiatives and measurable outcomes.</CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {projects.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {projects.map((proj, idx) => (
                      <div key={idx} className="p-3.5 rounded-xl border border-border bg-card/60 flex items-start justify-between gap-3">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm truncate">{proj.title}</span>
                            {proj.client && <Badge variant="secondary" className="text-[10px] py-0">{proj.client}</Badge>}
                          </div>
                          {proj.metrics && <p className="text-xs font-medium text-primary">{proj.metrics}</p>}
                          {proj.description && <p className="text-xs text-muted-foreground line-clamp-2">{proj.description}</p>}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveProject(idx)}
                          className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10 shrink-0"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add project form */}
                <div className="p-4 rounded-xl border border-dashed border-border/80 bg-muted/20 space-y-3">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Plus className="h-3.5 w-3.5 text-primary" /> Add Project or Case Study
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <Input
                      placeholder="Project Title *"
                      value={newProject.title}
                      onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                    />
                    <Input
                      placeholder="Client / Beneficiary"
                      value={newProject.client}
                      onChange={(e) => setNewProject({ ...newProject, client: e.target.value })}
                    />
                    <Input
                      placeholder="Key Metric (e.g. +300% ROI)"
                      value={newProject.metrics}
                      onChange={(e) => setNewProject({ ...newProject, metrics: e.target.value })}
                    />
                  </div>
                  <Input
                    placeholder="Brief description of the work and impact achieved..."
                    value={newProject.description}
                    onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  />
                  <div className="flex justify-end">
                    <Button type="button" size="sm" variant="outline" onClick={handleAddProject} className="text-xs">
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add Project
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Achievements & Awards Sub-manager */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-primary" />
                    <div>
                      <CardTitle className="text-base">Achievements & Certifications ({achievements.length})</CardTitle>
                      <CardDescription>Industry awards, ISO accreditations, and official milestones.</CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {achievements.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {achievements.map((ach, idx) => (
                      <div key={idx} className="p-3.5 rounded-xl border border-border bg-card/60 flex items-start justify-between gap-3">
                        <div className="space-y-1 min-w-0">
                          <span className="font-semibold text-sm block truncate">{ach.title}</span>
                          <p className="text-xs text-muted-foreground">
                            {ach.issuer || 'Awarded'}{ach.year ? ` • ${ach.year}` : ''}
                          </p>
                          {ach.description && <p className="text-xs text-muted-foreground line-clamp-2">{ach.description}</p>}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveAchievement(idx)}
                          className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10 shrink-0"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add achievement form */}
                <div className="p-4 rounded-xl border border-dashed border-border/80 bg-muted/20 space-y-3">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Plus className="h-3.5 w-3.5 text-primary" /> Add Milestone / Accreditation
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <Input
                      placeholder="Title or Honor *"
                      value={newAchievement.title}
                      onChange={(e) => setNewAchievement({ ...newAchievement, title: e.target.value })}
                    />
                    <Input
                      placeholder="Awarding Body / Issuer"
                      value={newAchievement.issuer}
                      onChange={(e) => setNewAchievement({ ...newAchievement, issuer: e.target.value })}
                    />
                    <Input
                      placeholder="Year (e.g. 2024)"
                      type="number"
                      value={newAchievement.year}
                      onChange={(e) => setNewAchievement({ ...newAchievement, year: e.target.value })}
                    />
                  </div>
                  <Input
                    placeholder="Short description or criteria met..."
                    value={newAchievement.description}
                    onChange={(e) => setNewAchievement({ ...newAchievement, description: e.target.value })}
                  />
                  <div className="flex justify-end">
                    <Button type="button" size="sm" variant="outline" onClick={handleAddAchievement} className="text-xs">
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add Achievement
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 5: Governance & Settings */}
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
            disabled={updateMutation.isPending || (!isDirty && !showcaseDirty)}
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
