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
} from 'lucide-react';
import { organizationsApi } from '@/features/organizations/api/organizations.api';
import { jobsApi } from '@/features/jobs/api/jobs.api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { Organization, OrganizationProduct, OrganizationProject, OrganizationAchievement } from '@/types/organization.types';

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
          The enterprise showcase you requested does not exist or has been made private.
        </p>
        <Link to="/app">
          <Button variant="outline">Return to Platform</Button>
        </Link>
      </div>
    );
  }

  const products: OrganizationProduct[] = org.products || [];
  const projects: OrganizationProject[] = org.projects || [];
  const achievements: OrganizationAchievement[] = org.achievements || [];
  const mediaGallery = org.mediaGallery || [];

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      {/* 1. Hero Header Banner */}
      <div className="relative">
        <div className="h-64 sm:h-80 w-full bg-gradient-to-r from-primary/30 via-primary/10 to-muted relative overflow-hidden">
          {org.bannerUrl ? (
            <img src={org.bannerUrl} alt={org.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground/30 text-sm font-semibold tracking-wider">
              {org.name.toUpperCase()}
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 relative -mt-24 sm:-mt-28">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6 pb-6 border-b border-border/80">
            <div className="flex items-end gap-5">
              <div className="h-28 w-28 sm:h-36 sm:w-36 rounded-3xl bg-card border-4 border-background shadow-xl flex items-center justify-center text-primary overflow-hidden shrink-0">
                {org.logoUrl ? (
                  <img src={org.logoUrl} alt={org.name} className="w-full h-full object-cover" />
                ) : (
                  <Building2 className="h-14 w-14 text-primary/80" />
                )}
              </div>

              <div className="space-y-1.5 mb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{org.name}</h1>
                  {org.isVerified && (
                    <Badge variant="default" className="bg-primary/20 text-primary border-primary/30 font-semibold">
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Verified Enterprise
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-xs uppercase">
                    {org.type}
                  </Badge>
                </div>

                {org.tagline && (
                  <p className="text-sm font-medium text-muted-foreground leading-relaxed">
                    {org.tagline}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-0.5">
                  {org.industry && <span>{org.industry}</span>}
                  {org.size && <span>• {org.size} Team Size</span>}
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
              {jobs.length > 0 && (
                <a href="#careers">
                  <Button size="sm" className="shadow-xs font-semibold">
                    <Briefcase className="h-3.5 w-3.5 mr-1.5" /> View {jobs.length} Open Roles
                  </Button>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main 8-Section Showcase Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 space-y-12">
        {/* Section 1: About & Mission */}
        {org.description && (
          <section className="space-y-3">
            <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> About {org.name}
            </h2>
            <Card className="p-6 leading-relaxed text-sm text-foreground/90 whitespace-pre-wrap">
              {org.description}
            </Card>
          </section>
        )}

        {/* Section 2: Products & Solutions */}
        {products.length > 0 && (
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" /> Products & Flagship Solutions
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Core technologies and offerings built by {org.name}.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((prod, idx) => (
                <Card key={idx} className="p-5 flex flex-col justify-between hover:border-primary/40 transition-all">
                  <div className="space-y-2">
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
                    {prod.description && (
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                        {prod.description}
                      </p>
                    )}
                  </div>

                  {prod.linkUrl && (
                    <div className="pt-3 mt-3 border-t border-border">
                      <a
                        href={prod.linkUrl}
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

        {/* Section 3: Projects & Case Studies */}
        {projects.length > 0 && (
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" /> Key Projects & Impact
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Demonstrated real-world results and enterprise deliveries.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.map((proj, idx) => (
                <Card key={idx} className="p-5 space-y-3 hover:border-primary/40 transition-all">
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

        {/* Section 4: Achievements & Accreditations */}
        {achievements.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
              <Award className="h-4 w-4 text-primary" /> Honors & Recognitions
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {achievements.map((ach, idx) => (
                <Card key={idx} className="p-5 space-y-2 hover:border-primary/40 transition-all">
                  <div className="flex items-center gap-2 text-primary">
                    <Award className="h-5 w-5 shrink-0" />
                    <span className="font-bold text-sm text-foreground">{ach.title}</span>
                  </div>
                  {ach.issuer && (
                    <p className="text-xs text-muted-foreground font-medium">
                      Conferred by {ach.issuer} {ach.year ? `(${ach.year})` : ''}
                    </p>
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

        {/* Section 5: Media Gallery */}
        {mediaGallery.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-primary" /> Life at {org.name} & Gallery
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {mediaGallery.map((med, idx) => (
                <div
                  key={idx}
                  className="group relative h-40 rounded-2xl overflow-hidden bg-muted border border-border shadow-xs"
                >
                  <img
                    src={med.url}
                    alt={med.caption || 'Media asset'}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {med.caption && (
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3 text-[11px] text-white">
                      {med.caption}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Section 6: Careers & Open Positions */}
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

        {/* Section 7 & 8: Contact & Headquarters */}
        <section className="space-y-4 border-t border-border pt-8">
          <h2 className="text-lg font-bold tracking-tight text-foreground">
            Contact & Headquarters
          </h2>

          <Card className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs">
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
                </p>
              </div>
            )}

            {org.contactEmail && (
              <div className="space-y-1">
                <span className="font-bold text-foreground uppercase tracking-wider text-[11px] block">
                  Direct Inquiries
                </span>
                <a href={`mailto:${org.contactEmail}`} className="text-primary hover:underline">
                  {org.contactEmail}
                </a>
                {org.contactPhone && <p className="text-muted-foreground">{org.contactPhone}</p>}
              </div>
            )}

            {org.website && (
              <div className="space-y-1">
                <span className="font-bold text-foreground uppercase tracking-wider text-[11px] block">
                  Official Website
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
