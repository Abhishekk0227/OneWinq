import * as React from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, CheckCircle2, AlertCircle, Loader2, ArrowRight, ShieldCheck, Users } from 'lucide-react';
import { organizationsApi } from '@/features/organizations/api/organizations.api';
import { useAuthStore } from '@/stores/authStore';
import { useOrganizationContextStore } from '@/stores/organizationContextStore';
import { toast } from '@/stores/toastStore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function AcceptInvitationPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useAuthStore();
  const { switchContext } = useOrganizationContextStore();

  const [acceptedMember, setAcceptedMember] = React.useState<any>(null);

  const acceptMutation = useMutation({
    mutationFn: () => organizationsApi.acceptInvitation(token),
    onSuccess: (res: any) => {
      const member = res?.data?.member || res?.member;
      setAcceptedMember(member);
      toast.success('Invitation accepted successfully! Welcome to the team.');
      queryClient.invalidateQueries({ queryKey: ['userOrganizations'] });
      if (member?.organizationId) {
        switchContext('ORGANIZATION', member.organizationId, 'Joined Organization');
      }
      setTimeout(() => {
        navigate('/app', { replace: true });
      }, 1500);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to accept invitation');
    },
  });

  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-6 text-center space-y-4">
          <div className="h-12 w-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold">Invalid Invitation Link</h2>
          <p className="text-xs text-muted-foreground">
            No invitation token was found in the link. Please ask your organization administrator to resend the invitation link.
          </p>
          <Link to="/">
            <Button variant="outline" className="w-full">Go to Home</Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (acceptedMember) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-6 text-center space-y-4 shadow-xl">
          <div className="h-14 w-14 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <h2 className="text-2xl font-bold">Welcome to the Team!</h2>
          <p className="text-sm text-muted-foreground">
            Your invitation was successfully accepted. Redirecting to your workspace...
          </p>
          <div className="flex justify-center pt-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-6 space-y-5 shadow-xl border-border/80">
        <div className="text-center space-y-2">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto shadow-xs">
            <Building2 className="h-7 w-7" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Organization Invitation</h2>
          <p className="text-xs text-muted-foreground">
            You have been invited to join an organization workforce on OneWinq.
          </p>
        </div>

        {isAuthenticated ? (
          <div className="space-y-4 pt-2">
            <div className="p-3.5 rounded-xl border border-border bg-muted/30 text-xs space-y-1">
              <span className="text-muted-foreground block">Signed in as:</span>
              <p className="font-semibold text-foreground">{user?.email}</p>
            </div>

            <Button
              className="w-full font-semibold shadow-xs"
              onClick={() => acceptMutation.mutate()}
              disabled={acceptMutation.isPending}
            >
              {acceptMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Accepting Invitation...
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4 mr-2" /> Accept & Join Organization
                </>
              )}
            </Button>

            {acceptMutation.isError && (
              <p className="text-xs text-destructive text-center">
                {(acceptMutation.error as any)?.response?.data?.message || (acceptMutation.error as any)?.message || 'Invitation is invalid or has expired.'}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            <p className="text-xs text-muted-foreground text-center">
              Please sign in to your OneWinq account or create a new account to accept this invitation.
            </p>

            <div className="space-y-2">
              <Link to={`/login?redirect=${encodeURIComponent(`/invitation?token=${token}`)}`} className="w-full block">
                <Button className="w-full font-semibold">
                  Sign In to Accept <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </Link>

              <Link to={`/signup?redirect=${encodeURIComponent(`/invitation?token=${token}`)}`} className="w-full block">
                <Button variant="outline" className="w-full font-semibold">
                  Create New Account
                </Button>
              </Link>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
