import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  CreditCard,
  Plus,
  Wifi,
  ExternalLink,
  ShieldCheck,
  Building2,
  Users,
  Search,
  Package,
} from 'lucide-react';
import { useOrganizationContextStore } from '@/stores/organizationContextStore';
import { cardsApi } from '@/features/cards/api/cards.api';
import { organizationsApi } from '@/features/organizations/api/organizations.api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';

export default function OrganizationCardsPage() {
  const navigate = useNavigate();
  const { activeContext } = useOrganizationContextStore();
  const orgId = activeContext.type === 'ORGANIZATION' ? activeContext.organizationId : '';
  const [searchQuery, setSearchQuery] = React.useState('');

  const { data: cardsData, isLoading } = useQuery({
    queryKey: ['cards', 'org', orgId],
    queryFn: () => cardsApi.listCards(),
    enabled: !!orgId,
  });

  const cards: any[] = (cardsData?.data as any)?.cards || [];
  // Filter cards tagged with this org or corporate flag
  const corporateCards = cards.filter((c: any) => c.organizationId === orgId || c.isCorporate);

  if (!orgId) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-bold">No Organization Selected</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Switch to an organization workspace to manage corporate NFC cards.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Corporate NFC Fleet</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage smart corporate badges, physical NFC cards, and team member provisioning.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate('/app/orders')} variant="outline">
            <Package className="h-4 w-4 mr-2" /> Order Batch
          </Button>
          <Button onClick={() => navigate('/app/org/members')}>
            <Users className="h-4 w-4 mr-2" /> Assign to Members
          </Button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="p-4 rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <span className="font-bold text-foreground block">
            Centralized Corporate Credential Control
          </span>
          <p className="text-muted-foreground leading-relaxed">
            All corporate NFC cards tap directly to the verified employee’s digital business card with your organization’s branding, verified badge, and security tokens.
          </p>
        </div>
      </div>

      {corporateCards.length === 0 ? (
        <Card className="p-12 text-center">
          <CreditCard className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
          <h3 className="text-base font-semibold">No corporate cards assigned yet</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-6">
            Assign digital credentials or order custom physical NFC metal and PVC cards for your staff.
          </p>
          <Button onClick={() => navigate('/app/cards')} variant="outline">
            <CreditCard className="h-4 w-4 mr-2" /> View My Cards
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {corporateCards.map((card: any) => (
            <Card key={card.id || card._id} className="p-5 space-y-4 hover:border-primary/40 transition-all">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                  <Wifi className="h-3 w-3 mr-1" /> NFC Active
                </Badge>
                <span className="text-xs font-mono text-muted-foreground">
                  {card.cardCode || card.cardUid}
                </span>
              </div>

              <div>
                <h4 className="font-bold text-base text-foreground">{card.title || 'Corporate Card'}</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {card.assignedUser?.displayName || 'Assigned Member'}
                </p>
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Type: {card.material || 'Metal NFC'}</span>
                <a
                  href={`/p/c/${card.cardCode || card.cardUid}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline font-semibold"
                >
                  Public Tap <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
