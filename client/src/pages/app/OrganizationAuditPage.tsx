import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ShieldAlert,
  Search,
  User,
  Calendar,
  Clock,
  Terminal,
  Building2,
  Loader2,
  Activity,
  FileCode,
} from 'lucide-react';
import { useOrganizationContextStore } from '@/stores/organizationContextStore';
import { organizationsApi } from '@/features/organizations/api/organizations.api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function OrganizationAuditPage() {
  const navigate = useNavigate();
  const { activeContext } = useOrganizationContextStore();
  const orgId = activeContext.type === 'ORGANIZATION' ? activeContext.organizationId : '';
  const [searchQuery, setSearchQuery] = React.useState('');

  const userRole = (activeContext.role || 'MEMBER').toUpperCase();
  const permissions = activeContext.permissions || [];
  const canViewAudit = userRole === 'OWNER' || userRole === 'ADMIN' || permissions.includes('audit:view');

  const { data: auditData, isLoading } = useQuery({
    queryKey: ['org', orgId, 'auditLogs'],
    queryFn: () => organizationsApi.listAuditLogs(orgId, { limit: 100 }),
    enabled: !!orgId && canViewAudit,
  });

  const logs = (auditData as any)?.data?.logs || [];

  if (!canViewAudit) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center max-w-md mx-auto">
        <div className="h-14 w-14 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mb-4">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-bold">Access Restricted</h2>
        <p className="text-sm text-muted-foreground mt-1 mb-6">
          Compliance and audit logs are visible exclusively to organization owners and authorized administrators.
        </p>
        <Button onClick={() => navigate('/app/org/dashboard')} variant="outline">
          Return to Dashboard
        </Button>
      </div>
    );
  }

  const filteredLogs = logs.filter((log: any) => {
    if (!searchQuery.trim()) {return true;}
    const q = searchQuery.toLowerCase();
    const actionMatch = log.action?.toLowerCase().includes(q);
    const actorMatch = log.actor?.displayName?.toLowerCase().includes(q);
    const targetMatch = log.targetType?.toLowerCase().includes(q);
    return actionMatch || actorMatch || targetMatch;
  });

  const getActionBadge = (action: string) => {
    if (action.includes('DELETE') || action.includes('REMOVE')) {
      return <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-500/20 font-mono text-[10px]">{action}</Badge>;
    }
    if (action.includes('CREATE') || action.includes('INVITE')) {
      return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-mono text-[10px]">{action}</Badge>;
    }
    if (action.includes('UPDATE') || action.includes('EDIT')) {
      return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 font-mono text-[10px]">{action}</Badge>;
    }
    return <Badge variant="outline" className="font-mono text-[10px]">{action}</Badge>;
  };

  if (!orgId) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-bold">No Organization Selected</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Switch to an organization workspace to view compliance audit logs.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Organization Audit Logs</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Immutable compliance trail of member modifications, role changes, and administrative operations.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search action or actor..."
            className="pl-9 h-9 text-xs"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredLogs.length === 0 ? (
        <Card className="p-12 text-center">
          <ShieldAlert className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
          <h3 className="text-base font-semibold">No audit records found</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {searchQuery
              ? 'No events match your current filter query.'
              : 'Administrative and member actions will be recorded here automatically.'}
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden border border-border/80">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-muted-foreground font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Target Type</th>
                  <th className="py-3 px-4">IP Address</th>
                  <th className="py-3 px-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredLogs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-4 font-medium">
                      {getActionBadge(log.action)}
                    </td>
                    <td className="py-3 px-4">
                      {log.actor ? (
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-[10px]">
                            {log.actor.displayName?.charAt(0) || <User className="h-3 w-3" />}
                          </div>
                          <div>
                            <span className="font-semibold text-foreground block">
                              {log.actor.displayName}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {log.actor.email}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic">System</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-muted-foreground">
                      {log.targetType || '—'}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-muted-foreground">
                      {log.ipAddress || '—'}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3 opacity-60" />
                        {new Date(log.createdAt).toLocaleString()}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
