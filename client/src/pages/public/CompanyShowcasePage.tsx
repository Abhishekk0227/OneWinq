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
  Home,
  Menu,
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
import { Avatar } from '@/components/ui/Avatar';
import { BrandLogo } from '@/components/navigation/BrandLogo';
import { ProfileSectionsSidebar } from '@/components/profile/ProfileSectionsSidebar';
import { useTheme } from '@/app/providers/ThemeProvider';
import { getCurrencySymbol } from '@/constants/app.constants';
import type {
  Organization,
  OrganizationProduct,
  OrganizationProject,
  OrganizationAchievement,
  OrganizationMediaItem,
} from '@/types/organization.types';

const BIO_LIMIT = 280;

function BioText({ text }: { text: string }) {
  const [expanded, setExpanded] = React.useState(false);
  const isLong = text.length > BIO_LIMIT;
  const display = isLong && !expanded ? text.slice(0, BIO_LIMIT).trimEnd() + '…' : text;
  return (
    <div className="pt-1 max-w-2xl min-w-0">
      <p className="text-xs sm:text-sm text-foreground/75 leading-relaxed whitespace-pre-line break-words [overflow-wrap:anywhere] min-w-0">
        {display}
      </p>
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1 text-[11px] font-semibold text-primary hover:underline cursor-pointer"
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  );
}

function SocialBrandIcon({ platform, url, className = 'h-4 w-4' }: { platform?: string; url?: string; className?: string }) {
  const name = (platform || url || '').toLowerCase();

  if (name.includes('instagram')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="24" height="24" rx="6" fill="url(#ig-grad-org)" />
        <path d="M12 7.5C9.51472 7.5 7.5 9.51472 7.5 12C7.5 14.4853 9.51472 16.5 12 16.5C14.4853 16.5 16.5 14.4853 16.5 12C16.5 9.51472 14.4853 7.5 12 7.5ZM12 15C10.3431 15 9 13.6569 9 12C9 10.3431 10.3431 9 12 9C13.6569 9 15 10.3431 15 12C15 13.6569 13.6569 15 12 15Z" fill="white" />
        <circle cx="16.5" cy="7.5" r="1" fill="white" />
        <rect x="4.5" y="4.5" width="15" height="15" rx="4.5" stroke="white" strokeWidth="1.5" />
        <defs>
          <radialGradient id="ig-grad-org" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(6 22) rotate(-55) scale(25 25)">
            <stop stopColor="#FFDD55" />
            <stop offset="0.2" stopColor="#FF543E" />
            <stop offset="0.4" stopColor="#C837AB" />
            <stop offset="0.7" stopColor="#5851DB" />
          </radialGradient>
        </defs>
      </svg>
    );
  }

  if (name.includes('linkedin')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="#0A66C2">
        <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
      </svg>
    );
  }

  if (
    name === 'x' ||
    name === 'twitter' ||
    name.includes('twitter') ||
    name.includes('x.com') ||
    name.startsWith('x ') ||
    name.endsWith(' x') ||
    name.includes(' x ') ||
    name.includes('x/') ||
    name.includes('/x')
  ) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    );
  }

  if (name.includes('github')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
      </svg>
    );
  }

  if (name.includes('youtube')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="#FF0000">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    );
  }

  if (name.includes('facebook')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="#1877F2">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    );
  }

  return <Globe className={className} />;
}

function getShowcaseTaxonomy(type: string) {
  switch (type) {
    case 'COLLEGE':
    case 'UNIVERSITY':
      return {
        sectorLabel: 'Higher Education & Academia',
        teamLabel: 'Faculty & Scholars',
        customerLabel: 'Students & Alumni',
        offeringSingular: 'Program / Course',
        offeringsTitle: 'Academic Programs & Degrees',
        offeringsDescription: 'Featured degree programs, courses, and curricula.',
        projectSingular: 'Project',
        projectsTitle: 'Research & Projects',
        projectsDescription: 'Academic research and institutional initiatives.',
        achievementSingular: 'Accreditation / Award',
        achievementsTitle: 'Accreditations & Honors',
        achievementsDescription: 'Official government certifications, rankings, and academic medals.',
        mediaTitle: 'Campus Gallery & Events',
        mediaDescription: 'Visual moments across university campus life and events.',
      };
    case 'HOSPITAL':
      return {
        sectorLabel: 'Healthcare & Medical Center',
        teamLabel: 'Medical Staff & Specialists',
        customerLabel: 'Patients Treated',
        offeringSingular: 'Medical Service',
        offeringsTitle: 'Medical Services & Specialties',
        offeringsDescription: 'Healthcare specialties, clinical departments, and patient care services.',
        projectSingular: 'Clinical Initiative',
        projectsTitle: 'Clinical Initiatives & Research',
        projectsDescription: 'Healthcare programs, medical research, and health outreach.',
        achievementSingular: 'Certification',
        achievementsTitle: 'Medical Accreditations & Standards',
        achievementsDescription: 'Healthcare compliance certifications and safety accreditations.',
        mediaTitle: 'Facilities & Care Media',
        mediaDescription: 'Diagnostic suites, operating theaters, and patient care facilities.',
      };
    case 'NGO':
      return {
        sectorLabel: 'Non-Profit & Social Impact',
        teamLabel: 'Volunteers & Staff',
        customerLabel: 'Lives Impacted',
        offeringSingular: 'Program / Cause',
        offeringsTitle: 'Programs & Causes',
        offeringsDescription: 'Key humanitarian programs and social welfare drives.',
        projectSingular: 'Project',
        projectsTitle: 'Field Projects & Relief Work',
        projectsDescription: 'On-the-ground interventions delivering tangible social support.',
        achievementSingular: 'Milestone / Grant',
        achievementsTitle: 'Impact Honors & Recognitions',
        achievementsDescription: 'Civic honors, government grants, and charity recognitions.',
        mediaTitle: 'Field Photos & Media',
        mediaDescription: 'Photos and media from community activities and field initiatives.',
      };
    case 'COMMUNITY':
      return {
        sectorLabel: 'Community & Network',
        teamLabel: 'Community Organizers',
        customerLabel: 'Active Members',
        offeringSingular: 'Program',
        offeringsTitle: 'Programs & Member Benefits',
        offeringsDescription: 'Community chapters, meetups, and member benefits.',
        projectSingular: 'Initiative',
        projectsTitle: 'Projects & Initiatives',
        projectsDescription: 'Member-driven initiatives and community projects.',
        achievementSingular: 'Milestone',
        achievementsTitle: 'Community Milestones',
        achievementsDescription: 'Community impact recognitions and badges.',
        mediaTitle: 'Meetups & Gatherings',
        mediaDescription: 'Highlights from meetups, AMAs, and summits.',
      };
    case 'GOVERNMENT':
      return {
        sectorLabel: 'Public Sector & Governance',
        teamLabel: 'Officials & Staff',
        customerLabel: 'Citizens Served',
        offeringSingular: 'Public Service',
        offeringsTitle: 'Public Services & Portals',
        offeringsDescription: 'Citizen services, assistance, and public portals.',
        projectSingular: 'Civic Project',
        projectsTitle: 'Projects & Developments',
        projectsDescription: 'Public infrastructure and digital governance systems.',
        achievementSingular: 'Award',
        achievementsTitle: 'Public Service Recognitions',
        achievementsDescription: 'Administrative certifications and public awards.',
        mediaTitle: 'Public Briefings & Media',
        mediaDescription: 'Ceremonies, briefings, and outreach sessions.',
      };
    case 'STARTUP':
    case 'COMPANY':
    default:
      return {
        sectorLabel: type === 'STARTUP' ? 'Startup / High-Growth Venture' : 'Company / Enterprise',
        teamLabel: 'Team Members',
        customerLabel: 'Clients / Users',
        offeringSingular: 'Product / Service',
        offeringsTitle: 'Products & Services',
        offeringsDescription: 'Products, services, and solutions offered by our team.',
        projectSingular: 'Project',
        projectsTitle: 'Projects & Portfolio',
        projectsDescription: 'Featured client work, project deliveries, and key initiatives.',
        achievementSingular: 'Award / Honor',
        achievementsTitle: 'Awards & Honors',
        achievementsDescription: 'Official recognitions, certifications, and industry accolades.',
        mediaTitle: 'Media & Gallery',
        mediaDescription: 'Moments from summits, team offsites, and key milestones.',
      };
  }
}

export default function CompanyShowcasePage() {
  const { slug, cardUid } = useParams<{ slug?: string; cardUid?: string }>();
  const navigate = useNavigate();
  const { resolvedTheme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = React.useState('home');
  const [isSectionsDrawerOpen, setIsSectionsDrawerOpen] = React.useState(false);

  const cleanSlug = (slug || cardUid || '').trim().replace(/^@+/, '');
  const isCardUid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanSlug);
  const effectiveSlug = isCardUid ? cleanSlug : cleanSlug.toLowerCase();

  // Primary Query: Fetch organization showcase data
  const {
    data: orgData,
    isLoading: isOrgLoading,
    error: orgError,
  } = useQuery({
    queryKey: ['publicOrgShowcase', effectiveSlug],
    queryFn: () => organizationsApi.getBySlug(effectiveSlug),
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

  const isOwnerOrAdmin = Boolean(
    user &&
      org &&
      (org.ownerId === user.id ||
        (org as any)?.owner === user.id ||
        (org as any)?.members?.some(
          (m: any) =>
            (m.userId === user.id || m.user === user.id || m._id === user.id) &&
            (m.role === 'OWNER' || m.role === 'ADMIN')
        ))
  );

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

  const handleSelectTab = (tabId: string) => {
    setActiveTab(tabId);
    setIsSectionsDrawerOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  const profileTabs = [
    { id: 'home', label: 'Home', icon: <Home className="h-4 w-4" />, description: 'Organization identity, overview & stats' },
    ...(aboutText || missionText || visionText || storyText || coreValues.length > 0
      ? [{ id: 'about', label: 'About & Story', icon: <Building2 className="h-4 w-4" />, description: 'Mission, vision, core values & story' }]
      : []),
    ...(products.length > 0
      ? [{ id: 'offerings', label: 'Products & Services', icon: <Package className="h-4 w-4" />, count: products.length, description: taxonomy.offeringsDescription }]
      : []),
    ...(projects.length > 0
      ? [{ id: 'projects', label: 'Projects', icon: <Layers className="h-4 w-4" />, count: projects.length, description: taxonomy.projectsDescription }]
      : []),
    ...(achievements.length > 0
      ? [{ id: 'achievements', label: 'Honors', icon: <Award className="h-4 w-4" />, count: achievements.length, description: taxonomy.achievementsDescription }]
      : []),
    ...(mediaGallery.length > 0
      ? [{ id: 'media', label: 'Media', icon: <ImageIcon className="h-4 w-4" />, count: mediaGallery.length, description: taxonomy.mediaDescription }]
      : []),
    ...(org.executives && org.executives.length > 0
      ? [{ id: 'leadership', label: 'Leadership', icon: <Users className="h-4 w-4" />, count: org.executives.length, description: 'Executive board and leadership team' }]
      : []),
    ...(companyPosts.length > 0
      ? [{ id: 'posts', label: 'Updates', icon: <Bell className="h-4 w-4" />, count: companyPosts.length, description: 'Official announcements and updates' }]
      : []),
    ...(jobs.length > 0
      ? [{ id: 'careers', label: 'Careers', icon: <Briefcase className="h-4 w-4" />, count: jobs.length, description: 'Open career vacancies & hiring' }]
      : []),
    ...(contactEmail || contactPhone || org.location?.address || org.website
      ? [{ id: 'contact', label: 'Contact', icon: <MapPin className="h-4 w-4" />, description: 'Headquarters, inquiry channels & location' }]
      : []),
  ];

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300 pb-24 selection:bg-primary/20">
      {/* 1. Floating Top Header / Navigation (Matching User Public Profile Header) */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/95 backdrop-blur-md px-2.5 sm:px-4 py-2 sm:py-2.5 transition-colors min-w-0">
        <div className="container mx-auto flex max-w-6xl items-center justify-between gap-1.5 sm:gap-3 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            {profileTabs.length > 1 && (
              <button
                type="button"
                onClick={() => setIsSectionsDrawerOpen(true)}
                className="p-1.5 rounded-lg border border-border bg-card hover:bg-muted text-foreground transition-colors md:hidden shrink-0 cursor-pointer"
                title="Open Organization Sections Sidebar"
                aria-label="Open Organization Sections Sidebar"
              >
                <Menu className="h-4 w-4 text-primary" />
              </button>
            )}
            <BrandLogo to="/" className="inline-flex shrink-0" imgClassName="h-5 sm:h-6" />
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0 min-w-0">
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
              className="h-7 sm:h-8 text-[11px] sm:text-xs px-2 sm:px-3 shrink-0"
            >
              <span className="hidden sm:inline">Share</span>
            </Button>

            {/* Quick Follow button in top bar */}
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
                  <span className="hidden sm:inline">Following</span>
                </>
              ) : (
                <>
                  <Bell className="h-3.5 w-3.5 mr-1 shrink-0" />
                  <span>Follow</span>
                </>
              )}
            </Button>

            {isOwnerOrAdmin && (
              <Link to={`/app/organizations/${org.slug || org.id}/settings`} className="shrink-0">
                <Button size="sm" variant="subtle" className="h-7 sm:h-8 text-[11px] sm:text-xs px-2 sm:px-3 whitespace-nowrap">
                  Manage Org
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* 2. Main Canvas Grid Layout (Matching User Public Profile 2-column Structure) */}
      <main className="container mx-auto max-w-6xl px-3 sm:px-6 pt-6 animate-in fade-in duration-300">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 text-left">
          {/* Left Desktop Navigation Sidebar */}
          <div className="hidden md:block md:col-span-3 space-y-4">
            <div className="sticky top-20 rounded-3xl border border-border bg-card p-4 shadow-sm space-y-3">
              <div className="px-2 py-1 text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border/60 pb-2">
                Organization Sections
              </div>

              <div className="space-y-1">
                {profileTabs.map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => handleSelectTab(tab.id)}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all text-left cursor-pointer ${
                        isActive
                          ? 'bg-primary text-white shadow-md'
                          : 'text-foreground/80 hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        {tab.icon}
                        <span className="truncate">{tab.label}</span>
                      </div>
                      {tab.count !== undefined && (
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                            isActive ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {tab.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Sidebar Compact Org Pill */}
              <div className="pt-3 border-t border-border/60 flex items-center gap-2.5">
                <Avatar
                  src={logoImage}
                  fallback={org.name}
                  alt={org.name}
                  size="sm"
                  className="rounded-xl ring-1 ring-border shrink-0 bg-card p-0.5"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-foreground truncate">{org.name}</div>
                  <div className="text-[10px] font-mono text-muted-foreground truncate">@{org.slug}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Main Content Canvas */}
          <div className="md:col-span-9 space-y-5 min-w-0 max-w-full">
            {/* HOME TAB: Identity Hero Card + Overview Highlights */}
            {activeTab === 'home' && (
              <>
                {/* Main Hero Card (Identical layout to User Public Profile Hero) */}
                <div className="rounded-3xl border border-border bg-card shadow-card text-left relative overflow-hidden">
                  {/* Cover Banner: Custom or Default OneWinq Branded Banner */}
                  <div className="w-full aspect-[2.6/1] xs:aspect-[2.8/1] sm:aspect-auto sm:h-60 bg-muted relative overflow-hidden flex items-center justify-center">
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

                  {/* Profile Header Details */}
                  <div className="p-6 sm:p-10 space-y-6">
                    {/* Top Row: Circular Avatar overlapping banner + Handle on Right */}
                    <div className="flex flex-wrap items-end justify-between gap-4 -mt-16 sm:-mt-20">
                      <div className="h-28 w-28 sm:h-36 sm:w-36 rounded-full ring-4 ring-card shadow-xl bg-card shrink-0 overflow-hidden flex items-center justify-center p-2 border border-border/40">
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
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground">
                          @{org.slug}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex-1 space-y-3 min-w-0 max-w-full overflow-hidden">
                        <div className="min-w-0 max-w-full">
                          <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-foreground break-words [overflow-wrap:anywhere] min-w-0">
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
                            {(org.foundedYear || org.overviewStats?.foundedYear) && (
                              <Badge variant="secondary" className="text-xs font-semibold px-2.5 py-0.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                                <Calendar className="h-3 w-3 mr-1" /> Est. {org.foundedYear || org.overviewStats?.foundedYear}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm sm:text-base font-medium text-primary mt-0.5 break-words [overflow-wrap:anywhere] min-w-0">
                            {taxonomy.sectorLabel}
                          </p>
                        </div>

                        {/* Taxonomy & Metadata Badges */}
                        <div className="flex flex-wrap items-center gap-2 pt-1 max-w-full">
                          {(org.foundedYear || org.overviewStats?.foundedYear) && (
                            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shadow-2xs">
                              <Calendar className="h-3.5 w-3.5 shrink-0" />
                              <span>Established {org.foundedYear || org.overviewStats?.foundedYear}</span>
                            </span>
                          )}

                          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-primary/10 text-primary border border-primary/20 shadow-xs">
                            <Building2 className="h-3.5 w-3.5 shrink-0" />
                            <span>{taxonomy.sectorLabel}</span>
                          </span>

                          {org.industry && (
                            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-muted/60 text-foreground/80 border border-border/70 shadow-2xs">
                              <Briefcase className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span>{org.industry}</span>
                            </span>
                          )}

                          {(org.size || org.overviewStats?.teamSize) && (
                            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-muted/60 text-foreground/80 border border-border/70 shadow-2xs">
                              <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span>{org.size || org.overviewStats?.teamSize} Scale</span>
                            </span>
                          )}

                          {org.location?.city && (
                            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shadow-2xs">
                              <MapPin className="h-3.5 w-3.5 shrink-0" />
                              <span>{org.location.city}{org.location.country ? `, ${org.location.country}` : ''}</span>
                            </span>
                          )}

                          {org.location?.isRemoteFriendly && (
                            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-2xs">
                              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                              <span>Remote-Friendly</span>
                            </span>
                          )}
                        </div>

                        {/* Tagline / Bio Text with Expand Toggle */}
                        {org.tagline && (
                          <BioText text={org.tagline} />
                        )}

                        {/* Action & Contact Buttons Row */}
                        <div className="flex flex-wrap items-center gap-2 pt-2 min-w-0 max-w-full">
                          {/* Follow Button */}
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
                            className="h-8 px-3.5 rounded-xl font-bold text-xs shadow-xs"
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

                          {/* Website Button */}
                          {org.website && (
                            <a
                              href={org.website.startsWith('http') ? org.website : `https://${org.website}`}
                              target="_blank"
                              rel="noreferrer"
                              onClick={() => handleTrackLink(org.website, 'Official Website')}
                              className="p-2 sm:px-3 sm:py-2 rounded-2xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition-all hover:scale-105 active:scale-95 shadow-2xs cursor-pointer inline-flex items-center gap-1.5 text-xs font-semibold"
                            >
                              <Globe className="h-4 w-4 shrink-0" />
                              <span className="hidden sm:inline">Website</span>
                              <ExternalLink className="h-3 w-3 opacity-60" />
                            </a>
                          )}

                          {/* Directions Button */}
                          {directionsUrl && (
                            <a
                              href={directionsUrl}
                              target="_blank"
                              rel="noreferrer"
                              onClick={() => handleTrackLink(directionsUrl, 'Office Directions')}
                              className="p-2 sm:px-3 sm:py-2 rounded-2xl bg-card hover:bg-muted text-foreground border border-border/80 transition-all hover:scale-105 active:scale-95 shadow-2xs cursor-pointer inline-flex items-center gap-1.5 text-xs font-semibold"
                            >
                              <Navigation className="h-4 w-4 text-primary shrink-0" />
                              <span className="hidden sm:inline">Directions</span>
                            </a>
                          )}

                          {/* Direct Email */}
                          {contactEmail && (
                            <a
                              href={`mailto:${contactEmail}`}
                              title={`Email: ${contactEmail}`}
                              className="p-2 sm:p-2.5 rounded-2xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 transition-all hover:scale-105 active:scale-95 shadow-2xs cursor-pointer"
                            >
                              <Mail className="h-4 w-4" />
                            </a>
                          )}

                          {/* Direct Phone */}
                          {contactPhone && (
                            <a
                              href={`tel:${contactPhone}`}
                              title={`Phone: ${contactPhone}`}
                              className="p-2 sm:p-2.5 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 transition-all hover:scale-105 active:scale-95 shadow-2xs cursor-pointer"
                            >
                              <Phone className="h-4 w-4" />
                            </a>
                          )}

                          {/* Social Links */}
                          {org.socialLinks && org.socialLinks.map((s, idx) => (
                            <a
                              key={idx}
                              href={s.url.startsWith('http') ? s.url : `https://${s.url}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={s.platform || 'Social Link'}
                              className="p-2 sm:p-2.5 rounded-2xl bg-card hover:bg-muted text-foreground border border-border/80 transition-all hover:scale-105 active:scale-95 shadow-2xs cursor-pointer"
                            >
                              <SocialBrandIcon platform={s.platform} url={s.url} />
                            </a>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Overview Highlight: About & Story Preview */}
                {aboutText && (
                  <div className="rounded-3xl border border-border bg-card p-5 sm:p-7 shadow-sm space-y-3">
                    <div className="flex items-center justify-between gap-2 pb-2 border-b border-border">
                      <div className="flex items-center gap-2 text-foreground font-bold text-sm">
                        <Building2 className="h-4 w-4 text-primary" />
                        <span>About {org.name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSelectTab('about')}
                        className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        Full Story <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <p className="text-xs sm:text-sm text-foreground/80 leading-relaxed line-clamp-3 whitespace-pre-wrap">
                      {aboutText}
                    </p>
                  </div>
                )}

                {/* Overview Highlight: Featured Products & Services Preview */}
                {products.length > 0 && (
                  <div className="rounded-3xl border border-border bg-card p-5 sm:p-7 shadow-sm space-y-4">
                    <div className="flex items-center justify-between gap-2 pb-2 border-b border-border">
                      <div className="flex items-center gap-2 text-foreground font-bold text-sm">
                        <Package className="h-4 w-4 text-primary" />
                        <span>Featured Products & Services ({products.length})</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSelectTab('offerings')}
                        className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        View All <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {products.slice(0, 3).map((prod, idx) => (
                        <div key={idx} className="p-3.5 rounded-2xl border border-border/80 bg-muted/20 flex flex-col justify-between space-y-2">
                          {prod.imageUrl && (
                            <div className="h-28 w-full rounded-xl overflow-hidden bg-muted">
                              <img src={prod.imageUrl} alt={prod.name} className="w-full h-full object-cover" />
                            </div>
                          )}
                          <div>
                            <h4 className="font-bold text-xs sm:text-sm text-foreground truncate">{prod.name}</h4>
                            {prod.category && (
                              <span className="text-[10px] text-primary font-semibold">{prod.category}</span>
                            )}
                            {prod.description && (
                              <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1">{prod.description}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Overview Highlight: Open Careers Banner */}
                {jobs.length > 0 && (
                  <div className="rounded-3xl border border-primary/20 bg-primary/5 p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="space-y-1 text-center sm:text-left">
                      <div className="flex items-center justify-center sm:justify-start gap-2 text-primary font-bold text-sm">
                        <Briefcase className="h-4 w-4" />
                        <span>We're Hiring!</span>
                        <Badge className="bg-primary text-white text-[10px]">{jobs.length} Open Roles</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Explore open positions and join the team at {org.name}.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleSelectTab('careers')}
                      className="text-xs h-8 px-4 font-bold shrink-0"
                    >
                      Explore Careers <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </div>
                )}
              </>
            )}

            {/* SECTION: About & Story */}
            {activeTab === 'about' && (
              <div className="space-y-5">
                {aboutText && (
                  <section className="rounded-3xl border border-border bg-card shadow-card p-5 sm:p-8 space-y-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Building2 className="h-4 w-4" />
                      </div>
                      <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
                        About {org.name}
                      </h2>
                    </div>
                    <div className="leading-relaxed text-xs sm:text-sm text-foreground/90 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                      {aboutText}
                    </div>
                  </section>
                )}

                {(missionText || visionText) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                )}

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
                            <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
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
              </div>
            )}

            {/* SECTION: Offerings / Products */}
            {activeTab === 'offerings' && products.length > 0 && (
              <section className="rounded-3xl border border-border bg-card shadow-card p-5 sm:p-8 space-y-5">
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

            {/* SECTION: Projects / Case Studies */}
            {activeTab === 'projects' && projects.length > 0 && (
              <section className="rounded-3xl border border-border bg-card shadow-card p-5 sm:p-8 space-y-5">
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
                          onClick={() => handleTrackLink(proj.linkUrl, proj.title || 'Project')}
                          className="inline-flex items-center gap-1 text-xs text-primary font-semibold hover:underline pt-1"
                        >
                          View Project <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* SECTION: Honors & Achievements */}
            {activeTab === 'achievements' && achievements.length > 0 && (
              <section className="rounded-3xl border border-border bg-card shadow-card p-5 sm:p-8 space-y-5">
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

            {/* SECTION: Media Gallery */}
            {activeTab === 'media' && mediaGallery.length > 0 && (
              <section className="rounded-3xl border border-border bg-card shadow-card p-5 sm:p-8 space-y-5">
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

            {/* SECTION: Executive Leadership & Board */}
            {activeTab === 'leadership' && org.executives && org.executives.length > 0 && (
              <section className="rounded-3xl border border-border bg-card shadow-card p-5 sm:p-8 space-y-5">
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
                        {exec.username && (
                          <Link
                            to={`/u/${exec.username}`}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline pt-1.5"
                          >
                            View Profile <ExternalLink className="h-3 w-3" />
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* SECTION: Careers & Open Positions */}
            {activeTab === 'careers' && (
              <section className="rounded-3xl border border-border bg-card shadow-card p-5 sm:p-8 space-y-5">
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

            {/* SECTION: Company Updates & Posts */}
            {activeTab === 'posts' && companyPosts.length > 0 && (
              <section className="rounded-3xl border border-border bg-card shadow-card p-5 sm:p-8 space-y-5">
                <div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Bell className="h-4 w-4" />
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

            {/* SECTION: Headquarters, Hours & Contact */}
            {activeTab === 'contact' && (
              <section className="rounded-3xl border border-border bg-card shadow-card p-5 sm:p-8 space-y-5">
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
        </div>
      </main>

      {/* 3. Fixed Bottom Navigation Bar for Mobile (Matching User Public Profile) */}
      {profileTabs.length > 1 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-xl border-t border-border/60 shadow-2xl px-3 py-1.5 flex items-center justify-around gap-1 min-w-0 md:hidden">
          {profileTabs.slice(0, 3).map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleSelectTab(tab.id)}
                className={`flex flex-col items-center justify-center gap-0.5 py-1 px-2.5 rounded-xl text-[10px] sm:text-xs font-bold transition-all cursor-pointer flex-1 max-w-[100px] ${
                  isActive
                    ? 'text-primary font-extrabold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <div className={`p-1 rounded-lg transition-colors ${isActive ? 'bg-primary/15 text-primary' : ''}`}>
                  {tab.icon}
                </div>
                <span className="truncate max-w-full">{tab.label}</span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setIsSectionsDrawerOpen(true)}
            className="flex flex-col items-center justify-center gap-0.5 py-1 px-2.5 rounded-xl text-[10px] sm:text-xs font-bold text-primary hover:text-primary/90 transition-all cursor-pointer flex-1 max-w-[100px]"
          >
            <div className="p-1 rounded-lg bg-primary/10 text-primary border border-primary/20">
              <Menu className="h-4 w-4" />
            </div>
            <span className="truncate max-w-full">All ({profileTabs.length})</span>
          </button>
        </div>
      )}

      {/* 4. Mobile Slide-Out Sections Drawer */}
      <ProfileSectionsSidebar
        isOpen={isSectionsDrawerOpen}
        onClose={() => setIsSectionsDrawerOpen(false)}
        tabs={profileTabs}
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        user={{
          displayName: org.name,
          username: org.slug,
          avatarUrl: logoImage || undefined,
          headline: org.tagline || taxonomy.sectorLabel,
        }}
        isSelf={isOwnerOrAdmin}
        editProfileUrl={`/app/organizations/${org.slug || org.id}/settings`}
        onShareClick={handleShare}
      />
    </div>
  );
}
