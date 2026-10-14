import * as React from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Crown,
  Building2,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  ArrowRight,
  User,
  Clock,
} from 'lucide-react';
import { organizationsApi } from '@/features/organizations/api/organizations.api';
import { useOrganizationContextStore } from '@/stores/organizationContextStore';
import { useAuthStore } from '@/stores/authStore';
import { toast } from '@/stores/toastStore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { BrandLogo } from '@/components/navigation/BrandLogo';

export default function OrganizationTransferAcceptPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthStore();
  const { fetchMemberships, switchContext } = useOrganizationContextStore();

  const { data, isLoading, error } = useQuery({
    queryKey: ['orgOwnershipTransferVerify', token],
    queryFn: () => organizationsApi.verifyTransferToken(token),
    enabled: !!token,
    retry: false,
  });

  const transferData = data?.data;
  const org = transferData?.organization;
  const fromUser = transferData?.fromUser;
  const toUser = transferData?.toUser;
  const status = transferData?.status;

  const respondMutation = useMutation({
    mutationFn: (action: 'ACCEPT' | 'REJECT') =>
      organizationsApi.respondOwnershipTransfer({ token, action }),
    onSuccess: async (res, action) => {
      await queryClient.invalidateQueries({ queryKey: ['orgOwnershipTransferVerify', token] });
      await queryClient.invalidateQueries({ queryKey: ['notifications'] });

      if (action === 'ACCEPT') {
        toast.success(res.data?.message || 'Ownership transfer accepted! You are now the owner.');
        try {
          const memberships = await fetchMemberships();
          const newOrgId = res.data?.organizationId || org?._id || org?.id;
          const targetMembership = memberships.find(
            (m) => m.organization?.id === newOrgId || (m.organization as any)?._id === newOrgId
          );
          if (targetMembership) {
            switchContext({
              type: 'ORGANIZATION',
              organizationId: targetMembership.organization.id,
              organizationName: targetMembership.organization.name,
              organizationSlug: targetMembership.organization.slug,
              role: targetMembership.role,
              permissions: targetMembership.permissions,
            });
          }
        } catch {
          // Non-blocking fallback
        }
        navigate(`/app/org/dashboard`, { replace: true });
      } else {
        toast.default('Ownership transfer request declined.');
        navigate('/app', { replace: true });
      }
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to process request');
    },
  });

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="max-w-md w-full text-center p-6 space-y-4">
          <div className="h-12 w-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <CardTitle>Missing Transfer Token</CardTitle>
          <CardDescription>
            The ownership transfer link is missing a valid security token.
          </CardDescription>
          <Button onClick={() => navigate('/app')} variant="outline" className="w-full">
            Return to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !transferData) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="max-w-md w-full text-center p-6 space-y-4">
          <div className="h-12 w-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
            <XCircle className="h-6 w-6" />
          </div>
          <CardTitle>Invalid or Expired Request</CardTitle>
          <CardDescription>
            This organization ownership transfer request is either invalid, expired, or has already been completed.
          </CardDescription>
          <Button onClick={() => navigate('/app')} variant="outline" className="w-full">
            Return to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  const isPending = status === 'PENDING';

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between p-4 sm:p-6">
      {/* Top Header */}
      <header className="container mx-auto max-w-4xl flex items-center justify-between pb-6">
        <BrandLogo to="/" imgClassName="h-6" />
        <Link to="/app">
          <Button variant="ghost" size="sm" className="text-xs">
            Return to App
          </Button>
        </Link>
      </header>

      {/* Main Transfer Decision Card */}
      <main className="container mx-auto max-w-xl my-auto">
        <Card className="border-border bg-card shadow-2xl rounded-3xl overflow-hidden relative">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-purple-950 via-zinc-900 to-black p-6 sm:p-8 text-center border-b border-border/40 relative">
            <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-white dark:bg-card p-2 mx-auto ring-4 ring-card shadow-xl overflow-hidden flex items-center justify-center">
              {org?.logoUrl ? (
                <img src={org.logoUrl} alt={org.name} className="h-full w-full object-contain" />
              ) : (
                <Building2 className="h-10 w-10 text-primary" />
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white mt-3">{org?.name}</h1>
            <div className="flex items-center justify-center gap-2 mt-1">
              <Badge variant="outline" className="text-white/80 border-white/20 text-xs uppercase font-mono">
                {org?.type}
              </Badge>
              <span className="text-xs text-white/60 font-mono">@{org?.slug}</span>
            </div>
          </div>

          <CardContent className="p-6 sm:p-8 space-y-6">
            {/* Status Alert if not pending */}
            {!isPending && (
              <div
                className={`p-4 rounded-2xl border text-xs flex items-center gap-3 ${
                  status === 'ACCEPTED'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
                }`}
              >
                {status === 'ACCEPTED' ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0" />
                ) : (
                  <AlertTriangle className="h-5 w-5 shrink-0" />
                )}
                <div>
                  <div className="font-bold">Request Status: {status}</div>
                  <p className="opacity-90">
                    {status === 'ACCEPTED'
                      ? 'This ownership transfer has already been completed.'
                      : `This transfer request is ${status?.toLowerCase()}.`}
                  </p>
                </div>
              </div>
            )}

            {/* Transfer Details Card */}
            <div className="p-4 rounded-2xl border border-border/70 bg-muted/20 space-y-3">
              <div className="flex items-center gap-3 pb-3 border-b border-border/60">
                <Avatar
                  src={fromUser?.avatarUrl}
                  fallback={fromUser?.displayName || 'Owner'}
                  size="md"
                  className="rounded-xl ring-1 ring-border"
                />
                <div className="min-w-0 flex-1 text-left">
                  <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
                    Initiated by Current Owner
                  </div>
                  <div className="text-sm font-bold text-foreground truncate">
                    {fromUser?.displayName}
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    @{fromUser?.username} • {fromUser?.email}
                  </div>
                </div>
              </div>

              <div className="text-xs text-muted-foreground leading-relaxed text-left space-y-2">
                <p>
                  <strong>{fromUser?.displayName || fromUser?.username}</strong> has requested to transfer full
                  ownership of <strong>{org?.name}</strong> to you.
                </p>
                <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-foreground space-y-1">
                  <div className="font-bold text-xs flex items-center gap-1.5 text-primary">
                    <Crown className="h-3.5 w-3.5" /> What happens when you accept:
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px] text-muted-foreground">
                    <li>You will become the primary <strong>OWNER</strong> with full administrative authority.</li>
                    <li>You can manage branding, corporate NFC smart cards, member governance, and billing.</li>
                    <li>The current owner ({fromUser?.displayName}) will be reassigned as a standard member.</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Recipient User Check */}
            {currentUser && toUser && currentUser.id !== toUser._id && currentUser.id !== toUser.id && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs text-left flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <strong>Logged in as different account:</strong> You are currently signed in as @{currentUser.username}, but this transfer was addressed to @{toUser.username} ({toUser.email}).
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {isPending && (
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => respondMutation.mutate('REJECT')}
                  disabled={respondMutation.isPending}
                  className="flex-1 h-11 rounded-xl text-xs font-semibold order-2 sm:order-1 text-destructive hover:bg-destructive/10 hover:text-destructive border-border"
                >
                  {respondMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Decline Transfer'
                  )}
                </Button>

                <Button
                  onClick={() => respondMutation.mutate('ACCEPT')}
                  disabled={respondMutation.isPending}
                  className="flex-1 h-11 rounded-xl text-xs font-bold bg-primary hover:bg-primary/90 text-white shadow-md order-1 sm:order-2"
                >
                  {respondMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing...
                    </>
                  ) : (
                    <>
                      <Crown className="h-4 w-4 mr-2" /> Accept Ownership
                    </>
                  )}
                </Button>
              </div>
            )}

            {!isPending && (
              <Button onClick={() => navigate('/app')} className="w-full h-10 rounded-xl text-xs font-bold">
                Return to Dashboard <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            )}
          </CardContent>
        </Card>
      </main>

      <footer className="container mx-auto max-w-4xl text-center text-xs text-muted-foreground pt-6">
        © {new Date().getFullYear()} OneWinq. Security & Enterprise Governance.
      </footer>
    </div>
  );
}
