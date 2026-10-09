import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  FileCheck,
  Building2,
  Calendar,
  Clock,
  ArrowRight,
  ExternalLink,
  Loader2,
  FileText,
} from 'lucide-react';
import { jobsApi } from '@/features/jobs/api/jobs.api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { APPLICATION_STATUS } from '@/constants/app.constants';
import type { JobApplication } from '@/types/organization.types';

export default function MyApplicationsPage() {
  const navigate = useNavigate();

  const { data: appsData, isLoading } = useQuery({
    queryKey: ['myApplications'],
    queryFn: () => jobsApi.getMyApplications({ limit: 50 }),
  });

  const applications: JobApplication[] = (appsData as any)?.data?.applications || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case APPLICATION_STATUS.APPLIED:
        return (
          <Badge variant="outline" className="bg-sky-500/10 text-sky-600 border-sky-500/20">
            Application Submitted
          </Badge>
        );
      case APPLICATION_STATUS.SCREENING:
        return (
          <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/20">
            Under Review / Screening
          </Badge>
        );
      case APPLICATION_STATUS.INTERVIEW:
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
            Interview Scheduled
          </Badge>
        );
      case APPLICATION_STATUS.OFFERED:
        return (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 font-bold">
            Job Offer Extended 🎉
          </Badge>
        );
      case APPLICATION_STATUS.HIRED:
        return (
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold">
            Hired ✨
          </Badge>
        );
      case APPLICATION_STATUS.REJECTED:
        return (
          <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-500/20">
            Not Selected
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Job Applications</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Track the status of your applications, interview invites, and offers across organizations.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : applications.length === 0 ? (
        <Card className="p-12 text-center">
          <FileCheck className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
          <h3 className="text-base font-semibold">No applications yet</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-6">
            You haven’t applied for any positions yet. Explore open roles across verified enterprises.
          </p>
          <Button onClick={() => navigate('/app/jobs')}>
            Explore Open Jobs <ArrowRight className="h-4 w-4 ml-1.5" />
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {applications.map((app) => (
            <Card
              key={app.id}
              className="p-5 sm:p-6 hover:border-primary/40 transition-all duration-200"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold overflow-hidden shrink-0">
                    {app.organization?.logoUrl ? (
                      <img
                        src={app.organization.logoUrl}
                        alt={app.organization.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Building2 className="h-6 w-6" />
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-foreground">{app.jobTitle}</h3>
                      {getStatusBadge(app.status)}
                    </div>
                    <p className="text-xs text-muted-foreground font-medium">
                      {app.organization?.name || 'Company'}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Applied on {new Date(app.createdAt).toLocaleDateString()}
                      </span>
                      {app.resumeUrl && (
                        <a
                          href={app.resumeUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-primary hover:underline font-medium"
                        >
                          <FileText className="h-3 w-3" /> Resume
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
