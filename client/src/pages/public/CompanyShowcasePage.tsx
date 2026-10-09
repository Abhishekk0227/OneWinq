import * as React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
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
} from 'lucide-react';
import { organizationsApi } from '@/features/organizations/api/organizations.api';
import { jobsApi } from '@/features/jobs/api/jobs.api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
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
        offeringsTitle: 'Academic Programs & Degrees',
        offeringsDescription: 'Featured degree courses, departments, and academic curricula.',
        projectsTitle: 'Research Initiatives & Labs',
        projectsDescription: 'Breakthrough research, publications, and university innovations.',
        achievementsTitle: 'Accreditations & Global Ranks',
        achievementsDescription: 'Official accreditations, ranking tiers, and academic awards.',
        mediaTitle: 'Campus Life & Events',
        mediaDescription: 'Glimpses of campus events, convocations, and student life.',
        teamLabel: 'Faculty & Researchers',
        customerLabel: 'Enrolled Students',
        partnerLabel: 'Funding / Academic Partner',
      };
    case 'HOSPITAL':
      return {
        sectorLabel: 'Healthcare & Medical Sciences',
        offeringsTitle: 'Specialties & Clinical Departments',
        offeringsDescription: 'Centers of excellence, advanced surgical wings, and care facilities.',
        projectsTitle: 'Clinical Innovations & Facilities',
        projectsDescription: 'Healthcare technology, patient outreach programs, and trials.',
        achievementsTitle: 'Certifications & Accreditations',
        achievementsDescription: 'Healthcare quality recognitions, NABH/JCI audits, and honors.',
        mediaTitle: 'Facilities & Care in Action',
        mediaDescription: 'Diagnostic suites, operation theaters, and medical camps.',
        teamLabel: 'Doctors & Specialists',
        customerLabel: 'Patients Treated',
        partnerLabel: 'Affiliated Institution',
      };
    case 'NGO':
      return {
        sectorLabel: 'Non-Profit & Social Impact',
        offeringsTitle: 'Active Causes & Initiatives',
        offeringsDescription: 'Key social missions, community outreach, and grassroots programs.',
        projectsTitle: 'Field Programs & Relief Missions',
        projectsDescription: 'On-ground disaster relief, community empowerment, and interventions.',
        achievementsTitle: 'Milestones & Grants',
        achievementsDescription: 'Impact milestones, foundation grants, and global recognitions.',
        mediaTitle: 'Community & Field Work',
        mediaDescription: 'Field photographs, volunteer drives, and real-world change.',
        teamLabel: 'Volunteers & Staff',
        customerLabel: 'Beneficiaries Empowered',
        partnerLabel: 'Donor / Partner',
      };
    case 'STARTUP':
      return {
        sectorLabel: 'Venture & High-Growth Startup',
        offeringsTitle: 'Core Products & Tech Stack',
        offeringsDescription: 'Disruptive solutions, software platforms, and proprietary tech.',
        projectsTitle: 'Pilots & Early Adopter Case Studies',
        projectsDescription: 'Traction metrics, product rollouts, and customer impact.',
        achievementsTitle: 'Funding Milestones & Honors',
        achievementsDescription: 'Seed rounds, accelerator cohorts, and technology accolades.',
        mediaTitle: 'Demo Days & Culture',
        mediaDescription: 'Product demos, hackathons, team culture, and media appearances.',
        teamLabel: 'Core Team',
        customerLabel: 'Active Users',
        partnerLabel: 'Client / Platform',
      };
    case 'COMPANY':
    default:
      return {
        sectorLabel: 'Corporate Enterprise',
        offeringsTitle: 'Products & Flagship Solutions',
        offeringsDescription: 'Core technologies, software platforms, and commercial offerings.',
        projectsTitle: 'Key Projects & Enterprise Impact',
        projectsDescription: 'Demonstrated real-world results and client deliveries.',
        achievementsTitle: 'Honors & Recognitions',
        achievementsDescription: 'Industry awards, ISO certifications, and enterprise achievements.',
        mediaTitle: 'Life at Enterprise & Gallery',
        mediaDescription: 'Corporate summits, employee culture, and milestone moments.',
        teamLabel: 'Team Size',
        customerLabel: 'Clients Served',
        partnerLabel: 'Client / Beneficiary',
      };
  }
}

export default function CompanyShowcasePage() {
  const { slug } = useParams<{ slug: string }>();

  const { data: orgData, isLoading, error } = useQuery({
    queryKey: ['publicOrgShowcase', slug],
    queryFn: () => organizationsApi.getBySlug(slug!),
    enabled: !!slug,
  });

  const org: Organization = (orgData as any)?.data?.organization;

  // Fetch live jobs for this company
  const { data: jobsData } = useQuery({
    queryKey: ['publicOrgJobs', org?.id],
    queryFn: () => jobsApi.listPublicJobs({ q: org?.name, limit: 10 }),
    enabled: !!org?.id,
  });
  const jobs = (jobsData as any)?.data?.jobs || [];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !org) {
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

  const primaryColor = org.branding?.primaryColor || '#7c3aed';
  const secondaryColor = org.branding?.secondaryColor || '#6366f1';
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

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 selection:bg-primary/20">
      {/* 1. Hero Header Banner */}
      <div className="relative">
        <div
          className="h-64 sm:h-84 w-full relative overflow-hidden"
          style={{
            background: bannerImage
              ? `url(${bannerImage}) center/cover no-repeat`
              : `linear-gradient(135deg, ${primaryColor}40, ${secondaryColor}25, #09090b)`,
          }}
        >
          {!bannerImage && (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground/30 text-base font-extrabold tracking-widest uppercase">
              {org.name}
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 relative -mt-24 sm:-mt-28">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6 pb-6 border-b border-border/80">
            <div className="flex items-end gap-5">
              <div
                className="h-28 w-28 sm:h-36 sm:w-36 rounded-3xl bg-card border-4 border-background shadow-xl flex items-center justify-center overflow-hidden shrink-0"
                style={{ borderColor: primaryColor }}
              >
                {logoImage ? (
                  <img src={logoImage} alt={org.name} className="w-full h-full object-cover" />
                ) : (
                  <Building2 className="h-14 w-14 text-primary" />
                )}
              </div>

              <div className="space-y-1.5 mb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{org.name}</h1>
                  {org.isVerified && (
                    <Badge variant="default" className="bg-primary/20 text-primary border-primary/30 font-semibold">
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Verified
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-xs uppercase font-mono">
                    {org.type}
                  </Badge>
                  <span className="text-xs text-muted-foreground font-medium hidden md:inline">
                    • {taxonomy.sectorLabel}
                  </span>
                </div>

                {org.tagline && (
                  <p className="text-sm font-medium text-muted-foreground leading-relaxed max-w-2xl">
                    {org.tagline}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-0.5">
                  {org.industry && <span>{org.industry}</span>}
                  {org.size && <span>• {org.size} Scale</span>}
                  {org.location?.city && (
                    <span className="flex items-center gap-1">
                      • <MapPin className="h-3 w-3" /> {org.location.city}
                      {org.location.country ? `, ${org.location.country}` : ''}
                    </span>
                  )}
                  {org.location?.isRemoteFriendly && (
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                      Remote-Friendly
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 self-stretch sm:self-auto">
              {org.website && (
                <a
                  href={org.website.startsWith('http') ? org.website : `https://${org.website}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border/80 hover:bg-muted text-xs font-semibold shadow-xs transition-colors"
                >
                  <Globe className="h-3.5 w-3.5" /> Visit Website <ExternalLink className="h-3 w-3 opacity-60" />
                </a>
              )}
              {directionsUrl && (
                <a
                  href={directionsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border/80 hover:bg-muted text-xs font-semibold shadow-xs transition-colors"
                >
                  <Navigation className="h-3.5 w-3.5 text-primary" /> Directions
                </a>
              )}
              {jobs.length > 0 && (
                <a href="#careers">
                  <Button size="sm" className="shadow-xs font-semibold">
                    <Briefcase className="h-3.5 w-3.5 mr-1.5" /> {jobs.length} Open Positions
                  </Button>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Showcase Grid */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 space-y-12">
        {/* Section 0: Impact & Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <Card className="p-4 bg-card/60 backdrop-blur-xs border-border/80">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Established
            </span>
            <div className="flex items-center gap-2 mt-1">
              <Calendar className="h-4 w-4 text-primary shrink-0" />
              <span className="text-xl font-black text-foreground">
                {org.foundedYear || org.overviewStats?.foundedYear || 'Active'}
              </span>
            </div>
          </Card>

          <Card className="p-4 bg-card/60 backdrop-blur-xs border-border/80">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block truncate">
              {taxonomy.teamLabel}
            </span>
            <div className="flex items-center gap-2 mt-1">
              <Users className="h-4 w-4 text-primary shrink-0" />
              <span className="text-xl font-black text-foreground truncate">
                {org.overviewStats?.teamSize || org.size || '10+'}
              </span>
            </div>
          </Card>

          <Card className="p-4 bg-card/60 backdrop-blur-xs border-border/80">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block truncate">
              {taxonomy.customerLabel}
            </span>
            <div className="flex items-center gap-2 mt-1">
              <TrendingUp className="h-4 w-4 text-primary shrink-0" />
              <span className="text-xl font-black text-foreground truncate">
                {org.overviewStats?.customerBase || 'Verified'}
              </span>
            </div>
          </Card>

          <Card className="p-4 bg-card/60 backdrop-blur-xs border-border/80">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Base Location
            </span>
            <div className="flex items-center gap-2 mt-1">
              <MapPin className="h-4 w-4 text-primary shrink-0" />
              <span className="text-sm sm:text-base font-bold text-foreground truncate">
                {org.overviewStats?.locationShort || org.location?.city || 'Global'}
              </span>
            </div>
          </Card>
        </div>

        {/* Custom Statistical Highlights if configured */}
        {customMetrics.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {customMetrics.map((met, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl border border-primary/20 bg-primary/5 flex flex-col justify-between"
              >
                <span className="text-xs text-muted-foreground font-medium">{met.label}</span>
                <span className="text-2xl font-black text-primary mt-1">{met.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Section 1: About & Narrative Story */}
        {aboutText && (
          <section className="space-y-4">
            <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> About {org.name}
            </h2>
            <Card className="p-6 leading-relaxed text-sm text-foreground/90 whitespace-pre-wrap shadow-xs">
              {aboutText}
            </Card>
          </section>
        )}

        {/* Section 2: Mission, Vision & Core Values */}
        {(missionText || visionText || storyText || coreValues.length > 0) && (
          <section className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {missionText && (
                <Card className="p-6 border-l-4 border-l-primary space-y-2 bg-card shadow-xs">
                  <div className="flex items-center gap-2 text-primary font-bold text-sm">
                    <Target className="h-4 w-4" /> Our Mission
                  </div>
                  <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed">
                    {missionText}
                  </p>
                </Card>
              )}

              {visionText && (
                <Card className="p-6 border-l-4 border-l-primary/60 space-y-2 bg-card shadow-xs">
                  <div className="flex items-center gap-2 text-primary font-bold text-sm">
                    <Lightbulb className="h-4 w-4" /> Our Vision
                  </div>
                  <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed">
                    {visionText}
                  </p>
                </Card>
              )}
            </div>

            {storyText && (
              <Card className="p-6 space-y-2 bg-card shadow-xs">
                <h3 className="font-bold text-sm text-foreground">Our Story & Heritage</h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {storyText}
                </p>
              </Card>
            )}

            {coreValues.length > 0 && (
              <div className="space-y-3 pt-2">
                <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                  <Heart className="h-4 w-4 text-primary" /> Core Values & Principles
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {coreValues.map((val, idx) => (
                    <Card key={idx} className="p-4 space-y-1.5 shadow-2xs">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
                        <h4 className="font-bold text-sm text-foreground">{val.title}</h4>
                      </div>
                      {val.description && (
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {val.description}
                        </p>
                      )}
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Section 3: Dynamic Offerings / Products / Programs */}
        {products.length > 0 && (
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" /> {taxonomy.offeringsTitle}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {taxonomy.offeringsDescription}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((prod, idx) => (
                <Card key={idx} className="p-5 flex flex-col justify-between hover:border-primary/40 transition-all shadow-xs">
                  <div className="space-y-2.5">
                    {prod.imageUrl && (
                      <div className="h-36 w-full rounded-xl overflow-hidden bg-muted mb-2">
                        <img src={prod.imageUrl} alt={prod.name} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-bold text-base text-foreground">{prod.name}</h3>
                      {prod.tag && (
                        <Badge variant="outline" className="text-[10px] uppercase font-mono">
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
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                        {prod.description}
                      </p>
                    )}
                  </div>

                  {(prod.linkUrl || prod.ctaUrl) && (
                    <div className="pt-3 mt-3 border-t border-border">
                      <a
                        href={prod.linkUrl || prod.ctaUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary font-semibold hover:underline"
                      >
                        Learn More <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Section 4: Projects / Research / Case Studies */}
        {projects.length > 0 && (
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" /> {taxonomy.projectsTitle}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {taxonomy.projectsDescription}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.map((proj, idx) => (
                <Card key={idx} className="p-5 space-y-3 hover:border-primary/40 transition-all shadow-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-base text-foreground">{proj.title}</h3>
                      {proj.client && (
                        <span className="text-xs text-primary font-medium">For {proj.client}</span>
                      )}
                    </div>
                    {proj.metrics && (
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs font-bold">
                        {proj.metrics}
                      </Badge>
                    )}
                  </div>

                  {proj.description && (
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {proj.description}
                    </p>
                  )}

                  {proj.linkUrl && (
                    <a
                      href={proj.linkUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary font-semibold hover:underline pt-1"
                    >
                      View Case Study <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Section 5: Achievements, Accreditations & Honors */}
        {achievements.length > 0 && (
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
                <Award className="h-4 w-4 text-primary" /> {taxonomy.achievementsTitle}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {taxonomy.achievementsDescription}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {achievements.map((ach, idx) => (
                <Card key={idx} className="p-5 space-y-2 hover:border-primary/40 transition-all shadow-xs">
                  <div className="flex items-center gap-2 text-primary">
                    <Award className="h-5 w-5 shrink-0" />
                    <span className="font-bold text-sm text-foreground">{ach.title}</span>
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
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                      {ach.description}
                    </p>
                  )}
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Section 6: Media Gallery */}
        {mediaGallery.length > 0 && (
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-primary" /> {taxonomy.mediaTitle}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
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

        {/* Section: Executive Leadership & Board */}
        {org.executives && org.executives.length > 0 && (
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
                <Crown className="h-4 w-4 text-amber-500" /> Executive Leadership & Board
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Meet the leadership team and directors steering {org.name}.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {org.executives.map((exec) => (
                <Card key={exec.id} className="p-4 text-center space-y-3 hover:border-amber-500/40 transition-all shadow-xs relative overflow-hidden group">
                  <div className="h-16 w-16 rounded-full bg-amber-500/10 border-2 border-amber-500/30 text-amber-600 mx-auto flex items-center justify-center font-bold text-lg overflow-hidden shadow-2xs group-hover:scale-105 transition-transform">
                    {exec.avatarUrl ? (
                      <img src={exec.avatarUrl} alt={exec.displayName} className="h-full w-full object-cover" />
                    ) : (
                      exec.displayName?.[0] || 'L'
                    )}
                  </div>

                  <div className="space-y-1">
                    <h3 className="font-bold text-sm text-foreground line-clamp-1">{exec.displayName}</h3>
                    <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-[10px] font-bold uppercase tracking-wider">
                      {exec.executivePosition?.replace(/_/g, ' ') || 'Executive'}
                    </Badge>
                    {exec.jobTitle && (
                      <p className="text-[11px] text-muted-foreground line-clamp-1">{exec.jobTitle}</p>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Section 7: Careers & Open Positions */}
        <section id="careers" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-primary" /> Open Career Vacancies
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Join our high-impact team at {org.name}.
              </p>
            </div>
          </div>

          {jobs.length === 0 ? (
            <Card className="p-8 text-center text-xs text-muted-foreground">
              No active job vacancies currently open. Check back soon!
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {jobs.map((job: any) => (
                <Card key={job.id} className="p-4 flex items-center justify-between hover:border-primary/40 transition-all">
                  <div>
                    <h3 className="font-bold text-sm text-foreground">{job.title}</h3>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                      <span className="capitalize">{job.employmentType?.replace('_', ' ')}</span>
                      <span>• {job.workplaceType?.replace('_', ' ')}</span>
                      {job.location?.city && <span>• {job.location.city}</span>}
                    </div>
                  </div>

                  <Link to="/app/jobs">
                    <Button size="sm" variant="outline" className="text-xs h-8">
                      Apply <ChevronRight className="h-3 w-3 ml-1" />
                    </Button>
                  </Link>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Section 8: Headquarters, Hours & Contact */}
        <section className="space-y-4 border-t border-border pt-8">
          <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" /> Headquarters & Inquiries
          </h2>

          <Card className="p-6 grid grid-cols-1 sm:grid-cols-4 gap-6 text-xs">
            {org.location?.address && (
              <div className="space-y-1">
                <span className="font-bold text-foreground uppercase tracking-wider text-[11px] block">
                  Office Location
                </span>
                <p className="text-muted-foreground leading-relaxed">
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
                    className="inline-flex items-center gap-1 text-primary hover:underline font-semibold mt-1"
                  >
                    <Navigation className="h-3 w-3" /> Get Directions
                  </a>
                )}
              </div>
            )}

            {workingHours && (
              <div className="space-y-1">
                <span className="font-bold text-foreground uppercase tracking-wider text-[11px] block flex items-center gap-1">
                  <Clock className="h-3 w-3 text-primary" /> Hours of Operation
                </span>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                  {workingHours}
                </p>
              </div>
            )}

            {(contactEmail || contactPhone || supportEmail) && (
              <div className="space-y-1">
                <span className="font-bold text-foreground uppercase tracking-wider text-[11px] block">
                  Direct Inquiries
                </span>
                {contactEmail && (
                  <a href={`mailto:${contactEmail}`} className="text-primary hover:underline block">
                    {contactEmail}
                  </a>
                )}
                {supportEmail && (
                  <a href={`mailto:${supportEmail}`} className="text-muted-foreground hover:underline block text-[11px]">
                    Support: {supportEmail}
                  </a>
                )}
                {contactPhone && <p className="text-muted-foreground">{contactPhone}</p>}
              </div>
            )}

            {org.website && (
              <div className="space-y-1">
                <span className="font-bold text-foreground uppercase tracking-wider text-[11px] block">
                  Official Channels
                </span>
                <a
                  href={org.website.startsWith('http') ? org.website : `https://${org.website}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1"
                >
                  {org.website} <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
          </Card>
        </section>
      </div>
    </div>
  );
}
