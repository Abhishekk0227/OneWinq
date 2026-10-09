import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  Plus,
  MapPin,
  Video,
  Users,
  Ticket,
  Clock,
  Sparkles,
  CheckCircle2,
  XCircle,
  Building2,
  Loader2,
  ExternalLink,
  QrCode,
  Tag,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useOrganizationContextStore } from '@/stores/organizationContextStore';
import { organizationsApi } from '@/features/organizations/api/organizations.api';
import { toast } from '@/stores/toastStore';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog';
import { EVENT_STATUS, EVENT_ELIGIBILITY_TYPE } from '@/constants/app.constants';
import type { EnterpriseEvent, EventTicketPass } from '@/types/organization.types';

const eventFormSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(150),
  category: z.string().default('ALL_HANDS'),
  description: z.string().trim().max(5000).optional(),
  bannerUrl: z.string().trim().optional(),
  locationType: z.enum(['VIRTUAL', 'PHYSICAL', 'HYBRID']).default('VIRTUAL'),
  venue: z.string().optional(),
  meetingUrl: z.string().optional(),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  maxCapacity: z.preprocess((v) => (v === '' ? undefined : Number(v)), z.number().optional()),
  eligibilityType: z.enum([
    EVENT_ELIGIBILITY_TYPE.ALL,
    EVENT_ELIGIBILITY_TYPE.DEPARTMENTS,
    EVENT_ELIGIBILITY_TYPE.ROLES,
  ]).default(EVENT_ELIGIBILITY_TYPE.ALL),
});

type EventFormValues = z.infer<typeof eventFormSchema>;

export default function OrganizationEventsPage() {
  const queryClient = useQueryClient();
  const { activeContext } = useOrganizationContextStore();
  const orgId = activeContext.type === 'ORGANIZATION' ? activeContext.organizationId : '';

  const [activeTab, setActiveTab] = React.useState<'EVENTS' | 'MY_TICKETS'>('EVENTS');
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [selectedTicket, setSelectedTicket] = React.useState<EventTicketPass | null>(null);

  // Fetch Events
  const { data: eventsData, isLoading } = useQuery({
    queryKey: ['org', orgId, 'events'],
    queryFn: () => organizationsApi.listEvents(orgId, { limit: 50 }),
    enabled: !!orgId,
  });
  const events: EnterpriseEvent[] = (eventsData as any)?.data?.events || [];

  // Fetch My Passes
  const { data: ticketsData } = useQuery({
    queryKey: ['org', orgId, 'myTickets'],
    queryFn: () => organizationsApi.getMyEventTickets(orgId),
    enabled: !!orgId,
  });
  const myTickets: EventTicketPass[] = (ticketsData as any)?.data?.tickets || [];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      category: 'ALL_HANDS',
      locationType: 'VIRTUAL',
      eligibilityType: EVENT_ELIGIBILITY_TYPE.ALL,
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: EventFormValues) => {
      return organizationsApi.createEvent(orgId, {
        title: data.title,
        category: data.category,
        description: data.description,
        bannerUrl: data.bannerUrl || null,
        location: {
          type: data.locationType,
          venue: data.venue || '',
          meetingUrl: data.meetingUrl || '',
        },
        startDate: data.startDate,
        endDate: data.endDate,
        maxCapacity: data.maxCapacity || null,
        eligibility: {
          type: data.eligibilityType,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org', orgId, 'events'] });
      setIsCreateOpen(false);
      reset();
      toast.success('Event hosted successfully!');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to host event');
    },
  });

  const rsvpMutation = useMutation({
    mutationFn: (eventId: string) => organizationsApi.rsvpEvent(orgId, eventId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['org', orgId, 'events'] });
      queryClient.invalidateQueries({ queryKey: ['org', orgId, 'myTickets'] });
      const pass = (data as any)?.data?.registration;
      if (pass) {
        setSelectedTicket(pass);
      }
      toast.success('RSVP confirmed! Ticket pass issued.');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to register for event');
    },
  });

  const cancelRsvpMutation = useMutation({
    mutationFn: (eventId: string) => organizationsApi.cancelEventRsvp(orgId, eventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org', orgId, 'events'] });
      queryClient.invalidateQueries({ queryKey: ['org', orgId, 'myTickets'] });
      setSelectedTicket(null);
      toast.info('RSVP cancelled.');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to cancel registration');
    },
  });

  if (!orgId) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-bold">No Organization Selected</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Switch to an organization workspace to view enterprise events.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Enterprise Events & Smart Passes</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Participate in company town halls, team offsites, webinars, and manage access ticketing passes.
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="shadow-xs">
          <Plus className="h-4 w-4 mr-2" /> Host New Event
        </Button>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-xl w-full sm:w-auto self-start">
        <button
          onClick={() => setActiveTab('EVENTS')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
            activeTab === 'EVENTS'
              ? 'bg-card text-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Upcoming Events ({events.length})
        </button>
        <button
          onClick={() => setActiveTab('MY_TICKETS')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
            activeTab === 'MY_TICKETS'
              ? 'bg-card text-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          My Passes ({myTickets.length})
        </button>
      </div>

      {/* Tab 1: Upcoming Events Feed */}
      {activeTab === 'EVENTS' && (
        <>
          {isLoading ? (
            <div className="flex items-center justify-center p-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : events.length === 0 ? (
            <Card className="p-12 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
              <h3 className="text-base font-semibold">No upcoming events scheduled</h3>
              <p className="text-sm text-muted-foreground mt-1 mb-6">
                Plan town halls, team workshops, or company offsites.
              </p>
              <Button onClick={() => setIsCreateOpen(true)} variant="outline">
                <Plus className="h-4 w-4 mr-2" /> Host First Event
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {events.map((ev) => {
                const isRegistered = myTickets.some((t) => t.event?.id === ev.id);
                return (
                  <Card
                    key={ev.id}
                    className="p-5 flex flex-col justify-between hover:border-primary/40 transition-all overflow-hidden"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <Badge variant="outline" className="text-xs uppercase bg-primary/10 text-primary border-primary/20">
                          {ev.category.replace('_', ' ')}
                        </Badge>
                        <Badge variant="outline" className="text-[11px]">
                          {ev.location.type}
                        </Badge>
                      </div>

                      <div>
                        <h3 className="font-bold text-lg text-foreground tracking-tight">{ev.title}</h3>
                        {ev.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                            {ev.description}
                          </p>
                        )}
                      </div>

                      <div className="space-y-1.5 text-xs text-muted-foreground pt-1">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-primary" />
                          <span>{new Date(ev.startDate).toLocaleString()}</span>
                        </div>
                        {ev.location.type === 'VIRTUAL' && ev.location.meetingUrl ? (
                          <div className="flex items-center gap-1.5 text-primary">
                            <Video className="h-3.5 w-3.5" />
                            <span className="truncate">Virtual Meeting Link Provided</span>
                          </div>
                        ) : ev.location.venue ? (
                          <div className="flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-primary" />
                            <span className="truncate">{ev.location.venue}</span>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="pt-4 mt-4 border-t border-border flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Users className="h-3.5 w-3.5" />
                        <span>
                          {ev.registeredCount} attending {ev.maxCapacity ? `/ ${ev.maxCapacity}` : ''}
                        </span>
                      </div>

                      {isRegistered ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-500/10 px-2.5 py-1 rounded-lg">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Pass Confirmed
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          disabled={rsvpMutation.isPending}
                          onClick={() => rsvpMutation.mutate(ev.id)}
                          className="text-xs font-semibold h-8"
                        >
                          <Ticket className="h-3.5 w-3.5 mr-1" /> RSVP Pass
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Tab 2: My Event Passes */}
      {activeTab === 'MY_TICKETS' && (
        <>
          {myTickets.length === 0 ? (
            <Card className="p-12 text-center">
              <Ticket className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
              <h3 className="text-base font-semibold">No active event passes</h3>
              <p className="text-sm text-muted-foreground mt-1 mb-6">
                RSVP for upcoming enterprise events to receive digital access passes.
              </p>
              <Button onClick={() => setActiveTab('EVENTS')} variant="outline">
                Browse Events
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myTickets.map((t) => (
                <Card
                  key={t.id}
                  onClick={() => setSelectedTicket(t)}
                  className="p-5 space-y-4 border-primary/30 bg-gradient-to-br from-card via-card to-primary/5 cursor-pointer hover:border-primary transition-all shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-primary tracking-wider">
                      {t.ticketCode}
                    </span>
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                      Valid Pass
                    </Badge>
                  </div>

                  <div>
                    <h4 className="font-bold text-base text-foreground line-clamp-1">
                      {t.event?.title || 'Enterprise Event'}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t.event?.startDate ? new Date(t.event.startDate).toLocaleDateString() : ''}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Click to view pass pass</span>
                    <QrCode className="h-4 w-4 text-primary" />
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Host Event Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen} className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Host Enterprise Event</DialogTitle>
          <DialogDescription>
            Schedule a gathering, town hall, or training session for your workforce.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4 pt-2">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
              Event Title *
            </label>
            <Input {...register('title')} placeholder="e.g. Q3 All-Hands & Product Keynote" />
            {errors.title && <p className="text-xs text-destructive mt-1">{errors.title.message}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                Category
              </label>
              <select
                {...register('category')}
                className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs font-medium"
              >
                <option value="ALL_HANDS">All Hands Meeting</option>
                <option value="WORKSHOP">Workshop / Training</option>
                <option value="TECH_TALK">Tech Talk</option>
                <option value="CONFERENCE">Conference</option>
                <option value="OFFSITE">Team Offsite</option>
                <option value="NETWORKING">Networking Mixer</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                Location Format
              </label>
              <select
                {...register('locationType')}
                className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs font-medium"
              >
                <option value="VIRTUAL">Virtual (Zoom/Meet/Teams)</option>
                <option value="PHYSICAL">Physical On-Site</option>
                <option value="HYBRID">Hybrid</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                Start Date & Time *
              </label>
              <Input {...register('startDate')} type="datetime-local" />
              {errors.startDate && <p className="text-xs text-destructive mt-1">{errors.startDate.message}</p>}
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                End Date & Time *
              </label>
              <Input {...register('endDate')} type="datetime-local" />
              {errors.endDate && <p className="text-xs text-destructive mt-1">{errors.endDate.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                Physical Venue (If applicable)
              </label>
              <Input {...register('venue')} placeholder="e.g. Auditorium A, HQ Floor 4" />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                Virtual Meeting URL
              </label>
              <Input {...register('meetingUrl')} placeholder="https://meet.google.com/..." />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
              Event Description
            </label>
            <Textarea
              {...register('description')}
              rows={3}
              placeholder="Outline agenda, speakers, and preparation materials..."
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Scheduling...' : 'Schedule Event'}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Digital Access Ticket Pass Dialog */}
      <Dialog
        open={!!selectedTicket}
        onOpenChange={(open) => !open && setSelectedTicket(null)}
        className="max-w-md"
      >
        {selectedTicket && (
          <div className="space-y-6 text-center pt-2">
            <div className="p-6 rounded-2xl border-2 border-primary/40 bg-gradient-to-b from-card to-primary/5 shadow-md relative overflow-hidden">
              <div className="text-xs font-bold tracking-widest text-primary uppercase mb-2">
                OneWinq Smart Event Pass
              </div>

              <h3 className="text-xl font-black text-foreground tracking-tight">
                {selectedTicket.event?.title || 'Enterprise Gathering'}
              </h3>

              <div className="my-4 py-3 border-y border-dashed border-border/80 flex flex-col items-center justify-center">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                  Unique Admission Code
                </span>
                <span className="font-mono text-2xl font-black tracking-wider text-primary mt-0.5">
                  {selectedTicket.ticketCode}
                </span>
              </div>

              <div className="space-y-1 text-xs text-muted-foreground">
                <p>
                  <strong>Date:</strong>{' '}
                  {selectedTicket.event?.startDate
                    ? new Date(selectedTicket.event.startDate).toLocaleString()
                    : 'Scheduled'}
                </p>
                {selectedTicket.event?.location?.venue && (
                  <p>
                    <strong>Location:</strong> {selectedTicket.event.location.venue}
                  </p>
                )}
              </div>
            </div>

            <DialogFooter className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (selectedTicket.event?.id) {
                    cancelRsvpMutation.mutate(selectedTicket.event.id);
                  }
                }}
                className="text-xs text-destructive hover:bg-destructive/10"
              >
                Cancel My RSVP
              </Button>
              <Button size="sm" onClick={() => setSelectedTicket(null)} className="text-xs">
                Done
              </Button>
            </DialogFooter>
          </div>
        )}
      </Dialog>
    </div>
  );
}
