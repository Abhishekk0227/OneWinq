import * as React from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  ShieldCheck,
  Users,
  Network,
  Briefcase,
  UserCheck,
  Lock,
  User,
  ExternalLink,
  Clock,
  Sparkles,
} from 'lucide-react';
import { organizationsApi } from '@/features/organizations/api/organizations.api';
import { useAuthStore } from '@/stores/authStore';
import { useOrganizationContextStore } from '@/stores/organizationContextStore';
import { toast } from '@/stores/toastStore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import type { InvitationPreviewData } from '@/types/organization.types';

export default function AcceptInvitationPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated, user: currentUser, setAuth, logout } = useAuthStore();
  const { switchContext } = useOrganizationContextStore();

  const [acceptedMember, setAcceptedMember] = React.useState<any>(null);

  // Registration Form State for new users
  const [displayName, setDisplayName] = React.useState('');
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [isRegistering, setIsRegistering] = React.useState(false);

  // 1. Fetch Invitation Preview Information
  const {
    data: previewResponse,
    isLoading: isPreviewLoading,
    isError: isPreviewError,
    error: previewError,
  } = useQuery({
    queryKey: ['invitation-preview', token],
    queryFn: () => organizationsApi.getInvitationPreview(token),
    enabled: Boolean(token),
    retry: 1,
  });

  const previewData: InvitationPreviewData | undefined = (previewResponse as any)?.data;
  const invitation = previewData?.invitation;
  const organization = previewData?.organization;
  const department = previewData?.department;
  const invitedBy = previewData?.invitedBy;
  const userExists = previewData?.userExists;

  // Prefill username when preview loads
  React.useEffect(() => {
    if (invitation?.email && !username) {
      const suggested = invitation.email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
      setUsername(suggested);
    }
  }, [invitation?.email, username]);

  // Mutation for already authenticated user accepting directly
  const acceptMutation = useMutation({
    mutationFn: () => organizationsApi.acceptInvitation(token),
    onSuccess: (res: any) => {
      const member = res?.data?.member || res?.member;
      setAcceptedMember(member);
      toast.success('Invitation accepted successfully! Welcome to the team.');
      queryClient.invalidateQueries({ queryKey: ['userOrganizations'] });
      if (member?.organizationId) {
        switchContext('ORGANIZATION', member.organizationId, organization?.name || 'Joined Organization');
      }
      setTimeout(() => {
        navigate('/app', { replace: true });
      }, 1500);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to accept invitation');
    },
  });

  // Handler for new user registering and accepting in one step
  const handleRegisterAndAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim() || !username.trim() || !password) {
      toast.error('Please complete all required fields');
      return;
    }
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }

    try {
      setIsRegistering(true);
      const res: any = await organizationsApi.acceptInvitationWithRegistration({
        token,
        displayName: displayName.trim(),
        username: username.trim(),
        password,
      });

      const resData = res?.data || res;
      if (resData?.accessToken && resData?.user) {
        const userObj: any = {
          _id: resData.user.id || resData.user._id,
          id: resData.user.id || resData.user._id,
          email: resData.user.email,
          displayName: resData.user.displayName,
          username: resData.user.username,
          avatarUrl: resData.user.avatarUrl,
          emailVerified: true,
          role: 'USER',
          accountState: 'ACTIVE',
        };
        setAuth(userObj, resData.accessToken);

        if (resData.organization?.id) {
          switchContext('ORGANIZATION', resData.organization.id, resData.organization.name);
        }
      }

      setAcceptedMember(resData?.member || true);
      toast.success(`Welcome to OneWinq and ${organization?.name || 'your team'}!`);
      queryClient.invalidateQueries({ queryKey: ['userOrganizations'] });
      setTimeout(() => {
        navigate('/app', { replace: true });
      }, 1500);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to create account');
    } finally {
      setIsRegistering(false);
    }
  };

  // If no token was provided in the query string
  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-6 text-center space-y-4 shadow-lg border-border">
          <div className="h-12 w-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold">Invalid Invitation Link</h2>
          <p className="text-xs text-muted-foreground">
            No invitation token was found in the link. Please ask your organization administrator to resend the invitation link.
          </p>
          <Link to="/">
            <Button variant="outline" className="w-full">Return to Home</Button>
          </Link>
        </Card>
      </div>
    );
  }

  // Loading state
  if (isPreviewLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center space-y-4 shadow-xl border-border">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <h2 className="text-lg font-bold">Loading Invitation Details</h2>
          <p className="text-xs text-muted-foreground">Verifying invitation token with OneWinq security...</p>
        </Card>
      </div>
    );
  }

  // Error or invalid/expired token
  if (isPreviewError || !previewData || invitation?.status === 'EXPIRED' || invitation?.status === 'REVOKED') {
    const errorMsg =
      (previewError as any)?.response?.data?.message ||
      (invitation?.status === 'EXPIRED' ? 'This invitation link has expired.' :
       invitation?.status === 'REVOKED' ? 'This invitation was revoked by the organization administrator.' :
       'The invitation link is invalid or no longer active.');

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-6 text-center space-y-4 shadow-xl border-border">
          <div className="h-14 w-14 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
            <Clock className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-bold">Invitation Unavailable</h2>
          <p className="text-xs text-muted-foreground">{errorMsg}</p>
          <p className="text-xs text-muted-foreground">
            Please contact your organization administrator or HR manager to issue a fresh invitation link.
          </p>
          <Link to="/">
            <Button variant="outline" className="w-full">Go to Home</Button>
          </Link>
        </Card>
      </div>
    );
  }

  // Success accepted state
  if (acceptedMember) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center space-y-5 shadow-2xl border-border">
          <div className="h-16 w-16 rounded-3xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-bold">Welcome to {organization?.name || 'the Team'}!</h2>
            <p className="text-xs text-muted-foreground">
              You are now an active member of this organization workspace.
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-muted/40 border border-border text-xs flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span>Redirecting to your workspace dashboard...</span>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 py-8">
      <Card className="max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl border-border/80 relative overflow-hidden">
        {/* Organization Header */}
        <div className="text-center space-y-3">
          <div className="h-16 w-16 rounded-2xl bg-white dark:bg-card border border-primary/20 text-primary flex items-center justify-center mx-auto overflow-hidden shadow-xs p-1.5">
            {organization?.logoUrl ? (
              <img src={organization.logoUrl} alt={organization.name} className="h-full w-full object-contain" />
            ) : (
              <Building2 className="h-8 w-8" />
            )}
          </div>

          <div>
            <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider mb-1.5">
              Workforce Invitation
            </Badge>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">{organization?.name}</h1>
            {organization?.tagline && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{organization.tagline}</p>
            )}
          </div>
        </div>

        {/* Invitation Role & Assignment Context */}
        <div className="p-4 rounded-2xl bg-muted/30 border border-border space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Briefcase className="h-3.5 w-3.5 text-primary" /> Assigned Role:
            </span>
            <Badge className="font-bold text-[11px] bg-primary/15 text-primary border-primary/20">
              {invitation?.role}
            </Badge>
          </div>

          {invitation?.jobTitle && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <UserCheck className="h-3.5 w-3.5 text-primary" /> Position / Title:
              </span>
              <span className="font-semibold text-foreground">{invitation.jobTitle}</span>
            </div>
          )}

          {department && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Network className="h-3.5 w-3.5 text-primary" /> Department:
              </span>
              <span className="font-semibold text-foreground">
                {department.name} {department.code ? `[${department.code}]` : ''}
              </span>
            </div>
          )}

          {invitedBy?.displayName && (
            <div className="flex items-center justify-between text-xs pt-1 border-t border-border/50">
              <span className="text-muted-foreground">Invited by:</span>
              <span className="font-medium text-foreground">{invitedBy.displayName}</span>
            </div>
          )}
        </div>

        {/* ACTION WORKFLOWS */}

        {/* WORKFLOW 1: USER IS ALREADY LOGGED IN */}
        {isAuthenticated ? (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl border border-border bg-background text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Signed in as:</span>
                <span className="text-emerald-500 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Active Session
                </span>
              </div>
              <p className="font-bold text-foreground text-sm">{currentUser?.email}</p>
              {currentUser?.email?.toLowerCase() !== invitation?.email?.toLowerCase() && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                  Note: Invitation was addressed to <strong>{invitation?.email}</strong>. You are accepting with your currently active account.
                </p>
              )}
            </div>

            <Button
              className="w-full font-bold h-11 text-sm shadow-md"
              onClick={() => acceptMutation.mutate()}
              disabled={acceptMutation.isPending}
            >
              {acceptMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Joining {organization?.name}...
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4 mr-2" /> Accept Invitation & Enter Workspace
                </>
              )}
            </Button>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => logout()}
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
              >
                Sign out to use a different account
              </button>
            </div>
          </div>
        ) : userExists ? (
          /* WORKFLOW 2: USER HAS ACCOUNT BUT IS NOT LOGGED IN */
          <div className="space-y-4">
            <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 text-center space-y-1">
              <p className="text-xs font-semibold text-foreground">You already have a OneWinq account!</p>
              <p className="text-xs text-muted-foreground">
                An account exists for <strong>{invitation?.email}</strong>. Sign in to directly accept this invitation and enter {organization?.name}.
              </p>
            </div>

            <Link
              to={`/login?redirect=${encodeURIComponent(`/invitation?token=${token}`)}`}
              className="w-full block"
            >
              <Button className="w-full font-bold h-11 text-sm shadow-md">
                Sign In to Accept <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        ) : (
          /* WORKFLOW 3: NEW USER - INLINE REGISTRATION & 1-STEP JOIN */
          <div className="space-y-4">
            <div className="p-3 rounded-xl border border-border bg-muted/20 space-y-0.5">
              <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" /> Create Your OneWinq Account
              </p>
              <p className="text-[11px] text-muted-foreground">
                Set up your profile to join {organization?.name} in one simple step.
              </p>
            </div>

            <form onSubmit={handleRegisterAndAccept} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold mb-1 block">Work Email</label>
                <div className="relative">
                  <Input
                    value={invitation?.email || ''}
                    readOnly
                    className="bg-muted/50 font-medium text-xs select-all cursor-not-allowed pr-24"
                  />
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                    <CheckCircle2 className="h-3 w-3" /> Verified
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold mb-1 block">Full Name *</label>
                <Input
                  placeholder="e.g. Alexandra Chen"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold mb-1 block">Username *</label>
                <Input
                  placeholder="e.g. alexandra"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold mb-1 block">Password *</label>
                <Input
                  type="password"
                  placeholder="Create a secure password (min. 8 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>

              <Button
                type="submit"
                className="w-full font-bold h-11 text-sm shadow-md mt-2"
                disabled={isRegistering}
              >
                {isRegistering ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating Account & Joining...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4 mr-2" /> Join {organization?.name}
                  </>
                )}
              </Button>
            </form>
          </div>
        )}
      </Card>
    </div>
  );
}
