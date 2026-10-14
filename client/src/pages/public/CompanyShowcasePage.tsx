import * as React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cardsApi } from '@/features/cards/api/cards.api';
import {
  Building2,
  Globe,
  Mail,
  Phone,
  MapPin,
  CheckCircle2,
  ExternalLink,
  Briefcase,
  Users,
  Award,
  Package,
  Layers,
  Image as ImageIcon,
  Calendar,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  Loader2,
  Clock,
  Navigation,
  Target,
  Lightbulb,
  Heart,
  TrendingUp,
  Crown,
  Bell,
  UserCheck,
  Banknote,
  Share2,
  Sun,
  Moon,
  Copy,
  Check,
} from 'lucide-react';
import { analyticsApi } from '@/features/analytics/api/analytics.api';
import { organizationsApi } from '@/features/organizations/api/organizations.api';
import { jobsApi } from '@/features/jobs/api/jobs.api';
import { postsApi } from '@/features/posts/api/posts.api';
import { PostCard } from '@/components/posts/PostCard';
import { useAuthStore } from '@/stores/authStore';
import { toast } from '@/stores/toastStore';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { BrandLogo } from '@/components/navigation/BrandLogo';
import { useTheme } from '@/app/providers/ThemeProvider';
import { getCurrencySymbol } from '@/constants/app.constants';
import type {
  Organization,
  OrganizationProduct,
  OrganizationProject,
  OrganizationAchievement,
  OrganizationMediaItem,
} from '@/types/organization.types';

function getShowcaseTaxonomy(type: string) {
  switch (type) {
    case 'COLLEGE':
    case 'UNIVERSITY':
      return {
        sectorLabel: 'Higher Education & Academia',
        teamLabel: 'Faculty & Scholars',
        customerLabel: 'Alumni Network',
        offeringSingular: 'Degree / Program',
        offeringsTitle: 'Academic Degree Programs & Courses',
        offeringsDescription: 'Accredited faculties, undergraduate curricula, and graduate research opportunities.',
        projectSingular: 'Research Project',
        projectsTitle: 'Academic Research & Scientific Publications',
        projectsDescription: 'Breakthrough studies and laboratory discoveries lead by institutional researchers.',
        achievementSingular: 'Honor / Accreditation',
        achievementsTitle: 'Accreditations, Rankings & Global Honors',
        achievementsDescription: 'Official government certifications, global university rankings, and academic medals.',
        mediaTitle: 'Campus Gallery & Academic Life',
        mediaDescription: 'Visual moments across university libraries, auditoriums, and campus spaces.',
      };
    case 'HOSPITAL':
      return {
        sectorLabel: 'Healthcare & Medical Systems',
        teamLabel: 'Medical Staff & Specialists',
        customerLabel: 'Patients Treated',
        offeringSingular: 'Medical Department',
        offeringsTitle: 'Clinical Specialties & Patient Services',
        offeringsDescription: 'Inpatient and outpatient healthcare services provided by certified departments.',
        projectSingular: 'Clinical Trial / Study',
        projectsTitle: 'Medical Breakthroughs & Clinical Initiatives',
        projectsDescription: 'Healthcare research, surgical milestones, and community health initiatives.',
        achievementSingular: 'Clinical Certification',
        achievementsTitle: 'Medical Accreditations & Quality Standards',
        achievementsDescription: 'Healthcare compliance certifications, safety accreditations, and hospital awards.',
        mediaTitle: 'Facility & Clinical Diagnostics',
        mediaDescription: 'Modern operating theatres, diagnostic wings, and patient care centers.',
      };
    case 'NGO':
      return {
        sectorLabel: 'Non-Profit & Social Impact',
        teamLabel: 'Volunteers & Organizers',
        customerLabel: 'Lives Impacted',
        offeringSingular: 'Initiative / Program',
        offeringsTitle: 'Social Impact Campaigns & Relief Programs',
        offeringsDescription: 'Humanitarian missions, education drives, and community empowerment initiatives.',
        projectSingular: 'Impact Mission',
        projectsTitle: 'Active Field Projects & Community Missions',
        projectsDescription: 'Ongoing on-the-ground interventions and measurable sustainable outcomes.',
        achievementSingular: 'Recognition / Impact Award',
        achievementsTitle: 'Civilian Honors & Humanitarian Grants',
        achievementsDescription: 'Global charity grants, civilian recognitions, and transparency benchmarks.',
        mediaTitle: 'Field Photos & Volunteer Stories',
        mediaDescription: 'Capturing change, community smiles, and mission milestones.',
      };
    case 'STARTUP':
      return {
        sectorLabel: 'High-Growth Tech Startup',
        teamLabel: 'Core Team & Builders',
        customerLabel: 'Active Users',
        offeringSingular: 'Product / Solution',
        offeringsTitle: 'Core Products & Tech Offerings',
        offeringsDescription: 'SaaS solutions, APIs, and digital products engineered by our builders.',
        projectSingular: 'Release / Case Study',
        projectsTitle: 'Customer Implementations & Case Studies',
        projectsDescription: 'Enterprise architecture deployments and customer transformation case studies.',
        achievementSingular: 'Milestone / Award',
        achievementsTitle: 'Venture Milestones & Industry Awards',
        achievementsDescription: 'Accelerator cohorts, venture milestones, and developer ecosystem awards.',
        mediaTitle: 'Product Highlights & Culture',
        mediaDescription: 'Hackathons, product launches, and startup journey moments.',
      };
    default:
      return {
        sectorLabel: 'Corporate & Enterprise',
        teamLabel: 'Team Size',
        customerLabel: 'Clients Served',
        offeringSingular: 'Product / Service',
        offeringsTitle: 'Commercial Products & Enterprise Services',
        offeringsDescription: 'Strategic solutions designed to deliver measurable business performance.',
        projectSingular: 'Project / Client Work',
        projectsTitle: 'Client Case Studies & Key Engagements',
        projectsDescription: 'Notable projects delivered across global industries and partner networks.',
        achievementSingular: 'Achievement / Award',
        achievementsTitle: 'Industry Awards & Certifications',
        achievementsDescription: 'Official recognitions, patent grants, and industry excellence accolades.',
        mediaTitle: 'Corporate Gallery & Media',
        mediaDescription: 'Moments from corporate summits, team offsites, and key achievements.',
      };
  }
}

export default function CompanyShowcasePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { resolvedTheme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = React.useState('all');

  const cleanSlug = (slug || '').trim().replace(/^@+/, '');
  const isCardUid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanSlug);
  const effectiveSlug = isCardUid ? cleanSlug : cleanSlug.toLowerCase();

  // Primary Query: Fetch organization showcase data
  const {
    data: orgData,
    isLoading: isOrgLoading,
    error: orgError,
  } = useQuery({
    queryKey: ['publicOrgShowcase', effectiveSlug],
    queryFn: () => organizationsApi.getPublicShowcase(effectiveSlug),
    enabled: !!effectiveSlug,
    retry: false,
  });

  const org: Organization | null = (orgData as any)?.data?.organization || null;

  // Fallback check: if no organization matches, verify if this identifier is an NFC card
  const { data: cardData, isLoading: isCardLoading } = useQuery({
    queryKey: ['fallbackCardCheck', effectiveSlug],
    queryFn: () => cardsApi.resolveTap(effectiveSlug),
    enabled: (!!orgError || (!isOrgLoading && !org)) && !!effectiveSlug,
    retry: false,
  });

  React.useEffect(() => {
    if (cardData?.data) {
      const tap = cardData.data;
      if (tap.username) {
        navigate(`/u/${tap.username}`, { replace: true });
      } else if (tap.redirectUrl) {
        navigate(tap.redirectUrl, { replace: true });
      }
    }
  }, [cardData, navigate]);

  // Fetch live jobs for this company
  const { data: jobsData } = useQuery({
    queryKey: ['publicOrgJobs', org?.id],
    queryFn: () => jobsApi.listPublicJobs({ q: org?.name, limit: 10 }),
    enabled: !!org?.id,
  });
  const jobs = (jobsData as any)?.data?.jobs || [];

  // Fetch recent company posts/updates
  const { data: postsData, refetch: refetchCompanyPosts } = useQuery({
    queryKey: ['publicOrgPosts', org?.id || (org as any)?._id],
    queryFn: () => postsApi.getFeed({ organizationId: org?.id || (org as any)?._id }),
    enabled: !!(org?.id || (org as any)?._id),
  });
  const companyPosts = (postsData as any)?.data?.posts || [];

  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const orgId = org?.id || (org as any)?._id;

  // Follow Status Query
  const { data: followData } = useQuery({
    queryKey: ['org', orgId, 'follow-status'],
    queryFn: () => organizationsApi.getFollowStatus(orgId),
    enabled: !!orgId,
  });
  const followState = (followData as any)?.data || {
    isFollowing: false,
    followersCount: org?.followersCount || 0,
  };

  const followMutation = useMutation({
    mutationFn: () => organizationsApi.toggleFollow(orgId),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['org', orgId, 'follow-status'] });
      queryClient.invalidateQueries({ queryKey: ['publicOrgShowcase', slug] });
      const isNowFollowing = res?.data?.isFollowing;
      if (isNowFollowing) {
        toast.success(`You are now following ${org?.name || 'this organization'}`);
      } else {
        toast.default(`Unfollowed ${org?.name || 'this organization'}`);
      }
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Please log in to follow');
    },
  });

  const handleShare = async () => {
    if (!org) return;
    const shareUrl = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${org.name} on OneWinq`,
          text: org.tagline || `Check out ${org.name} on OneWinq`,
          url: shareUrl,
        });
        return;
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          // fallback to clipboard
        }
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Organization link copied to clipboard!');
    } catch {
      toast.error('Could not copy link');
    }
  };

  if (isOrgLoading || (isCardLoading && !org)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!org) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-background">
        <Building2 className="h-16 w-16 text-muted-foreground/40 mb-4" />
        <h1 className="text-2xl font-bold">Organization Not Found</h1>
        <p className="text-sm text-muted-foreground mt-1 mb-6">
          The organization showcase you requested does not exist or has been made private.
        </p>
        <Link to="/app">
          <Button variant="outline">Return to Platform</Button>
        </Link>
      </div>
    );
  }

  const taxonomy = getShowcaseTaxonomy(org.type || 'COMPANY');

  const products: OrganizationProduct[] = org.products?.filter((p) => p.isVisible !== false) || [];
  const projects: OrganizationProject[] = org.projects?.filter((p) => p.isVisible !== false) || [];
  const achievements: OrganizationAchievement[] = org.achievements?.filter((a) => a.isVisible !== false) || [];
  const mediaGallery: OrganizationMediaItem[] = org.mediaGallery?.filter((m) => m.isVisible !== false) || [];

  const bannerImage = org.branding?.coverUrl || org.bannerUrl;
  const logoImage = org.branding?.logoUrl || org.logoUrl;

  const customMetrics = org.overviewStats?.customMetrics || [];
  const coreValues = org.about?.values || [];
  const aboutText = org.about?.aboutCompany || org.description;
  const missionText = org.about?.mission;
  const visionText = org.about?.vision;
  const storyText = org.about?.story;

  const contactEmail = org.contact?.email || org.contactEmail;
  const contactPhone = org.contact?.phone || org.contactPhone;
  const supportEmail = org.contact?.supportEmail;
  const workingHours = org.contact?.workingHours;
  const directionsUrl = org.contact?.directionsUrl;

  const handleTrackLink = (url?: string, label?: string) => {
    if (!url || (!org?.id && !org?._id)) return;
    const currentOrgId = org.id || org._id;
    analyticsApi
      .trackLinkClick({
        organizationId: currentOrgId,
        linkUrl: url,
        label: label || 'External Link',
      })
      .catch(() => {
        // Non-blocking telemetry
      });
  };

  const showcaseTabs = [
    { id: 'all', label: 'All' },
    ...(aboutText || missionText || visionText || storyText || coreValues.length > 0
      ? [{ id: 'about', label: 'About & Story' }]
      : []),
    ...(products.length > 0
      ? [{ id: 'offerings', label: taxonomy.offeringsTitle ? 'Offerings' : 'Products', count: products.length }]
      : []),
    ...(projects.length > 0
      ? [{ id: 'projects', label: 'Projects', count: projects.length }]
      : []),
    ...(achievements.length > 0
      ? [{ id: 'achievements', label: 'Honors', count: achievements.length }]
      : []),
    ...(mediaGallery.length > 0
      ? [{ id: 'media', label: 'Media', count: mediaGallery.length }]
      : []),
    ...(org.executives && org.executives.length > 0
      ? [{ id: 'leadership', label: 'Leadership', count: org.executives.length }]
      : []),
    ...(companyPosts.length > 0
      ? [{ id: 'posts', label: 'Updates', count: companyPosts.length }]
      : []),
    ...(jobs.length > 0
      ? [{ id: 'careers', label: 'Careers', count: jobs.length }]
      : []),
    ...(contactEmail || contactPhone || org.location?.address || org.website
      ? [{ id: 'contact', label: 'Contact' }]
      : []),
  ];

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300 pb-24 selection:bg-primary/20">
      {/* 1. Floating Top Header / Navigation (Matching User Public Profile) */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/95 backdrop-blur-md px-3 sm:px-4 py-2 sm:py-2.5 transition-colors min-w-0">
        <div className="container mx-auto flex max-w-4xl items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <BrandLogo to="/" className="inline-flex shrink-0" imgClassName="h-5 sm:h-6" />
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 min-w-0">
            {/* Theme Switcher: Light / Dark */}
            <button
              type="button"
              onClick={toggleTheme}
              className="flex items-center gap-1.5 p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg border border-border bg-card/90 hover:bg-muted text-xs font-semibold text-foreground transition-all active:scale-95 shadow-xs cursor-pointer shrink-0"
              title={`Switch to ${resolvedTheme === 'dark' ? 'Light' : 'Dark'} theme`}
              aria-label="Toggle theme"
            >
              {resolvedTheme === 'dark' ? (
                <>
                  <Sun className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  <span className="hidden sm:inline">Light</span>
                </>
              ) : (
                <>
                  <Moon className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                  <span className="hidden sm:inline">Dark</span>
                </>
              )}
            </button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              leftIcon={<Share2 className="h-3.5 w-3.5" />}
              className="h-7 sm:h-8 text-[11px] sm:text-xs px-2.5 sm:px-3 shrink-0"
            >
              <span className="hidden sm:inline">Share</span>
            </Button>

            {/* Quick Follow button in top bar on sm+ */}
            <Button
              size="sm"
              variant={followState.isFollowing ? 'secondary' : 'default'}
              onClick={() => {
                if (!user) {
                  navigate('/login');
                  return;
                }
                followMutation.mutate();
              }}
              disabled={followMutation.isPending}
              className="h-7 sm:h-8 text-[11px] sm:text-xs px-2.5 sm:px-3 font-semibold shadow-xs shrink-0"
            >
              {followState.isFollowing ? (
                <>
                  <UserCheck className="h-3.5 w-3.5 mr-1 text-primary shrink-0" />
                  <span>Following</span>
                </>
              ) : (
                <>
                  <Bell className="h-3.5 w-3.5 mr-1 shrink-0" />
                  <span>Follow</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* 2. Main Canvas Container */}
      <main className="container mx-auto max-w-4xl px-3 sm:px-4 pt-4 sm:pt-6 space-y-6">
        {/* Main Organization Hero Card (Structured identically to PublicProfilePage) */}
        <div className="rounded-3xl border border-border bg-card shadow-card text-left relative overflow-hidden">
          {/* Cover Banner: Custom or Default OneWinq Branded Ambient Banner */}
          <div className="w-full aspect-[2.6/1] xs:aspect-[2.8/1] sm:aspect-auto sm:h-64 bg-muted relative overflow-hidden flex items-center justify-center">
            {bannerImage ? (
              <img
                src={bannerImage}
                alt="Cover Banner"
                className="w-full h-full object-cover object-center"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-purple-950 via-zinc-900 to-black relative flex items-center justify-center overflow-hidden border-b border-border/40 select-none">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(121,50,217,0.35),transparent_70%)]" />
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:24px_24px] opacity-40" />
                <img
                  src="/logo-white.png"
                  alt="OneWinq"
                  className="h-10 sm:h-14 w-auto object-contain relative z-10 opacity-90 drop-shadow-md"
                />
              </div>
            )}
          </div>

          {/* Profile Header Details with Circular Logo Avatar */}
          <div className="p-5 sm:p-8 lg:p-10 space-y-6">
            {/* Top row: Avatar overlapping banner + Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center sm:items-end justify-between gap-4 -mt-16 sm:-mt-22">
              {/* Circular Logo Avatar (matching user profile) */}
              <div className="h-28 w-28 sm:h-36 sm:w-36 rounded-full ring-4 ring-card shadow-2xl bg-white dark:bg-card shrink-0 overflow-hidden flex items-center justify-center p-2.5 border border-border/40">
                {logoImage ? (
                  <img
                    src={logoImage}
                    alt={org.name}
                    className="w-full h-full object-contain rounded-full"
                  />
                ) : (
                  <Building2 className="h-12 w-12 text-primary" />
                )}
              </div>

              {/* Action Buttons Row */}
              <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2 w-full sm:w-auto pt-1 sm:pt-0">
                <Button
                  size="sm"
                  variant={followState.isFollowing ? 'secondary' : 'default'}
                  onClick={() => {
                    if (!user) {
                      navigate('/login');
                      return;
                    }
                    followMutation.mutate();
                  }}
                  disabled={followMutation.isPending}
                  className="h-9 px-4 rounded-xl font-bold text-xs shadow-xs flex-1 sm:flex-initial"
                >
                  {followState.isFollowing ? (
                    <>
                      <UserCheck className="h-3.5 w-3.5 mr-1.5 text-primary" /> Following ({followState.followersCount})
                    </>
                  ) : (
                    <>
                      <Bell className="h-3.5 w-3.5 mr-1.5" /> Follow {followState.followersCount > 0 ? `(${followState.followersCount})` : ''}
                    </>
                  )}
                </Button>

                {org.website && (
                  <a
                    href={org.website.startsWith('http') ? org.website : `https://${org.website}`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => handleTrackLink(org.website, 'Official Website')}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 h-9 rounded-xl border border-border/80 bg-background/80 hover:bg-muted text-xs font-semibold shadow-xs transition-colors flex-1 sm:flex-initial"
                  >
                    <Globe className="h-3.5 w-3.5" />
                    <span>Visit Website</span>
                    <ExternalLink className="h-3 w-3 opacity-60" />
                  </a>
                )}

                {directionsUrl && (
                  <a
                    href={directionsUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => handleTrackLink(directionsUrl, 'Office Directions')}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 h-9 rounded-xl border border-border/80 bg-background/80 hover:bg-muted text-xs font-semibold shadow-xs transition-colors flex-1 sm:flex-initial"
                  >
                    <Navigation className="h-3.5 w-3.5 text-primary" />
                    <span>Directions</span>
                  </a>
                )}

                {jobs.length > 0 && (
                  <a href="#careers" className="flex-1 sm:flex-initial">
                    <Button size="sm" variant="outline" className="w-full h-9 px-3.5 rounded-xl font-bold text-xs border-primary/30 text-primary hover:bg-primary/10 shadow-xs">
                      <Briefcase className="h-3.5 w-3.5 mr-1.5" /> {jobs.length} Open Positions
                    </Button>
                  </a>
                )}
              </div>
            </div>

            {/* Organization Title, Tagline & Pill Badges */}
            <div className="space-y-3 text-center sm:text-left">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground break-words [overflow-wrap:anywhere]">
                    {org.name}
                  </h1>
                  {org.isVerified && (
                    <Badge variant="default" className="bg-primary/20 text-primary border-primary/30 font-semibold px-2.5 py-0.5 text-xs">
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Verified
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-xs uppercase font-mono px-2.5 py-0.5">
                    {org.type}
                  </Badge>
                </div>

                {org.tagline && (
                  <p className="text-sm sm:text-base font-medium text-muted-foreground leading-relaxed max-w-2xl pt-0.5 break-words [overflow-wrap:anywhere]">
                    {org.tagline}
                  </p>
                )}
              </div>

              {/* Taxonomy & Metadata Badges */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 shadow-2xs">
                  <Building2 className="h-3 w-3 shrink-0" />
                  <span>{taxonomy.sectorLabel}</span>
                </span>

                {org.industry && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-muted/60 text-foreground/80 border border-border/70 shadow-2xs">
                    <Briefcase className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span>{org.industry}</span>
                  </span>
                )}

                {(org.size || org.overviewStats?.teamSize) && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-muted/60 text-foreground/80 border border-border/70 shadow-2xs">
                    <Users className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span>{org.size || org.overviewStats?.teamSize} Scale</span>
                  </span>
                )}

                {org.location?.city && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-muted/60 text-foreground/80 border border-border/70 shadow-2xs">
                    <MapPin className="h-3 w-3 text-primary shrink-0" />
                    <span>{org.location.city}{org.location.country ? `, ${org.location.country}` : ''}</span>
                  </span>
                )}

                {org.location?.isRemoteFriendly && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-2xs">
                    Remote-Friendly
                  </span>
                )}
              </div>
            </div>

            {/* 4 Overview Impact Stat Cards (Sleek Glassmorphic Design) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5 pt-3 border-t border-border/60">
              <div className="p-3.5 sm:p-4 rounded-2xl border border-border/70 bg-muted/20 hover:bg-muted/40 transition-colors shadow-2xs">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-6 h-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Calendar className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase tracking-wider truncate">
                    Established
                  </span>
                </div>
                <div className="text-base sm:text-lg font-black text-foreground truncate">
                  {org.foundedYear || org.overviewStats?.foundedYear || 'Active'}
                </div>
              </div>

              <div className="p-3.5 sm:p-4 rounded-2xl border border-border/70 bg-muted/20 hover:bg-muted/40 transition-colors shadow-2xs">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-6 h-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Users className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase tracking-wider truncate">
                    {taxonomy.teamLabel}
                  </span>
                </div>
                <div className="text-base sm:text-lg font-black text-foreground truncate">
                  {org.overviewStats?.teamSize || org.size || '10+'}
                </div>
              </div>

              <div className="p-3.5 sm:p-4 rounded-2xl border border-border/70 bg-muted/20 hover:bg-muted/40 transition-colors shadow-2xs">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-6 h-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <TrendingUp className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase tracking-wider truncate">
                    {taxonomy.customerLabel}
                  </span>
                </div>
                <div className="text-base sm:text-lg font-black text-foreground truncate">
                  {org.overviewStats?.customerBase || 'Verified'}
                </div>
              </div>

              <div className="p-3.5 sm:p-4 rounded-2xl border border-border/70 bg-muted/20 hover:bg-muted/40 transition-colors shadow-2xs">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-6 h-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <MapPin className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase tracking-wider truncate">
                    Base Location
                  </span>
                </div>
                <div className="text-base sm:text-lg font-black text-foreground truncate">
                  {org.overviewStats?.locationShort || org.location?.city || 'Global'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Custom Statistical Highlights if configured */}
        {customMetrics.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {customMetrics.map((met, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl border border-primary/20 bg-primary/5 flex flex-col justify-between shadow-2xs"
              >
                <span className="text-xs text-muted-foreground font-medium">{met.label}</span>
                <span className="text-xl sm:text-2xl font-black text-primary mt-1">{met.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* 3. Sleek Sticky Navigation Tabs Bar (Like User Profile Sections) */}
        {showcaseTabs.length > 1 && (
          <div className="sticky top-12 z-20 -mx-3 sm:mx-0 px-3 sm:px-0 py-2 bg-background/90 backdrop-blur-md">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar p-1.5 rounded-2xl bg-muted/40 border border-border/60">
              {showcaseTabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(tab.id);
                      if (tab.id !== 'all') {
                        const el = document.getElementById(tab.id);
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      isActive
                        ? 'bg-card text-foreground shadow-xs border border-border/80 font-bold'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}
                  >
                    <span>{tab.label}</span>
                    {typeof tab.count === 'number' && (
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. Showcase Content Sections */}
        <div className="space-y-6">
          {/* Section 1: About & Narrative Story */}
          {aboutText && (activeTab === 'all' || activeTab === 'about') && (
            <section id="about" className="rounded-3xl border border-border bg-card shadow-card p-5 sm:p-8 space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Sparkles className="h-4 w-4" />
                </div>
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
                  About {org.name}
                </h2>
              </div>
              <div className="leading-relaxed text-sm sm:text-base text-foreground/90 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                {aboutText}
              </div>
            </section>
          )}

          {/* Section 2: Mission, Vision & Core Values */}
          {(missionText || visionText || storyText || coreValues.length > 0) &&
            (activeTab === 'all' || activeTab === 'about') && (
              <section className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {missionText && (
                    <div className="rounded-3xl border border-border bg-card shadow-card p-6 border-l-4 border-l-primary space-y-2">
                      <div className="flex items-center gap-2 text-primary font-bold text-sm">
                        <Target className="h-4 w-4" /> Our Mission
                      </div>
                      <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                        {missionText}
                      </p>
                    </div>
                  )}

                  {visionText && (
                    <div className="rounded-3xl border border-border bg-card shadow-card p-6 border-l-4 border-l-primary/60 space-y-2">
                      <div className="flex items-center gap-2 text-primary font-bold text-sm">
                        <Lightbulb className="h-4 w-4" /> Our Vision
                      </div>
                      <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                        {visionText}
                      </p>
                    </div>
                  )}
                </div>

                {storyText && (
                  <div className="rounded-3xl border border-border bg-card shadow-card p-6 space-y-2">
                    <h3 className="font-bold text-sm text-foreground">Our Story & Heritage</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                      {storyText}
                    </p>
                  </div>
                )}

                {coreValues.length > 0 && (
                  <div className="rounded-3xl border border-border bg-card shadow-card p-6 space-y-4">
                    <div className="flex items-center gap-2 text-foreground font-bold text-sm">
                      <Heart className="h-4 w-4 text-primary" /> Core Values & Principles
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {coreValues.map((val, idx) => (
                        <div key={idx} className="p-4 rounded-2xl border border-border/70 bg-muted/20 space-y-1.5 shadow-2xs">
                          <div className="flex items-center gap-2">
                            <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
                            <h4 className="font-bold text-sm text-foreground">{val.title}</h4>
                          </div>
                          {val.description && (
                            <p className="text-xs text-muted-foreground leading-relaxed break-words [overflow-wrap:anywhere]">
                              {val.description}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}

          {/* Section 3: Dynamic Offerings / Products / Programs */}
          {products.length > 0 && (activeTab === 'all' || activeTab === 'offerings') && (
            <section id="offerings" className="rounded-3xl border border-border bg-card shadow-card p-5 sm:p-8 space-y-5">
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Package className="h-4 w-4" />
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
                    {taxonomy.offeringsTitle}
                  </h2>
                </div>
                <p className="text-xs text-muted-foreground mt-1 ml-10.5">
                  {taxonomy.offeringsDescription}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {products.map((prod, idx) => (
                  <div key={idx} className="p-5 rounded-2xl border border-border/80 bg-muted/20 hover:bg-muted/40 flex flex-col justify-between hover:border-primary/40 transition-all shadow-xs">
                    <div className="space-y-2.5">
                      {prod.imageUrl && (
                        <div className="h-36 w-full rounded-xl overflow-hidden bg-muted mb-2">
                          <img src={prod.imageUrl} alt={prod.name} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-bold text-base text-foreground break-words [overflow-wrap:anywhere]">{prod.name}</h3>
                        {prod.tag && (
                          <Badge variant="outline" className="text-[10px] uppercase font-mono shrink-0">
                            {prod.tag}
                          </Badge>
                        )}
                      </div>
                      {prod.category && (
                        <span className="text-[11px] font-semibold text-primary block">
                          {prod.category}
                        </span>
                      )}
                      {prod.description && (
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 break-words [overflow-wrap:anywhere]">
                          {prod.description}
                        </p>
                      )}
                    </div>

                    {(prod.linkUrl || prod.ctaUrl) && (
                      <div className="pt-3 mt-3 border-t border-border/60">
                        <a
                          href={prod.linkUrl || prod.ctaUrl}
                          target="_blank"
                          rel="noreferrer"
                          onClick={() => handleTrackLink(prod.linkUrl || prod.ctaUrl, prod.name || 'Offering')}
                          className="inline-flex items-center gap-1 text-xs text-primary font-semibold hover:underline"
                        >
                          Learn More <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Section 4: Projects / Research / Case Studies */}
          {projects.length > 0 && (activeTab === 'all' || activeTab === 'projects') && (
            <section id="projects" className="rounded-3xl border border-border bg-card shadow-card p-5 sm:p-8 space-y-5">
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Layers className="h-4 w-4" />
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
                    {taxonomy.projectsTitle}
                  </h2>
                </div>
                <p className="text-xs text-muted-foreground mt-1 ml-10.5">
                  {taxonomy.projectsDescription}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {projects.map((proj, idx) => (
                  <div key={idx} className="p-5 rounded-2xl border border-border/80 bg-muted/20 hover:bg-muted/40 space-y-3 hover:border-primary/40 transition-all shadow-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-base text-foreground break-words [overflow-wrap:anywhere]">{proj.title}</h3>
                        {proj.client && (
                          <span className="text-xs text-primary font-medium">For {proj.client}</span>
                        )}
                      </div>
                      {proj.metrics && (
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs font-bold shrink-0">
                          {proj.metrics}
                        </Badge>
                      )}
                    </div>

                    {proj.description && (
                      <p className="text-xs text-muted-foreground leading-relaxed break-words [overflow-wrap:anywhere]">
                        {proj.description}
                      </p>
                    )}

                    {proj.linkUrl && (
                      <a
                        href={proj.linkUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => handleTrackLink(proj.linkUrl, proj.title || 'Project Case Study')}
                        className="inline-flex items-center gap-1 text-xs text-primary font-semibold hover:underline pt-1"
                      >
                        View Case Study <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Section 5: Achievements, Accreditations & Honors */}
          {achievements.length > 0 && (activeTab === 'all' || activeTab === 'achievements') && (
            <section id="achievements" className="rounded-3xl border border-border bg-card shadow-card p-5 sm:p-8 space-y-5">
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Award className="h-4 w-4" />
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
                    {taxonomy.achievementsTitle}
                  </h2>
                </div>
                <p className="text-xs text-muted-foreground mt-1 ml-10.5">
                  {taxonomy.achievementsDescription}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {achievements.map((ach, idx) => (
                  <div key={idx} className="p-5 rounded-2xl border border-border/80 bg-muted/20 hover:bg-muted/40 space-y-2 hover:border-primary/40 transition-all shadow-xs">
                    <div className="flex items-center gap-2 text-primary">
                      <Award className="h-5 w-5 shrink-0" />
                      <span className="font-bold text-sm text-foreground break-words [overflow-wrap:anywhere]">{ach.title}</span>
                    </div>
                    {ach.issuer && (
                      <p className="text-xs text-muted-foreground font-medium">
                        Conferred by {ach.issuer} {ach.year ? `(${ach.year})` : ''}
                      </p>
                    )}
                    {ach.metric && (
                      <Badge variant="outline" className="text-xs font-bold text-primary">
                        {ach.metric}
                      </Badge>
                    )}
                    {ach.description && (
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 break-words [overflow-wrap:anywhere]">
                        {ach.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Section 6: Media Gallery */}
          {mediaGallery.length > 0 && (activeTab === 'all' || activeTab === 'media') && (
            <section id="media" className="rounded-3xl border border-border bg-card shadow-card p-5 sm:p-8 space-y-5">
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <ImageIcon className="h-4 w-4" />
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
                    {taxonomy.mediaTitle}
                  </h2>
                </div>
                <p className="text-xs text-muted-foreground mt-1 ml-10.5">
                  {taxonomy.mediaDescription}
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {mediaGallery.map((med, idx) => (
                  <div
                    key={idx}
                    className="group relative h-40 rounded-2xl overflow-hidden bg-muted border border-border shadow-xs"
                  >
                    <img
                      src={med.url}
                      alt={med.caption || med.title || 'Media asset'}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {(med.caption || med.title) && (
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3 text-white">
                        {med.title && <span className="font-bold text-xs truncate">{med.title}</span>}
                        {med.caption && <span className="text-[11px] opacity-90 line-clamp-1">{med.caption}</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Section 7: Executive Leadership & Board */}
          {org.executives && org.executives.length > 0 && (activeTab === 'all' || activeTab === 'leadership') && (
            <section id="leadership" className="rounded-3xl border border-border bg-card shadow-card p-5 sm:p-8 space-y-5">
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                    <Crown className="h-4 w-4" />
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
                    Executive Leadership & Board
                  </h2>
                </div>
                <p className="text-xs text-muted-foreground mt-1 ml-10.5">
                  Meet the leadership team and directors steering {org.name}.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
                {org.executives.map((exec) => (
                  <div key={exec.id} className="p-4 rounded-2xl border border-border/80 bg-muted/20 hover:bg-muted/40 text-center space-y-2.5 hover:border-amber-500/40 transition-all shadow-xs relative overflow-hidden group">
                    <div className="h-16 w-16 rounded-full bg-amber-500/10 border-2 border-amber-500/30 text-amber-600 mx-auto flex items-center justify-center font-bold text-lg overflow-hidden shadow-2xs group-hover:scale-105 transition-transform">
                      {exec.avatarUrl ? (
                        <img src={exec.avatarUrl} alt={exec.displayName} className="h-full w-full object-cover rounded-full" />
                      ) : (
                        exec.displayName?.[0] || 'L'
                      )}
                    </div>

                    <div className="space-y-1">
                      <h3 className="font-bold text-xs sm:text-sm text-foreground line-clamp-1 break-words">{exec.displayName}</h3>
                      <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">
                        {exec.executivePosition?.replace(/_/g, ' ') || 'Executive'}
                      </Badge>
                      {exec.jobTitle && (
                        <p className="text-[10px] sm:text-[11px] text-muted-foreground line-clamp-1">{exec.jobTitle}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Section 8: Company Updates & Posts */}
          {companyPosts.length > 0 && (activeTab === 'all' || activeTab === 'posts') && (
            <section id="posts" className="rounded-3xl border border-border bg-card shadow-card p-5 sm:p-8 space-y-5">
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
                    Official Announcements & Updates
                  </h2>
                </div>
                <p className="text-xs text-muted-foreground mt-1 ml-10.5">
                  Official news, insights, and media shared by {org.name}.
                </p>
              </div>

              <div className="space-y-4 max-w-2xl">
                {companyPosts.map((p: any) => (
                  <PostCard key={p._id} post={p} onRefresh={() => refetchCompanyPosts()} />
                ))}
              </div>
            </section>
          )}

          {/* Section 9: Careers & Open Positions */}
          {(activeTab === 'all' || activeTab === 'careers') && (
            <section id="careers" className="rounded-3xl border border-border bg-card shadow-card p-5 sm:p-8 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Briefcase className="h-4 w-4" />
                    </div>
                    <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
                      Careers & Open Vacancies
                    </h2>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 ml-10.5">
                    Join our team at {org.name}.
                  </p>
                </div>
              </div>

              {jobs.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground rounded-2xl border border-border/60 bg-muted/10">
                  No active job vacancies currently open. Check back soon!
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {jobs.map((job: any) => (
                    <div key={job.id} className="p-4 rounded-2xl border border-border/80 bg-muted/20 hover:bg-muted/40 flex items-center justify-between gap-3 hover:border-primary/40 transition-all shadow-xs">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-sm text-foreground truncate">{job.title}</h3>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5 flex-wrap">
                          <span className="capitalize">{job.employmentType?.replace('_', ' ')}</span>
                          <span>• {job.workplaceType?.replace('_', ' ')}</span>
                          {job.location?.city && <span>• {job.location.city}</span>}
                          {job.salary && job.salary.min && job.salary.isDisclosed && (
                            <span className="text-emerald-600 font-semibold flex items-center gap-1">
                              • {getCurrencySymbol(job.salary.currency)} {job.salary.min.toLocaleString()}
                              {job.salary.max ? ` - ${job.salary.max.toLocaleString()}` : '+'} /{' '}
                              {job.salary.period?.toLowerCase()}
                            </span>
                          )}
                        </div>
                      </div>

                      <Link to="/app/jobs" className="shrink-0">
                        <Button size="sm" variant="outline" className="text-xs h-8">
                          Apply <ChevronRight className="h-3 w-3 ml-1" />
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Section 10: Headquarters, Hours & Contact */}
          {(activeTab === 'all' || activeTab === 'contact') && (
            <section id="contact" className="rounded-3xl border border-border bg-card shadow-card p-5 sm:p-8 space-y-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Building2 className="h-4 w-4" />
                </div>
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
                  Headquarters & Inquiries
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                {org.location?.address && (
                  <div className="p-4 rounded-2xl border border-border/70 bg-muted/20 space-y-1.5">
                    <span className="font-bold text-foreground uppercase tracking-wider text-[10px] block">
                      Office Location
                    </span>
                    <p className="text-muted-foreground leading-relaxed break-words [overflow-wrap:anywhere]">
                      {org.location.address}
                      <br />
                      {org.location.city}
                      {org.location.state ? `, ${org.location.state}` : ''}
                      {org.location.country ? ` ${org.location.country}` : ''}
                      {org.location.zipCode ? ` - ${org.location.zipCode}` : ''}
                    </p>
                    {directionsUrl && (
                      <a
                        href={directionsUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => handleTrackLink(directionsUrl, 'Office Directions')}
                        className="inline-flex items-center gap-1 text-primary hover:underline font-semibold mt-1"
                      >
                        <Navigation className="h-3 w-3" /> Get Directions
                      </a>
                    )}
                  </div>
                )}

                {workingHours && (
                  <div className="p-4 rounded-2xl border border-border/70 bg-muted/20 space-y-1.5">
                    <span className="font-bold text-foreground uppercase tracking-wider text-[10px] block flex items-center gap-1">
                      <Clock className="h-3 w-3 text-primary" /> Hours of Operation
                    </span>
                    <p className="text-muted-foreground leading-relaxed whitespace-pre-line break-words [overflow-wrap:anywhere]">
                      {workingHours}
                    </p>
                  </div>
                )}

                {(contactEmail || contactPhone || supportEmail) && (
                  <div className="p-4 rounded-2xl border border-border/70 bg-muted/20 space-y-1.5">
                    <span className="font-bold text-foreground uppercase tracking-wider text-[10px] block">
                      Direct Inquiries
                    </span>
                    {contactEmail && (
                      <a href={`mailto:${contactEmail}`} className="text-primary hover:underline block break-all font-medium">
                        {contactEmail}
                      </a>
                    )}
                    {supportEmail && (
                      <a href={`mailto:${supportEmail}`} className="text-muted-foreground hover:underline block text-[11px] break-all">
                        Support: {supportEmail}
                      </a>
                    )}
                    {contactPhone && <p className="text-muted-foreground">{contactPhone}</p>}
                  </div>
                )}

                {org.website && (
                  <div className="p-4 rounded-2xl border border-border/70 bg-muted/20 space-y-1.5">
                    <span className="font-bold text-foreground uppercase tracking-wider text-[10px] block">
                      Official Channels
                    </span>
                    <a
                      href={org.website.startsWith('http') ? org.website : `https://${org.website}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => handleTrackLink(org.website, 'Official Website')}
                      className="text-primary hover:underline inline-flex items-center gap-1 break-all font-medium"
                    >
                      {org.website} <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
