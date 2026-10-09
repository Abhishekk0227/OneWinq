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
  teamMetricLabel: string;
  customerMetricLabel: string;
  clientFieldLabel: string;
}

export function getSectorTaxonomy(type: string): SectorTaxonomy {
  switch (type) {
    case 'COLLEGE':
    case 'UNIVERSITY':
      return {
        sectorLabel: 'Higher Education & Academia',
        offeringsTitle: 'Academic Programs & Degrees',
        offeringsDescription: 'Featured courses, departments, faculties, and curricula.',
        offeringSingular: 'Program / Course',
        projectsTitle: 'Research Initiatives & Labs',
        projectsDescription: 'Breakthrough research, publications, and grant projects.',
        projectSingular: 'Research Project',
        achievementsTitle: 'Accreditations & Global Ranks',
        achievementsDescription: 'NAAC, NBA, NIRF, QS rankings, and academic awards.',
        achievementSingular: 'Accreditation / Ranking',
        mediaTitle: 'Campus Life & Events',
        mediaDescription: 'Campus galleries, conferences, convocations, and student life.',
        teamMetricLabel: 'Faculty & Researchers',
        customerMetricLabel: 'Enrolled Students',
        clientFieldLabel: 'Funding Agency / Partner',
      };
    case 'HOSPITAL':
      return {
        sectorLabel: 'Healthcare & Medical Sciences',
        offeringsTitle: 'Specialties & Clinical Departments',
        offeringsDescription: 'Medical wings, centers of excellence, and specialized treatments.',
        offeringSingular: 'Specialty / Department',
        projectsTitle: 'Clinical Innovations & Facilities',
        projectsDescription: 'Healthcare technology, clinical trials, and medical outreach.',
        projectSingular: 'Clinical Program',
        achievementsTitle: 'Accreditations & Certifications',
        achievementsDescription: 'JCI, NABH, healthcare quality recognitions and excellence awards.',
        achievementSingular: 'Certification / Award',
        mediaTitle: 'Facilities & Care in Action',
        mediaDescription: 'Operation suites, diagnostic labs, patient care, and camps.',
        teamMetricLabel: 'Doctors & Care Staff',
        customerMetricLabel: 'Patients Treated / Beds',
        clientFieldLabel: 'Affiliated Body / Partner',
      };
    case 'NGO':
      return {
        sectorLabel: 'Non-Profit & Social Impact',
        offeringsTitle: 'Active Causes & Initiatives',
        offeringsDescription: 'Key missions, community drives, and social welfare programs.',
        offeringSingular: 'Cause / Campaign',
        projectsTitle: 'Field Programs & Relief Projects',
        projectsDescription: 'On-ground execution, relief interventions, and humanitarian missions.',
        projectSingular: 'Relief Project',
        achievementsTitle: 'Milestones & Grants',
        achievementsDescription: 'Government grants, UN recognitions, and impact certifications.',
        achievementSingular: 'Impact Milestone',
        mediaTitle: 'Community & Field Work',
        mediaDescription: 'Field photographs, volunteer drives, and real-world impact.',
        teamMetricLabel: 'Active Volunteers & Staff',
        customerMetricLabel: 'Beneficiaries Empowered',
        clientFieldLabel: 'Beneficiary Community / Donor',
      };
    case 'STARTUP':
      return {
        sectorLabel: 'Venture & High-Growth Startup',
        offeringsTitle: 'Core Products & Tech Stack',
        offeringsDescription: 'Flagship apps, SaaS offerings, and disruptive solutions.',
        offeringSingular: 'Product / SaaS Feature',
        projectsTitle: 'Pilots & Customer Case Studies',
        projectsDescription: 'Early adopter rollouts, pilot programs, and product traction.',
        projectSingular: 'Pilot / Integration',
        achievementsTitle: 'Milestones & Funding',
        achievementsDescription: 'Accelerator cohorts, seed/Series rounds, and innovation awards.',
        achievementSingular: 'Milestone / Grant',
        mediaTitle: 'Demo Days & Culture',
        mediaDescription: 'Product demos, hackathons, team culture, and media features.',
        teamMetricLabel: 'Core Team Size',
        customerMetricLabel: 'Active Users / ARR',
        clientFieldLabel: 'Customer / Partner',
      };
    case 'COMPANY':
    default:
      return {
        sectorLabel: 'Corporate & Enterprise',
        offeringsTitle: 'Products & Enterprise Solutions',
        offeringsDescription: 'Core commercial products, client services, and solutions.',
        offeringSingular: 'Product / Service',
        projectsTitle: 'Projects & Case Studies',
        projectsDescription: 'High-impact enterprise deliveries and client transformations.',
        projectSingular: 'Project / Case Study',
        achievementsTitle: 'Honors & Industry Awards',
        achievementsDescription: 'ISO certifications, patent grants, and industry accolades.',
        achievementSingular: 'Award / Certification',
        mediaTitle: 'Life at Enterprise & Gallery',
        mediaDescription: 'Corporate summits, employee culture, and milestone celebrations.',
        teamMetricLabel: 'Workforce Size',
        customerMetricLabel: 'Active Clients Served',
        clientFieldLabel: 'Client / Beneficiary',
      };
  }
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
  // About & Story
  aboutCompany: z.string().trim().optional(),
  mission: z.string().trim().optional(),
  vision: z.string().trim().optional(),
  story: z.string().trim().optional(),
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
  const queryClient = useQueryClient();
  const { activeContext } = useOrganizationContextStore();

  const orgId = activeContext.type === 'ORGANIZATION' ? activeContext.organizationId : '';

  const [uploadingLogo, setUploadingLogo] = React.useState(false);
  const [uploadingBanner, setUploadingBanner] = React.useState(false);
  const [uploadingMedia, setUploadingMedia] = React.useState(false);

  const [products, setProducts] = React.useState<OrganizationProduct[]>([]);
  const [projects, setProjects] = React.useState<OrganizationProject[]>([]);
  const [achievements, setAchievements] = React.useState<OrganizationAchievement[]>([]);
  const [mediaGallery, setMediaGallery] = React.useState<OrganizationMediaItem[]>([]);
  const [customMetrics, setCustomMetrics] = React.useState<OrganizationCustomMetric[]>([]);
  const [values, setValues] = React.useState<OrganizationValueItem[]>([]);

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
      setShowcaseDirty(false);
    }
  }, [org, reset]);

  // Product Handlers
  const handleAddProduct = () => {
    if (!newProduct.name.trim()) {
      toast.error(`${taxonomy.offeringSingular} name is required`);
      return;
    }
    setProducts((prev) => [...prev, { ...newProduct, isVisible: true, order: prev.length }]);
    setNewProduct({ name: '', description: '', linkUrl: '', tag: '', category: '', badge: '' });
    setShowcaseDirty(true);
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
    setProjects((prev) => [...prev, { ...newProject, isVisible: true, order: prev.length }]);
    setNewProject({ title: '', description: '', client: '', linkUrl: '', metrics: '', status: 'completed' });
    setShowcaseDirty(true);
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

        <div className="p-6 pt-0 relative flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 -mt-14">
          <div className="flex items-end gap-4">
            {/* Interactive Logo Avatar with Quick Upload Overlay */}
            <div className="relative group/logo">
              <div
                className="h-28 w-28 rounded-2xl bg-card border-4 border-card shadow-lg flex items-center justify-center overflow-hidden shrink-0"
                style={{ borderColor: previewPrimary }}
              >
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
                className="absolute inset-0 rounded-2xl bg-black/60 backdrop-blur-2xs opacity-0 group-hover/logo:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[11px] font-semibold cursor-pointer m-1"
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

            <div className="mb-2 space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">{previewName}</h1>
                <Badge variant="outline" className="text-xs uppercase border-primary/40 font-semibold">
                  {watchedType}
                </Badge>
                {org?.isVerified && (
                  <Badge variant="default" className="bg-primary/20 text-primary border-primary/30">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Verified
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-2">
                <span>Sector: <strong className="text-foreground">{taxonomy.sectorLabel}</strong></span>
                <span>•</span>
                <span>slug: <span className="font-mono text-xs font-semibold text-foreground">/{org?.slug}</span></span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto mb-2">
            {org?.slug && (
              <a
                href={`/c/${org.slug}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs"
              >
                <Eye className="h-3.5 w-3.5" /> View Public Showcase <ExternalLink className="h-3 w-3 opacity-70" />
              </a>
            )}
            {org?.website && (
              <a
                href={org.website.startsWith('http') ? org.website : `https://${org.website}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border border-border hover:bg-muted text-muted-foreground transition-colors"
              >
                <Globe className="h-3.5 w-3.5" /> Website
              </a>
            )}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Tabs defaultValue="general">
          <TabsList className="grid grid-cols-4 sm:grid-cols-8 w-full gap-1 p-1 bg-muted/60 rounded-xl">
            <TabsTrigger value="general" className="text-xs">Overview</TabsTrigger>
            <TabsTrigger value="about" className="text-xs">About & Story</TabsTrigger>
            <TabsTrigger value="branding" className="text-xs">Brand Kit</TabsTrigger>
            <TabsTrigger value="offerings" className="text-xs">Offerings</TabsTrigger>
            <TabsTrigger value="projects" className="text-xs">Projects</TabsTrigger>
            <TabsTrigger value="achievements" className="text-xs">Honors</TabsTrigger>
            <TabsTrigger value="media" className="text-xs">Media</TabsTrigger>
            <TabsTrigger value="contact" className="text-xs">Contact</TabsTrigger>
          </TabsList>

          {/* TAB 1: General & Overview Stats */}
          <TabsContent value="general" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Organization Core Details</CardTitle>
                <CardDescription>
                  Fundamental taxonomy and identity settings for your organization.
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
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                    Tagline / One-liner
                  </label>
                  <Input {...register('tagline')} placeholder="Building the next generation of intelligence" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                      Industry / Domain
                    </label>
                    <Input {...register('industry')} placeholder="Software & Cloud, Healthcare, etc." />
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

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                      Founded Year
                    </label>
                    <Input {...register('foundedYear')} type="number" placeholder="2022" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Overview Stats & Key Metrics */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Impact Metrics & Showcase Stats</CardTitle>
                    <CardDescription>
                      High-visibility counters and metrics rendered across public showcases and cards.
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {taxonomy.sectorLabel}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                      Short Location
                    </label>
                    <Input {...register('locationShort')} placeholder="e.g. San Francisco, CA" />
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                      {taxonomy.teamMetricLabel} Metric
                    </label>
                    <Input {...register('statsTeamSize')} placeholder="e.g. 150+ Full-Time Engineers" />
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                      {taxonomy.customerMetricLabel} Metric
                    </label>
                    <Input {...register('statsCustomerBase')} placeholder="e.g. 50,000+ Active Users" />
                  </div>
                </div>

                {/* Custom Dynamic Metrics */}
                <div className="space-y-3 pt-2 border-t border-border/80">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Custom Statistical Highlights ({customMetrics.length})
                    </span>
                  </div>

                  {customMetrics.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {customMetrics.map((met, idx) => (
                        <div key={idx} className="p-3 rounded-xl border border-border bg-muted/30 flex items-center justify-between gap-2">
                          <div>
                            <span className="text-xs text-muted-foreground block">{met.label}</span>
                            <span className="text-sm font-bold text-foreground">{met.value}</span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveMetric(idx)}
                            className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="p-3.5 rounded-xl border border-dashed border-border/80 bg-muted/20 flex flex-col sm:flex-row gap-2.5 items-end">
                    <div className="flex-1 w-full">
                      <Input
                        placeholder="Metric Label (e.g. Placement Rate, Patent Grants, Beds)"
                        value={newMetric.label}
                        onChange={(e) => setNewMetric({ ...newMetric, label: e.target.value })}
                      />
                    </div>
                    <div className="flex-1 w-full">
                      <Input
                        placeholder="Value (e.g. 98.4%, 42+, 650 Beds)"
                        value={newMetric.value}
                        onChange={(e) => setNewMetric({ ...newMetric, value: e.target.value })}
                      />
                    </div>
                    <Button type="button" size="sm" variant="outline" onClick={handleAddMetric} className="text-xs shrink-0 h-10">
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add Metric
                    </Button>
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
                  Narrative statements that communicate your purpose to visitors, talent, and partners.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                    About / Executive Summary
                  </label>
                  <Textarea
                    {...register('aboutCompany')}
                    rows={4}
                    placeholder="Comprehensive overview of what your organization does and who you serve..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1 flex items-center gap-1.5">
                      <Target className="h-3.5 w-3.5 text-primary" /> Mission Statement
                    </label>
                    <Textarea
                      {...register('mission')}
                      rows={3}
                      placeholder="Our mission is to accelerate the transition to sustainable..."
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1 flex items-center gap-1.5">
                      <Lightbulb className="h-3.5 w-3.5 text-primary" /> Vision Statement
                    </label>
                    <Textarea
                      {...register('vision')}
                      rows={3}
                      placeholder="We envision a world where digital identity empowers every..."
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                    Founding Story & Milestones Narrative
                  </label>
                  <Textarea
                    {...register('story')}
                    rows={3}
                    placeholder="Founded in 2021 by a team of researchers and engineers..."
                  />
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
                            <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
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
              </CardContent>
            </Card>

            {/* Brand Colors & Theme Tokens */}
            <Card>
              <CardHeader>
                <CardTitle>Brand Color Tokens & Theme Styling</CardTitle>
                <CardDescription>
                  Customize signature brand colors applied to employee cards, public showcase, and badges.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2 p-3.5 rounded-xl border border-border bg-card">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                      Primary Brand Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={watch('primaryColor') || '#7c3aed'}
                        onChange={(e) => setValue('primaryColor', e.target.value, { shouldDirty: true })}
                        className="h-9 w-9 rounded-lg cursor-pointer border border-border p-0.5"
                      />
                      <Input {...register('primaryColor')} placeholder="#7c3aed" className="font-mono text-xs uppercase" />
                    </div>
                  </div>

                  <div className="space-y-2 p-3.5 rounded-xl border border-border bg-card">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                      Secondary Accent Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={watch('secondaryColor') || '#6366f1'}
                        onChange={(e) => setValue('secondaryColor', e.target.value, { shouldDirty: true })}
                        className="h-9 w-9 rounded-lg cursor-pointer border border-border p-0.5"
                      />
                      <Input {...register('secondaryColor')} placeholder="#6366f1" className="font-mono text-xs uppercase" />
                    </div>
                  </div>

                  <div className="space-y-2 p-3.5 rounded-xl border border-border bg-card">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                      Highlight Accent Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={watch('accentColor') || '#06b6d4'}
                        onChange={(e) => setValue('accentColor', e.target.value, { shouldDirty: true })}
                        className="h-9 w-9 rounded-lg cursor-pointer border border-border p-0.5"
                      />
                      <Input {...register('accentColor')} placeholder="#06b6d4" className="font-mono text-xs uppercase" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                      Heading Typography Font
                    </label>
                    <select
                      {...register('fontHeading')}
                      className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="Inter">Inter</option>
                      <option value="Plus Jakarta Sans">Plus Jakarta Sans</option>
                      <option value="Outfit">Outfit</option>
                      <option value="Poppins">Poppins</option>
                      <option value="Roboto">Roboto</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                      Body Typography Font
                    </label>
                    <select
                      {...register('fontBody')}
                      className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="Inter">Inter</option>
                      <option value="Plus Jakarta Sans">Plus Jakarta Sans</option>
                      <option value="Roboto">Roboto</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                      Theme Mode
                    </label>
                    <select
                      {...register('themeMode')}
                      className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="system">Auto / System Adapt</option>
                      <option value="dark">Always Dark</option>
                      <option value="light">Always Light</option>
                    </select>
                  </div>
                </div>

                {/* Live Brand Palette Preview Box */}
                <div
                  className="p-5 rounded-2xl border text-white relative overflow-hidden"
                  style={{
                    background: `linear-gradient(135deg, ${watch('primaryColor') || '#7c3aed'}, ${watch('secondaryColor') || '#6366f1'})`,
                  }}
                >
                  <div className="relative z-10 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] tracking-widest font-mono uppercase bg-white/20 px-2 py-0.5 rounded-md">
                        LIVE PALETTE PREVIEW
                      </span>
                      <h3 className="text-lg font-bold mt-1">{previewName}</h3>
                      <p className="text-xs opacity-90">Preview of your brand gradient token.</p>
                    </div>
                    <div
                      className="h-10 w-10 rounded-xl flex items-center justify-center font-bold text-xs"
                      style={{ backgroundColor: watch('accentColor') || '#06b6d4', color: '#000' }}
                    >
                      ACC
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 4: Offerings / Products / Programs */}
          <TabsContent value="offerings" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-primary" />
                    <div>
                      <CardTitle className="text-base">{taxonomy.offeringsTitle} ({products.length})</CardTitle>
                      <CardDescription>{taxonomy.offeringsDescription}</CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {taxonomy.offeringSingular}
                  </Badge>
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
                            {prod.tag && <Badge variant="outline" className="text-[10px] py-0">{prod.tag}</Badge>}
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

                {/* Add product form */}
                <div className="p-4 rounded-xl border border-dashed border-border/80 bg-muted/20 space-y-3">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Plus className="h-3.5 w-3.5 text-primary" /> Add {taxonomy.offeringSingular}
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <Input
                      placeholder={`${taxonomy.offeringSingular} Name *`}
                      value={newProduct.name}
                      onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                    />
                    <Input
                      placeholder="Tag (e.g. B.Tech, Cardiology, SaaS)"
                      value={newProduct.tag}
                      onChange={(e) => setNewProduct({ ...newProduct, tag: e.target.value })}
                    />
                    <Input
                      placeholder="Category / Department"
                      value={newProduct.category}
                      onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <Input
                      placeholder="Short description or curriculum details..."
                      value={newProduct.description}
                      onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                    />
                    <Input
                      placeholder="Direct URL or Brochure link"
                      value={newProduct.linkUrl}
                      onChange={(e) => setNewProduct({ ...newProduct, linkUrl: e.target.value })}
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button type="button" size="sm" variant="outline" onClick={handleAddProduct} className="text-xs">
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add {taxonomy.offeringSingular}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 5: Projects / Research / Relief */}
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
                  <Badge variant="outline" className="text-xs">
                    {taxonomy.projectSingular}
                  </Badge>
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
                          {proj.metrics && <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{proj.metrics}</p>}
                          {proj.description && <p className="text-xs text-muted-foreground line-clamp-2">{proj.description}</p>}
                          {proj.linkUrl && (
                            <a href={proj.linkUrl} target="_blank" rel="noreferrer" className="text-[11px] text-primary hover:underline inline-flex items-center gap-1">
                              Case Details <ExternalLink className="h-2.5 w-2.5" />
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
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <Input
                      placeholder={`${taxonomy.projectSingular} Title *`}
                      value={newProject.title}
                      onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                    />
                    <Input
                      placeholder={taxonomy.clientFieldLabel}
                      value={newProject.client}
                      onChange={(e) => setNewProject({ ...newProject, client: e.target.value })}
                    />
                    <Input
                      placeholder="Impact Metric (e.g. +300% ROI, 99% Recovery)"
                      value={newProject.metrics}
                      onChange={(e) => setNewProject({ ...newProject, metrics: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <Input
                      placeholder="Brief description of the work and impact achieved..."
                      value={newProject.description}
                      onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                    />
                    <Input
                      placeholder="Documentation / Publication URL"
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
          </TabsContent>
        </Tabs>

        {/* Action Button Bar */}
        <div className="flex items-center justify-between gap-3 pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Changes will take effect immediately across all employee cards and public showcases.
          </p>
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
                <Save className="h-4 w-4 mr-2" /> Save Organization Studio
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
