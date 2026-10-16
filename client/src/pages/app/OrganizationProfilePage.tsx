import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Calendar,
  Globe,
  Mail,
  Phone,
  MapPin,
  Save,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Image as ImageIcon,
  UploadCloud,
  Camera,
  Trash2,
  Sparkles,
  Plus,
  Package,
  Award,
  Layers,
  Clock,
  Navigation,
  Compass,
  Palette,
  ShieldCheck,
  Heart,
  Target,
  Lightbulb,
  Users,
  Eye,
  Check,
  Share2,
  Sun,
  Moon,
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
import type {
  OrganizationProduct,
  OrganizationProject,
  OrganizationAchievement,
  OrganizationMediaItem,
  OrganizationCustomMetric,
  OrganizationValueItem,
} from '@/types/organization.types';

export interface SectorTaxonomy {
  sectorLabel: string;
  offeringsTitle: string;
  offeringsDescription: string;
  offeringSingular: string;
  projectsTitle: string;
  projectsDescription: string;
  projectSingular: string;
  achievementsTitle: string;
  achievementsDescription: string;
  achievementSingular: string;
  mediaTitle: string;
  mediaDescription: string;
  teamMetricLabel?: string;
  customerMetricLabel?: string;
  clientFieldLabel?: string;
}

export function getSectorTaxonomy(type: string): SectorTaxonomy {
  switch (type) {
    case 'COLLEGE':
    case 'UNIVERSITY':
      return {
        sectorLabel: 'Higher Education & Academia',
        offeringsTitle: 'Academic Programs & Degrees',
        offeringsDescription: 'Featured courses, departments, and curricula.',
        offeringSingular: 'Program / Course',
        projectsTitle: 'Research & Projects',
        projectsDescription: 'Academic research and notable campus projects.',
        projectSingular: 'Project',
        achievementsTitle: 'Accreditations & Honors',
        achievementsDescription: 'Official accreditations, rankings, and academic awards.',
        achievementSingular: 'Accreditation / Award',
        mediaTitle: 'Campus Life & Events',
        mediaDescription: 'Campus galleries, conferences, and student life.',
        teamMetricLabel: 'Faculty & Researchers',
        customerMetricLabel: 'Enrolled Students',
        clientFieldLabel: 'Partner / Institution (Optional)',
      };
    case 'HOSPITAL':
      return {
        sectorLabel: 'Healthcare & Medical Center',
        offeringsTitle: 'Medical Services & Departments',
        offeringsDescription: 'Specialties, treatments, and clinical care services.',
        offeringSingular: 'Medical Service',
        projectsTitle: 'Clinical Initiatives & Research',
        projectsDescription: 'Medical programs, clinical trials, and healthcare outreach.',
        projectSingular: 'Clinical Initiative',
        achievementsTitle: 'Accreditations & Certifications',
        achievementsDescription: 'Healthcare certifications, quality standards, and awards.',
        achievementSingular: 'Certification',
        mediaTitle: 'Facilities & Care Media',
        mediaDescription: 'Medical facilities, diagnostics, and patient care moments.',
        teamMetricLabel: 'Medical Staff',
        customerMetricLabel: 'Patients Treated',
        clientFieldLabel: 'Partner / Affiliation (Optional)',
      };
    case 'NGO':
      return {
        sectorLabel: 'Non-Profit & Social Impact',
        offeringsTitle: 'Programs & Causes',
        offeringsDescription: 'Active social initiatives and community campaigns.',
        offeringSingular: 'Program / Cause',
        projectsTitle: 'Field Projects & Relief Work',
        projectsDescription: 'Community interventions and humanitarian relief projects.',
        projectSingular: 'Project',
        achievementsTitle: 'Milestones & Grants',
        achievementsDescription: 'Recognitions, government grants, and certifications.',
        achievementSingular: 'Milestone / Grant',
        mediaTitle: 'Community & Field Work',
        mediaDescription: 'Photos and media from community drives and field work.',
        teamMetricLabel: 'Volunteers & Staff',
        customerMetricLabel: 'Beneficiaries Empowered',
        clientFieldLabel: 'Partner / Donor (Optional)',
      };
    case 'STARTUP':
    case 'COMPANY':
    default:
      return {
        sectorLabel: type === 'STARTUP' ? 'Startup / High-Growth Venture' : 'Company / Enterprise',
        offeringsTitle: 'Services',
        offeringsDescription: 'Services and solutions offered by your organization.',
        offeringSingular: 'Service',
        projectsTitle: 'Projects & Portfolio',
        projectsDescription: 'Featured client work, project deliveries, and key initiatives.',
        projectSingular: 'Project',
        achievementsTitle: 'Honors & Recognitions',
        achievementsDescription: 'Certifications, patents, and industry recognitions.',
        achievementSingular: 'Award / Honor',
        mediaTitle: 'Media & Gallery',
        mediaDescription: 'Photos and media of work culture, events, and milestones.',
        teamMetricLabel: 'Team Size',
        customerMetricLabel: 'Clients / Users',
        clientFieldLabel: 'Client / Partner (Optional)',
      };
  }
}

export function countWords(text: string = ''): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

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
  foundedYear: z.preprocess((val) => (val === '' || val === null || val === undefined ? undefined : Number(val)), z.number().optional()),
  website: z.string().trim().optional(),
  contactEmail: z.string().trim().email('Invalid email').or(z.literal('')).optional(),
  contactPhone: z.string().trim().optional(),
  supportEmail: z.string().trim().email('Invalid email').or(z.literal('')).optional(),
  workingHours: z.string().trim().optional(),
  directionsUrl: z.string().trim().optional(),
  logoUrl: z.string().trim().optional(),
  bannerUrl: z.string().trim().optional(),
  address: z.string().trim().optional(),
  city: z.string().trim().optional(),
  state: z.string().trim().optional(),
  country: z.string().trim().optional(),
  zipCode: z.string().trim().optional(),
  isRemoteFriendly: z.boolean().optional(),
  // Stats
  locationShort: z.string().trim().optional(),
  statsTeamSize: z.string().trim().optional(),
  statsCustomerBase: z.string().trim().optional(),
  // About & Story with standard word count limits
  aboutCompany: z
    .string()
    .trim()
    .refine((val) => !val || countWords(val) <= 300, {
      message: 'About section exceeds the standard 300-word limit',
    })
    .optional(),
  mission: z
    .string()
    .trim()
    .refine((val) => !val || countWords(val) <= 100, {
      message: 'Mission statement exceeds the standard 100-word limit',
    })
    .optional(),
  vision: z
    .string()
    .trim()
    .refine((val) => !val || countWords(val) <= 100, {
      message: 'Vision statement exceeds the standard 100-word limit',
    })
    .optional(),
  story: z
    .string()
    .trim()
    .refine((val) => !val || countWords(val) <= 500, {
      message: 'Story section exceeds the standard 500-word limit',
    })
    .optional(),
  // Branding
  primaryColor: z.string().trim().optional(),
  secondaryColor: z.string().trim().optional(),
  accentColor: z.string().trim().optional(),
  fontHeading: z.string().trim().optional(),
  fontBody: z.string().trim().optional(),
  themeMode: z.enum(['light', 'dark', 'system']).optional(),
  // Settings
  allowMemberJobPosting: z.boolean().optional(),
  requireApprovalForCards: z.boolean().optional(),
  requireApprovalForProfileChanges: z.boolean().optional(),
  allowCustomThemes: z.boolean().optional(),
  defaultVisibility: z.enum(['public', 'internal', 'private']).optional(),
  isPublicDirectory: z.boolean().optional(),
});

type FormValues = z.infer<typeof profileSchema>;

export default function OrganizationProfilePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { activeContext } = useOrganizationContextStore();

  const orgId = activeContext.type === 'ORGANIZATION' ? activeContext.organizationId : '';
  const userRole = (activeContext.role || 'MEMBER').toUpperCase();
  const permissions = activeContext.permissions || [];
  const canEditProfile =
    userRole === 'OWNER' ||
    userRole === 'ADMIN' ||
    permissions.includes('org:edit') ||
    permissions.includes('showcase:manage');

  const [uploadingLogo, setUploadingLogo] = React.useState(false);
  const [uploadingBanner, setUploadingBanner] = React.useState(false);
  const [uploadingMedia, setUploadingMedia] = React.useState(false);

  const [products, setProducts] = React.useState<OrganizationProduct[]>([]);
  const [projects, setProjects] = React.useState<OrganizationProject[]>([]);
  const [achievements, setAchievements] = React.useState<OrganizationAchievement[]>([]);
  const [mediaGallery, setMediaGallery] = React.useState<OrganizationMediaItem[]>([]);
  const [customMetrics, setCustomMetrics] = React.useState<OrganizationCustomMetric[]>([]);
  const [values, setValues] = React.useState<OrganizationValueItem[]>([]);
  const [socialLinks, setSocialLinks] = React.useState<{ platform: string; url: string }[]>([]);

  const [showcaseDirty, setShowcaseDirty] = React.useState(false);

  // New item inputs
  const [newProduct, setNewProduct] = React.useState({ name: '', description: '', linkUrl: '', tag: '', category: '', badge: '' });
  const [newProject, setNewProject] = React.useState({ title: '', description: '', client: '', linkUrl: '', metrics: '', status: 'completed' as const });
  const [newAchievement, setNewAchievement] = React.useState({ title: '', issuer: '', year: '', description: '', metric: '' });
  const [newMedia, setNewMedia] = React.useState({ title: '', url: '', caption: '', type: 'photo' as const, date: '' });
  const [newMetric, setNewMetric] = React.useState({ label: '', value: '' });
  const [newValue, setNewValue] = React.useState({ title: '', description: '', icon: 'Sparkles' });

  const logoFileInputRef = React.useRef<HTMLInputElement>(null);
  const bannerFileInputRef = React.useRef<HTMLInputElement>(null);
  const mediaFileInputRef = React.useRef<HTMLInputElement>(null);

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
      primaryColor: '#7c3aed',
      secondaryColor: '#6366f1',
      accentColor: '#06b6d4',
      fontHeading: 'Inter',
      fontBody: 'Inter',
      themeMode: 'system',
      allowMemberJobPosting: true,
      requireApprovalForCards: true,
      requireApprovalForProfileChanges: false,
      allowCustomThemes: true,
      defaultVisibility: 'public',
      isPublicDirectory: true,
    },
  });

  const watchedType = watch('type') || ORGANIZATION_TYPE.COMPANY;
  const taxonomy = React.useMemo(() => getSectorTaxonomy(watchedType), [watchedType]);

  React.useEffect(() => {
    if (org) {
      reset({
        name: org.name || '',
        tagline: org.tagline || '',
        description: org.description || '',
        type: org.type || ORGANIZATION_TYPE.COMPANY,
        industry: org.industry || '',
        size: org.size || '1-10',
        foundedYear: org.foundedYear || org.overviewStats?.foundedYear || undefined,
        website: org.website || '',
        contactEmail: org.contactEmail || org.contact?.email || '',
        contactPhone: org.contactPhone || org.contact?.phone || '',
        supportEmail: org.contact?.supportEmail || '',
        workingHours: org.contact?.workingHours || '',
        directionsUrl: org.contact?.directionsUrl || '',
        logoUrl: org.logoUrl || org.branding?.logoUrl || '',
        bannerUrl: org.bannerUrl || org.branding?.coverUrl || '',
        address: org.location?.address || '',
        city: org.location?.city || '',
        state: org.location?.state || '',
        country: org.location?.country || '',
        zipCode: org.location?.zipCode || '',
        isRemoteFriendly: org.location?.isRemoteFriendly || false,
        locationShort: org.overviewStats?.locationShort || '',
        statsTeamSize: org.overviewStats?.teamSize || '',
        statsCustomerBase: org.overviewStats?.customerBase || '',
        aboutCompany: org.about?.aboutCompany || org.description || '',
        mission: org.about?.mission || '',
        vision: org.about?.vision || '',
        story: org.about?.story || '',
        primaryColor: org.branding?.primaryColor || '#7c3aed',
        secondaryColor: org.branding?.secondaryColor || '#6366f1',
        accentColor: org.branding?.accentColor || '#06b6d4',
        fontHeading: org.branding?.fontHeading || 'Inter',
        fontBody: org.branding?.fontBody || 'Inter',
        themeMode: org.branding?.themeMode || 'system',
        allowMemberJobPosting: org.settings?.allowMemberJobPosting ?? true,
        requireApprovalForCards: org.settings?.requireApprovalForCards ?? true,
        requireApprovalForProfileChanges: org.settings?.requireApprovalForProfileChanges ?? false,
        allowCustomThemes: org.settings?.allowCustomThemes ?? true,
        defaultVisibility: org.settings?.defaultVisibility || 'public',
        isPublicDirectory: org.settings?.isPublicDirectory ?? true,
      });

      setProducts(org.products || []);
      setProjects(org.projects || []);
      setAchievements(org.achievements || []);
      setMediaGallery(org.mediaGallery || []);
      setCustomMetrics(org.overviewStats?.customMetrics || []);
      setValues(org.about?.values || []);
      setSocialLinks(org.socialLinks || []);
      setShowcaseDirty(false);
    }
  }, [org, reset]);

  // Product/Service Handlers
  const handleAddProduct = () => {
    if (!newProduct.name.trim()) {
      toast.error('Service name is required');
      return;
    }
    const updated = [...products, { ...newProduct, isVisible: true, order: products.length }];
    setProducts(updated);
    setNewProduct({ name: '', description: '', linkUrl: '', tag: '', category: '', badge: '' });
    setShowcaseDirty(true);
    toast.success('Service added to list! Click "Save Services" to publish it.');
  };

  const handleRemoveProduct = (index: number) => {
    setProducts((prev) => prev.filter((_, i) => i !== index));
    setShowcaseDirty(true);
  };

  // Project Handlers
  const handleAddProject = () => {
    if (!newProject.title.trim()) {
      toast.error(`${taxonomy.projectSingular} title is required`);
      return;
    }
    const updated = [...projects, { ...newProject, isVisible: true, order: projects.length }];
    setProjects(updated);
    setNewProject({ title: '', description: '', client: '', linkUrl: '', metrics: '', status: 'completed' });
    setShowcaseDirty(true);
    toast.success('Project added to list! Click "Save Projects" to publish it.');
  };

  const handleRemoveProject = (index: number) => {
    setProjects((prev) => prev.filter((_, i) => i !== index));
    setShowcaseDirty(true);
  };

  // Achievement Handlers
  const handleAddAchievement = () => {
    if (!newAchievement.title.trim()) {
      toast.error(`${taxonomy.achievementSingular} title is required`);
      return;
    }
    setAchievements((prev) => [
      ...prev,
      {
        title: newAchievement.title,
        issuer: newAchievement.issuer,
        year: newAchievement.year ? Number(newAchievement.year) : null,
        description: newAchievement.description,
        metric: newAchievement.metric,
        isVisible: true,
        order: prev.length,
      },
    ]);
    setNewAchievement({ title: '', issuer: '', year: '', description: '', metric: '' });
    setShowcaseDirty(true);
  };

  const handleRemoveAchievement = (index: number) => {
    setAchievements((prev) => prev.filter((_, i) => i !== index));
    setShowcaseDirty(true);
  };

  // Social Links Handler
  const handleAddSocialLink = () => {
    setSocialLinks((prev) => [...prev, { platform: 'LinkedIn', url: '' }]);
    setShowcaseDirty(true);
  };

  // Media Handlers
  const handleAddMedia = () => {
    if (!newMedia.url.trim()) {
      toast.error('Media URL or uploaded image is required');
      return;
    }
    setMediaGallery((prev) => [
      ...prev,
      {
        url: newMedia.url,
        title: newMedia.title,
        caption: newMedia.caption,
        type: newMedia.type,
        date: newMedia.date,
        isVisible: true,
        order: prev.length,
      },
    ]);
    setNewMedia({ title: '', url: '', caption: '', type: 'photo', date: '' });
    setShowcaseDirty(true);
  };

  const handleRemoveMedia = (index: number) => {
    setMediaGallery((prev) => prev.filter((_, i) => i !== index));
    setShowcaseDirty(true);
  };

  // Custom Metric Handlers
  const handleAddMetric = () => {
    if (!newMetric.label.trim() || !newMetric.value.trim()) {
      toast.error('Both metric label and value are required');
      return;
    }
    setCustomMetrics((prev) => [...prev, { ...newMetric }]);
    setNewMetric({ label: '', value: '' });
    setShowcaseDirty(true);
  };

  const handleRemoveMetric = (index: number) => {
    setCustomMetrics((prev) => prev.filter((_, i) => i !== index));
    setShowcaseDirty(true);
  };

  // Core Values Handlers
  const handleAddValue = () => {
    if (!newValue.title.trim()) {
      toast.error('Value title is required');
      return;
    }
    setValues((prev) => [...prev, { ...newValue }]);
    setNewValue({ title: '', description: '', icon: 'Sparkles' });
    setShowcaseDirty(true);
  };

  const handleRemoveValue = (index: number) => {
    setValues((prev) => prev.filter((_, i) => i !== index));
    setShowcaseDirty(true);
  };

  // Direct Upload Handlers
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

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      toast.error('Gallery asset must be smaller than 15MB');
      if (mediaFileInputRef.current) mediaFileInputRef.current.value = '';
      return;
    }

    try {
      setUploadingMedia(true);
      const res = await mediaApi.uploadFile(file, 'POST_ATTACHMENT');
      setNewMedia((prev) => ({ ...prev, url: res.publicUrl }));
      toast.success('Media uploaded! Fill details and click "Add to Gallery".');
    } catch (err: any) {
      console.error('[MediaUploadError]', err);
      toast.error(err?.message || 'Failed to upload media asset');
    } finally {
      setUploadingMedia(false);
      if (mediaFileInputRef.current) mediaFileInputRef.current.value = '';
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
          zipCode: data.zipCode,
          isRemoteFriendly: data.isRemoteFriendly,
        },
        contact: {
          email: data.contactEmail || '',
          phone: data.contactPhone || '',
          supportEmail: data.supportEmail || '',
          workingHours: data.workingHours || '',
          directionsUrl: data.directionsUrl || '',
        },
        overviewStats: {
          foundedYear: data.foundedYear || null,
          locationShort: data.locationShort || '',
          teamSize: data.statsTeamSize || '',
          customerBase: data.statsCustomerBase || '',
          customMetrics,
        },
        about: {
          aboutCompany: data.aboutCompany || data.description || '',
          mission: data.mission || '',
          vision: data.vision || '',
          story: data.story || '',
          values,
        },
        branding: {
          logoUrl: data.logoUrl || null,
          coverUrl: data.bannerUrl || null,
          primaryColor: data.primaryColor || '#7c3aed',
          secondaryColor: data.secondaryColor || '#6366f1',
          accentColor: data.accentColor || '#06b6d4',
          fontHeading: data.fontHeading || 'Inter',
          fontBody: data.fontBody || 'Inter',
          themeMode: data.themeMode || 'system',
        },
        products,
        projects,
        achievements,
        mediaGallery,
        socialLinks: socialLinks
          .filter((s) => s.url && s.url.trim())
          .map((s) => ({
            platform: s.platform || 'Website',
            url: s.url.trim().startsWith('http') ? s.url.trim() : `https://${s.url.trim()}`,
          })),
        settings: {
          allowMemberJobPosting: data.allowMemberJobPosting,
          requireApprovalForCards: data.requireApprovalForCards,
          requireApprovalForProfileChanges: data.requireApprovalForProfileChanges,
          allowCustomThemes: data.allowCustomThemes,
          defaultVisibility: data.defaultVisibility,
          isPublicDirectory: data.isPublicDirectory,
        },
      };
      return organizationsApi.update(orgId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org', orgId] });
      queryClient.invalidateQueries({ queryKey: ['publicOrgShowcase'] });
      setShowcaseDirty(false);
      toast.success('Organization profile & showcase updated successfully');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to update organization profile');
    },
  });

  const onSubmit = (values: FormValues) => {
    updateMutation.mutate(values);
  };

  const onFormError = (formErrors: any) => {
    console.error('[OrganizationProfileValidationErrors]', formErrors);
    const firstKey = Object.keys(formErrors)[0];
    const err = formErrors[firstKey];
    const msg = err?.message || `Please check the ${firstKey} field`;
    toast.error(msg);
  };

  const previewLogo = watch('logoUrl');
  const previewBanner = watch('bannerUrl');
  const previewName = watch('name') || org?.name || 'Organization';
  const previewPrimary = watch('primaryColor') || '#7c3aed';
  const previewSecondary = watch('secondaryColor') || '#6366f1';

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

  if (!canEditProfile) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center max-w-md mx-auto">
        <div className="h-14 w-14 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mb-4">
          <Building2 className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-bold">Access Restricted</h2>
        <p className="text-sm text-muted-foreground mt-1 mb-6">
          Editing the organization brand studio and public showcase is restricted to organization administrators.
        </p>
        <div className="flex gap-2">
          <Button onClick={() => window.open(`/c/${org?.slug || activeContext.slug}`, '_blank')} variant="outline">
            <ExternalLink className="h-4 w-4 mr-2" /> View Public Showcase
          </Button>
          <Button onClick={() => navigate('/app/org/analytics')}>
            Return to Analytics
          </Button>
        </div>
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
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
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
      <input
        ref={mediaFileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={handleMediaUpload}
      />

      {/* Header Banner & Logo Interactive Preview */}
      <div className="relative rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs group">
        <div
          className="h-44 sm:h-52 w-full relative overflow-hidden"
          style={{
            background: previewBanner
              ? `url(${previewBanner}) center/cover no-repeat`
              : `linear-gradient(135deg, ${previewPrimary}33, ${previewSecondary}22, #18181b)`,
          }}
        >
          {!previewBanner && (
            <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground/60 text-xs gap-1 backdrop-blur-2xs">
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

        <div className="p-4 sm:p-6 pt-0 relative flex flex-col md:flex-row items-center md:items-end justify-between gap-4 -mt-12 sm:-mt-16">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-3.5 sm:gap-4 min-w-0 flex-1 w-full text-center sm:text-left">
            {/* Interactive Circular Logo Avatar with Quick Upload Overlay */}
            <div className="relative group/logo shrink-0">
              <div
                className="h-24 w-24 sm:h-28 sm:w-28 rounded-full bg-white dark:bg-card ring-4 ring-card shadow-xl flex items-center justify-center overflow-hidden shrink-0 p-1.5 sm:p-2 border border-border/40"
              >
                {previewLogo ? (
                  <img src={previewLogo} alt="Logo" className="w-full h-full object-contain rounded-full" />
                ) : (
                  <Building2 className="h-10 w-10 sm:h-12 sm:w-12 text-primary" />
                )}
              </div>

              {/* Hover upload badge on Logo */}
              <button
                type="button"
                disabled={uploadingLogo}
                onClick={() => logoFileInputRef.current?.click()}
                className="absolute inset-0 rounded-full bg-black/60 backdrop-blur-2xs opacity-0 group-hover/logo:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[11px] font-semibold cursor-pointer m-0.5"
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

            <div className="mb-1 sm:mb-2 space-y-1.5 min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 sm:gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground truncate max-w-full">{previewName}</h1>
                <Badge variant="outline" className="text-[10px] sm:text-xs uppercase border-primary/40 font-semibold shrink-0">
                  {watchedType}
                </Badge>
                {org?.isVerified && (
                  <Badge variant="default" className="bg-primary/20 text-primary border-primary/30 shrink-0">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Verified
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground flex flex-wrap items-center justify-center sm:justify-start gap-x-2 gap-y-0.5">
                <span>Sector: <strong className="text-foreground">{taxonomy.sectorLabel}</strong></span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-center md:justify-end mb-2 pt-2 md:pt-0 border-t md:border-t-0 border-border/40">
            {org?.slug && (
              <a
                href={`/c/${org.slug}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs flex-1 sm:flex-initial"
              >
                <Eye className="h-3.5 w-3.5" /> View Public Showcase <ExternalLink className="h-3 w-3 opacity-70" />
              </a>
            )}
            {org?.website && (
              <a
                href={org.website.startsWith('http') ? org.website : `https://${org.website}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border border-border hover:bg-muted text-foreground/80 transition-colors flex-1 sm:flex-initial"
              >
                <Globe className="h-3.5 w-3.5" /> Website
              </a>
            )}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit, onFormError)} className="space-y-6">
        <Tabs defaultValue="general">
          <TabsList className="flex items-center overflow-x-auto no-scrollbar w-full gap-1 p-1 bg-muted/60 rounded-xl justify-start">
            <TabsTrigger value="general" className="text-xs shrink-0 whitespace-nowrap">Overview</TabsTrigger>
            <TabsTrigger value="about" className="text-xs shrink-0 whitespace-nowrap">About & Story</TabsTrigger>
            <TabsTrigger value="branding" className="text-xs shrink-0 whitespace-nowrap">Brand Kit</TabsTrigger>
            <TabsTrigger value="services" className="text-xs shrink-0 whitespace-nowrap">Services</TabsTrigger>
            <TabsTrigger value="projects" className="text-xs shrink-0 whitespace-nowrap">Projects</TabsTrigger>
            <TabsTrigger value="achievements" className="text-xs shrink-0 whitespace-nowrap">Honors</TabsTrigger>
            <TabsTrigger value="media" className="text-xs shrink-0 whitespace-nowrap">Media</TabsTrigger>
            <TabsTrigger value="contact" className="text-xs shrink-0 whitespace-nowrap">Contact</TabsTrigger>
          </TabsList>

          {/* TAB 1: General & Overview */}
          <TabsContent value="general" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Organization Core Details</CardTitle>
                <CardDescription>
                  Fundamental identity and established year settings for your organization.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                      Organization Name *
                    </label>
                    <Input {...register('name')} placeholder="Acme Technologies Inc." />
                    {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                      Sector & Organization Type *
                    </label>
                    <select
                      {...register('type')}
                      className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value={ORGANIZATION_TYPE.COMPANY}>Company / Corporation</option>
                      <option value={ORGANIZATION_TYPE.STARTUP}>Startup / High-Growth Venture</option>
                      <option value={ORGANIZATION_TYPE.COLLEGE}>College / Academy</option>
                      <option value={ORGANIZATION_TYPE.UNIVERSITY}>University / Higher Institution</option>
                      <option value={ORGANIZATION_TYPE.HOSPITAL}>Hospital / Medical Center</option>
                      <option value={ORGANIZATION_TYPE.NGO}>NGO / Non-Profit Charity</option>
                      <option value={ORGANIZATION_TYPE.OTHER}>Other Organization</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1 flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-primary" /> Established Year
                    </label>
                    <Input {...register('foundedYear')} type="number" placeholder="e.g. 2024" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                      Tagline / One-liner
                    </label>
                    <Input {...register('tagline')} placeholder="Building the next generation of intelligence" />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                        Industry / Domain
                      </label>
                      <Input {...register('industry')} placeholder="Software, Healthcare, etc." />
                    </div>

                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                        Team Scale / Size
                      </label>
                      <select
                        {...register('size')}
                        className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="1-10">1-10 Members</option>
                        <option value="11-50">11-50 Members</option>
                        <option value="51-200">51-200 Members</option>
                        <option value="201-500">201-500 Members</option>
                        <option value="500+">500+ Members</option>
                      </select>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: About, Mission, Vision, Story, Values */}
          <TabsContent value="about" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Mission, Vision & Heritage</CardTitle>
                <CardDescription>
                  Narrative statements that communicate your purpose with standard word limits.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                      About / Executive Summary
                    </label>
                    <span className={`text-[11px] font-mono ${countWords(watch('aboutCompany') || '') > 300 ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>
                      {countWords(watch('aboutCompany') || '')} / 300 words
                    </span>
                  </div>
                  <Textarea
                    {...register('aboutCompany')}
                    rows={4}
                    placeholder="Comprehensive overview of what your organization does and who you serve..."
                  />
                  {errors.aboutCompany && (
                    <p className="text-xs text-destructive mt-1">{errors.aboutCompany.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block flex items-center gap-1.5">
                        <Target className="h-3.5 w-3.5 text-primary" /> Mission Statement
                      </label>
                      <span className={`text-[11px] font-mono ${countWords(watch('mission') || '') > 100 ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>
                        {countWords(watch('mission') || '')} / 100 words
                      </span>
                    </div>
                    <Textarea
                      {...register('mission')}
                      rows={3}
                      placeholder="Our mission is to accelerate the transition to sustainable..."
                    />
                    {errors.mission && (
                      <p className="text-xs text-destructive mt-1">{errors.mission.message}</p>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block flex items-center gap-1.5">
                        <Lightbulb className="h-3.5 w-3.5 text-primary" /> Vision Statement
                      </label>
                      <span className={`text-[11px] font-mono ${countWords(watch('vision') || '') > 100 ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>
                        {countWords(watch('vision') || '')} / 100 words
                      </span>
                    </div>
                    <Textarea
                      {...register('vision')}
                      rows={3}
                      placeholder="We envision a world where digital identity empowers every..."
                    />
                    {errors.vision && (
                      <p className="text-xs text-destructive mt-1">{errors.vision.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                      Founding Story & Milestones Narrative
                    </label>
                    <span className={`text-[11px] font-mono ${countWords(watch('story') || '') > 500 ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>
                      {countWords(watch('story') || '')} / 500 words
                    </span>
                  </div>
                  <Textarea
                    {...register('story')}
                    rows={4}
                    placeholder="Founded in 2021 by a team of researchers and engineers..."
                  />
                  {errors.story && (
                    <p className="text-xs text-destructive mt-1">{errors.story.message}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Core Values Manager */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Core Values & Guiding Principles ({values.length})</CardTitle>
                    <CardDescription>
                      The foundational values your organization lives by.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {values.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {values.map((val, idx) => (
                      <div key={idx} className="p-4 rounded-xl border border-border bg-card flex items-start justify-between gap-3 shadow-2xs">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                            <h4 className="font-bold text-sm text-foreground truncate">{val.title}</h4>
                          </div>
                          {val.description && (
                            <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                              {val.description}
                            </p>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveValue(idx)}
                          className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10 shrink-0"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="p-4 rounded-xl border border-dashed border-border/80 bg-muted/20 space-y-3">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Plus className="h-3.5 w-3.5 text-primary" /> Add Core Value
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <Input
                      placeholder="Value Title (e.g. Integrity, Patient-First)"
                      value={newValue.title}
                      onChange={(e) => setNewValue({ ...newValue, title: e.target.value })}
                    />
                    <Input
                      placeholder="Description / Principle"
                      className="sm:col-span-2"
                      value={newValue.description}
                      onChange={(e) => setNewValue({ ...newValue, description: e.target.value })}
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button type="button" size="sm" variant="outline" onClick={handleAddValue} className="text-xs">
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add Value
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 3: Branding & Brand Kit */}
          <TabsContent value="branding" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Logos & Visual Assets</CardTitle>
                <CardDescription>
                  Upload your high-resolution company logo and cover banner used across employee badges, job posts, and profiles.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Logo Upload Section */}
                <div className="p-5 rounded-2xl border border-border/80 bg-muted/20 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-foreground">Organization Logo</h4>
                      <p className="text-xs text-muted-foreground">
                        Square format (PNG, JPG, SVG, WebP up to 5MB, at least 512×512px).
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
                      <div>
                        <Input
                          {...register('logoUrl')}
                          placeholder="Or paste direct image URL (https://...)"
                          className="text-xs h-8"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Banner Upload Section */}
                <div className="p-5 rounded-2xl border border-border/80 bg-muted/20 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-foreground">Cover Banner Image</h4>
                      <p className="text-xs text-muted-foreground">
                        Landscape banner (1920×640px recommended, up to 10MB).
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
                    <div className="h-28 w-full rounded-2xl bg-card border-2 border-dashed border-border overflow-hidden relative shadow-xs">
                      {previewBanner ? (
                        <img src={previewBanner} alt="Banner Preview" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground/40 text-xs">
                          No cover banner selected
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-3">
                      <Button
                        type="button"
                        disabled={uploadingBanner}
                        onClick={() => bannerFileInputRef.current?.click()}
                        className="font-semibold shadow-xs shrink-0"
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
                      <Input
                        {...register('bannerUrl')}
                        placeholder="Or paste banner image URL (https://...)"
                        className="text-xs h-8 flex-1"
                      />
                    </div>
                  </div>
                </div>

                {/* Primary Brand Color & Member Border Color */}
                <div className="p-5 rounded-2xl border border-border/80 bg-muted/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                        <Palette className="h-4 w-4 text-primary" />
                        <span>Primary Brand Color</span>
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Custom brand color used for accents and applied as the custom border around your members' profile pictures.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-7 w-7 rounded-lg border border-border shadow-xs"
                        style={{ backgroundColor: previewPrimary }}
                      />
                      <input
                        type="color"
                        value={previewPrimary}
                        onChange={(e) => setValue('primaryColor', e.target.value, { shouldDirty: true })}
                        className="h-8 w-10 cursor-pointer rounded border border-border bg-transparent p-0.5"
                      />
                    </div>
                  </div>

                  {/* Preset quick colors */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {['#7c3aed', '#2563eb', '#059669', '#d97706', '#dc2626', '#db2777', '#0891b2', '#18181b'].map((col) => (
                      <button
                        key={col}
                        type="button"
                        onClick={() => setValue('primaryColor', col, { shouldDirty: true })}
                        className={`h-7 w-7 rounded-xl border-2 transition-all ${
                          previewPrimary.toLowerCase() === col.toLowerCase()
                            ? 'border-foreground scale-110 shadow-sm'
                            : 'border-transparent hover:scale-105'
                        }`}
                        style={{ backgroundColor: col }}
                        title={col}
                      />
                    ))}
                  </div>
                </div>

                {/* Showcase Theme Preference */}
                <div className="p-5 rounded-2xl border border-border/80 bg-muted/20 space-y-3">
                  <div>
                    <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                      <Sun className="h-4 w-4 text-amber-500" />
                      <span>Showcase Theme Mode</span>
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Controls whether visitors view your public company showcase (/c/:slug) in Dark or Light mode by default.
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1">
                    {[
                      { id: 'system', label: 'System Default', icon: Sparkles },
                      { id: 'light', label: 'Always Light', icon: Sun },
                      { id: 'dark', label: 'Always Dark', icon: Moon },
                    ].map((item) => {
                      const Icon = item.icon;
                      const currentMode = watch('themeMode') || 'system';
                      const isSelected = currentMode === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setValue('themeMode', item.id as any, { shouldDirty: true })}
                          className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                            isSelected
                              ? 'border-primary bg-primary text-white shadow-xs'
                              : 'border-border bg-card hover:bg-muted text-foreground'
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5 shrink-0" />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 4: Services */}
          <TabsContent value="services" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-primary" />
                    <div>
                      <CardTitle className="text-base">Services ({products.length})</CardTitle>
                      <CardDescription>Add the professional services and solutions provided by your organization.</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={updateMutation.isPending}
                      onClick={handleSubmit(onSubmit, onFormError)}
                      className="text-xs font-semibold h-8"
                    >
                      <Save className="h-3.5 w-3.5 mr-1" /> Save Services
                    </Button>
                    <Badge variant="outline" className="text-xs">
                      Service
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {products.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {products.map((prod, idx) => (
                      <div key={idx} className="p-3.5 rounded-xl border border-border bg-card flex items-start justify-between gap-3 shadow-2xs">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm truncate">{prod.name}</span>
                            {prod.category && <Badge variant="secondary" className="text-[10px] py-0">{prod.category}</Badge>}
                          </div>
                          {prod.description && <p className="text-xs text-muted-foreground line-clamp-2">{prod.description}</p>}
                          {prod.linkUrl && (
                            <a href={prod.linkUrl} target="_blank" rel="noreferrer" className="text-[11px] text-primary hover:underline inline-flex items-center gap-1">
                              View Link <ExternalLink className="h-2.5 w-2.5" />
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

                {/* Add service form */}
                <div className="p-4 rounded-xl border border-dashed border-border/80 bg-muted/20 space-y-3">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Plus className="h-3.5 w-3.5 text-primary" /> Add Service
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <Input
                      placeholder="Service Name *"
                      value={newProduct.name}
                      onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                    />
                    <Input
                      placeholder="Category (e.g. Software, Healthcare, Consulting)"
                      value={newProduct.category}
                      onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <Input
                      placeholder="Short description of the service and deliverables..."
                      value={newProduct.description}
                      onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                    />
                    <Input
                      placeholder="Service or Booking Link (Optional)"
                      value={newProduct.linkUrl}
                      onChange={(e) => setNewProduct({ ...newProduct, linkUrl: e.target.value })}
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button type="button" size="sm" variant="outline" onClick={handleAddProduct} className="text-xs">
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add Service
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 5: Projects & Portfolio */}
          <TabsContent value="projects" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="h-5 w-5 text-primary" />
                    <div>
                      <CardTitle className="text-base">{taxonomy.projectsTitle} ({projects.length})</CardTitle>
                      <CardDescription>{taxonomy.projectsDescription}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={updateMutation.isPending}
                      onClick={handleSubmit(onSubmit, onFormError)}
                      className="text-xs font-semibold h-8"
                    >
                      <Save className="h-3.5 w-3.5 mr-1" /> Save Projects
                    </Button>
                    <Badge variant="outline" className="text-xs">
                      {taxonomy.projectSingular}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {projects.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {projects.map((proj, idx) => (
                      <div key={idx} className="p-3.5 rounded-xl border border-border bg-card flex items-start justify-between gap-3 shadow-2xs">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm truncate">{proj.title}</span>
                            {proj.client && <Badge variant="secondary" className="text-[10px] py-0">{proj.client}</Badge>}
                          </div>
                          {proj.description && <p className="text-xs text-muted-foreground line-clamp-2">{proj.description}</p>}
                          {proj.linkUrl && (
                            <a href={proj.linkUrl} target="_blank" rel="noreferrer" className="text-[11px] text-primary hover:underline inline-flex items-center gap-1">
                              View Project <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          )}
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
                    <Plus className="h-3.5 w-3.5 text-primary" /> Add {taxonomy.projectSingular}
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <Input
                      placeholder={`${taxonomy.projectSingular} Title *`}
                      value={newProject.title}
                      onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                    />
                    <Input
                      placeholder={taxonomy.clientFieldLabel || 'Client / Partner Name (Optional)'}
                      value={newProject.client}
                      onChange={(e) => setNewProject({ ...newProject, client: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <Input
                      placeholder="Brief description of the work delivered..."
                      value={newProject.description}
                      onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                    />
                    <Input
                      placeholder="Project Link or Website (Optional)"
                      value={newProject.linkUrl}
                      onChange={(e) => setNewProject({ ...newProject, linkUrl: e.target.value })}
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button type="button" size="sm" variant="outline" onClick={handleAddProject} className="text-xs">
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add {taxonomy.projectSingular}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 6: Achievements / Accreditations / Honors */}
          <TabsContent value="achievements" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-primary" />
                    <div>
                      <CardTitle className="text-base">{taxonomy.achievementsTitle} ({achievements.length})</CardTitle>
                      <CardDescription>{taxonomy.achievementsDescription}</CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {taxonomy.achievementSingular}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {achievements.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {achievements.map((ach, idx) => (
                      <div key={idx} className="p-3.5 rounded-xl border border-border bg-card flex items-start justify-between gap-3 shadow-2xs">
                        <div className="space-y-1 min-w-0">
                          <span className="font-semibold text-sm block truncate">{ach.title}</span>
                          <p className="text-xs text-muted-foreground">
                            {ach.issuer || 'Conferred'}{ach.year ? ` • ${ach.year}` : ''}
                          </p>
                          {ach.metric && <span className="text-xs font-bold text-primary block">{ach.metric}</span>}
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
                    <Plus className="h-3.5 w-3.5 text-primary" /> Add {taxonomy.achievementSingular}
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                    <Input
                      placeholder="Title or Rank *"
                      value={newAchievement.title}
                      onChange={(e) => setNewAchievement({ ...newAchievement, title: e.target.value })}
                    />
                    <Input
                      placeholder="Issuing Body (e.g. NAAC, JCI, ISO)"
                      value={newAchievement.issuer}
                      onChange={(e) => setNewAchievement({ ...newAchievement, issuer: e.target.value })}
                    />
                    <Input
                      placeholder="Year (e.g. 2024)"
                      type="number"
                      value={newAchievement.year}
                      onChange={(e) => setNewAchievement({ ...newAchievement, year: e.target.value })}
                    />
                    <Input
                      placeholder="Score / Rank Metric (e.g. Grade A++)"
                      value={newAchievement.metric}
                      onChange={(e) => setNewAchievement({ ...newAchievement, metric: e.target.value })}
                    />
                  </div>
                  <Input
                    placeholder="Short description or criteria met..."
                    value={newAchievement.description}
                    onChange={(e) => setNewAchievement({ ...newAchievement, description: e.target.value })}
                  />
                  <div className="flex justify-end">
                    <Button type="button" size="sm" variant="outline" onClick={handleAddAchievement} className="text-xs">
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add {taxonomy.achievementSingular}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 7: Media Gallery */}
          <TabsContent value="media" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-5 w-5 text-primary" />
                    <div>
                      <CardTitle className="text-base">{taxonomy.mediaTitle} ({mediaGallery.length})</CardTitle>
                      <CardDescription>{taxonomy.mediaDescription}</CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    Media Gallery
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                {mediaGallery.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {mediaGallery.map((med, idx) => (
                      <div key={idx} className="relative group rounded-xl overflow-hidden border border-border bg-card shadow-xs">
                        <div className="h-32 w-full bg-muted overflow-hidden">
                          <img src={med.url} alt={med.caption || 'Gallery'} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        </div>
                        <div className="p-2 space-y-0.5">
                          {med.title && <h5 className="font-bold text-xs truncate">{med.title}</h5>}
                          {med.caption && <p className="text-[11px] text-muted-foreground line-clamp-1">{med.caption}</p>}
                        </div>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRemoveMedia(idx)}
                          className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add media form with direct upload */}
                <div className="p-4 rounded-xl border border-dashed border-border/80 bg-muted/20 space-y-3">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <UploadCloud className="h-3.5 w-3.5 text-primary" /> Upload Image / Add Media Item
                  </span>

                  <div className="flex flex-col sm:flex-row gap-3 items-center">
                    <Button
                      type="button"
                      disabled={uploadingMedia}
                      onClick={() => mediaFileInputRef.current?.click()}
                      className="font-semibold text-xs h-9 shrink-0"
                    >
                      {uploadingMedia ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Uploading...
                        </>
                      ) : (
                        <>
                          <Camera className="h-3.5 w-3.5 mr-1.5" /> Upload Image File
                        </>
                      )}
                    </Button>
                    <Input
                      placeholder="Or enter image URL (https://...)"
                      value={newMedia.url}
                      onChange={(e) => setNewMedia({ ...newMedia, url: e.target.value })}
                      className="text-xs h-9 flex-1"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <Input
                      placeholder="Media Title (optional)"
                      value={newMedia.title}
                      onChange={(e) => setNewMedia({ ...newMedia, title: e.target.value })}
                    />
                    <Input
                      placeholder="Caption / Description"
                      value={newMedia.caption}
                      onChange={(e) => setNewMedia({ ...newMedia, caption: e.target.value })}
                    />
                    <select
                      value={newMedia.type}
                      onChange={(e: any) => setNewMedia({ ...newMedia, type: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="photo">Photo / Picture</option>
                      <option value="video">Video</option>
                      <option value="event">Event Celebration</option>
                      <option value="news">Press / News</option>
                    </select>
                  </div>

                  <div className="flex justify-end">
                    <Button type="button" size="sm" variant="outline" onClick={handleAddMedia} className="text-xs">
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add to Gallery
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 8: Contact, Hours, Map & Headquarters */}
          <TabsContent value="contact" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Headquarters & Working Hours</CardTitle>
                <CardDescription>
                  Geographic location, contact channels, and operational hours displayed to visitors.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                      Street Address
                    </label>
                    <Input {...register('address')} placeholder="100 Innovation Way, Suite 400" />
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                      City
                    </label>
                    <Input {...register('city')} placeholder="San Francisco" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                      Postal / ZIP Code
                    </label>
                    <Input {...register('zipCode')} placeholder="94105" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-border/80">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                      Primary Email
                    </label>
                    <Input {...register('contactEmail')} placeholder="contact@organization.com" />
                    {errors.contactEmail && <p className="text-xs text-destructive mt-1">{errors.contactEmail.message}</p>}
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                      Support Email
                    </label>
                    <Input {...register('supportEmail')} placeholder="support@organization.com" />
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                      Phone Number
                    </label>
                    <Input {...register('contactPhone')} placeholder="+1 (555) 019-2834" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1 flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-primary" /> Working Hours / Visiting Hours
                    </label>
                    <Input {...register('workingHours')} placeholder="e.g. Mon - Fri: 9:00 AM - 6:00 PM EST" />
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1 flex items-center gap-1.5">
                      <Navigation className="h-3.5 w-3.5 text-primary" /> Map Directions Link
                    </label>
                    <Input {...register('directionsUrl')} placeholder="https://maps.google.com/?q=..." />
                  </div>
                </div>

                <div className="pt-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                    Official Website
                  </label>
                  <Input {...register('website')} placeholder="https://organization.com" />
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-3 p-3 rounded-xl border border-border/80 bg-muted/20 cursor-pointer">
                    <input
                      type="checkbox"
                      {...register('isRemoteFriendly')}
                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20"
                    />
                    <div>
                      <span className="text-sm font-semibold">Remote-Friendly Workplace</span>
                      <p className="text-xs text-muted-foreground">
                        Showcase badge indicating distributed team operations and flexible work options.
                      </p>
                    </div>
                  </label>
                </div>
              </CardContent>
            </Card>

            {/* Social Media Links Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Share2 className="h-4 w-4 text-primary" />
                      Social Media Links
                    </CardTitle>
                    <CardDescription>
                      Connect your organization&apos;s social profiles and channels (LinkedIn, X, Instagram, GitHub, etc.).
                    </CardDescription>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddSocialLink}
                    className="text-xs font-semibold"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Social Link
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {socialLinks.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-2">
                    No social media links added yet. Click &quot;Add Social Link&quot; above to connect your official channels.
                  </p>
                ) : (
                  socialLinks.map((link, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row items-center gap-2.5 p-3 rounded-xl border border-border bg-card shadow-2xs">
                      <select
                        value={link.platform}
                        onChange={(e) => {
                          const updated = [...socialLinks];
                          updated[idx].platform = e.target.value;
                          setSocialLinks(updated);
                          setShowcaseDirty(true);
                        }}
                        className="rounded-xl border border-input bg-background px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 w-full sm:w-44"
                      >
                        <option value="LinkedIn">LinkedIn</option>
                        <option value="GitHub">GitHub</option>
                        <option value="X">X (Twitter)</option>
                        <option value="Instagram">Instagram</option>
                        <option value="YouTube">YouTube</option>
                        <option value="Facebook">Facebook</option>
                        <option value="Discord">Discord</option>
                        <option value="Dribbble">Dribbble</option>
                        <option value="Website">Website</option>
                        <option value="Other">Other</option>
                      </select>

                      <Input
                        value={link.url}
                        onChange={(e) => {
                          const updated = [...socialLinks];
                          updated[idx].url = e.target.value;
                          setSocialLinks(updated);
                          setShowcaseDirty(true);
                        }}
                        placeholder="https://..."
                        className="text-xs flex-1"
                      />

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSocialLinks((prev) => prev.filter((_, i) => i !== idx));
                          setShowcaseDirty(true);
                        }}
                        className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 shrink-0 self-end sm:self-auto"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Action Button Bar */}
        <div className="flex items-center justify-between gap-3 pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Changes will take effect immediately across all employee cards and public showcases.
          </p>
          <Button
            type="submit"
            disabled={updateMutation.isPending}
            className="px-6 py-2.5 font-semibold"
          >
            {updateMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving Changes...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" /> Save Organization Studio
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
