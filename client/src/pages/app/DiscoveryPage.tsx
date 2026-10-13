import * as React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { discoveryApi } from '@/features/discovery/api/discovery.api'
import { connectionsApi } from '@/features/connections/api/connections.api'
import { messagingApi } from '@/features/messaging/api/messaging.api'
import { organizationsApi } from '@/features/organizations/api/organizations.api'
import { queryKeys } from '@/lib/query/queryKeys'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/common/EmptyState'
import { toast } from '@/stores/toastStore'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils/cn'
import {
  Search,
  MapPin,
  Briefcase,
  UserPlus,
  UserCheck,
  Compass,
  MessageSquare,
  Wifi,
  Building2,
  Users,
  CheckCircle2,
  Plus,
  Globe,
  ExternalLink,
} from 'lucide-react'
import type { DiscoveryUserCard } from '@/types/networking.types'
import type { Organization } from '@/types/organization.types'

const ORG_TYPE_FILTERS = [
  { value: 'ALL', label: 'All Organizations' },
  { value: 'COMPANY', label: 'Companies' },
  { value: 'STARTUP', label: 'Startups' },
  { value: 'COLLEGE', label: 'Colleges' },
  { value: 'HOSPITAL', label: 'Hospitals' },
  { value: 'NGO', label: 'NGOs' },
]

export default function DiscoveryPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = React.useState<'PEOPLE' | 'COMPANIES'>('PEOPLE')
  const [searchTerm, setSearchTerm] = React.useState('')
  const [debouncedSearch, setDebouncedSearch] = React.useState('')
  const [remoteOnly, setRemoteOnly] = React.useState(false)
  const [orgTypeFilter, setOrgTypeFilter] = React.useState('ALL')
  const [startingChatUserId, setStartingChatUserId] = React.useState<string | null>(null)

  const handleStartMessage = async (recipientId: string) => {
    if (!recipientId) return
    try {
      setStartingChatUserId(recipientId)
      const res = await messagingApi.getOrCreateConversation(recipientId)
      const cid =
        res.data?.conversation?._id ||
        res.data?.conversation?.id ||
        (res.data as any)?.conversationId
      if (cid) {
        navigate(`/app/messages?cid=${cid}`)
      } else {
        navigate('/app/messages')
      }
    } catch (err: any) {
      toast.error(err?.message || 'Could not start conversation')
    } finally {
      setStartingChatUserId(null)
    }
  }

  // Debounce search input
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm)
    }, 400)
    return () => clearTimeout(handler)
  }, [searchTerm])

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.discovery.search({ q: debouncedSearch, remoteOnly }),
    queryFn: () =>
      discoveryApi.search({
        q: debouncedSearch || undefined,
        remoteOnly: remoteOnly || undefined,
        limit: 20,
      }),
  })

  const sendRequestMutation = useMutation({
    mutationFn: (userId: string) => connectionsApi.sendRequest(userId),
    onSuccess: () => {
      toast.success('Connection request sent!')
      queryClient.invalidateQueries({ queryKey: ['discovery'] })
      queryClient.invalidateQueries({ queryKey: ['connections'] })
    },
    onError: (err: unknown) => {
      const apiErr = err as { message?: string }
      toast.error(apiErr.message || 'Failed to send request')
    },
  })

  const acceptMutation = useMutation({
    mutationFn: (requestIdOrUserId: string) => connectionsApi.acceptRequest(requestIdOrUserId),
    onSuccess: () => {
      toast.success('Connection accepted!')
      queryClient.invalidateQueries({ queryKey: ['discovery'] })
      queryClient.invalidateQueries({ queryKey: ['connections'] })
    },
    onError: (err: unknown) => {
      const apiErr = err as { message?: string }
      toast.error(apiErr.message || 'Failed to accept request')
    },
  })

  const rejectMutation = useMutation({
    mutationFn: (requestIdOrUserId: string) => connectionsApi.rejectRequest(requestIdOrUserId),
    onSuccess: () => {
      toast.success('Connection request ignored.')
      queryClient.invalidateQueries({ queryKey: ['discovery'] })
      queryClient.invalidateQueries({ queryKey: ['connections'] })
    },
    onError: (err: unknown) => {
      const apiErr = err as { message?: string }
      toast.error(apiErr.message || 'Failed to ignore request')
    },
  })

  const withdrawMutation = useMutation({
    mutationFn: (requestIdOrUserId: string) => connectionsApi.withdrawRequest(requestIdOrUserId),
    onSuccess: () => {
      toast.success('Connection request withdrawn.')
      queryClient.invalidateQueries({ queryKey: ['discovery'] })
      queryClient.invalidateQueries({ queryKey: ['connections'] })
    },
    onError: (err: unknown) => {
      const apiErr = err as { message?: string }
      toast.error(apiErr.message || 'Failed to cancel request')
    },
  })

  // Organizations Public Search Query
  const { data: orgsData, isLoading: isOrgsLoading } = useQuery({
    queryKey: ['public-organizations', { q: debouncedSearch, type: orgTypeFilter !== 'ALL' ? orgTypeFilter : undefined }],
    queryFn: () =>
      organizationsApi.listPublic({
        q: debouncedSearch || undefined,
        type: orgTypeFilter !== 'ALL' ? orgTypeFilter : undefined,
        limit: 30,
      }),
    enabled: activeTab === 'COMPANIES',
  })

  const followOrgMutation = useMutation({
    mutationFn: (orgId: string) => organizationsApi.toggleFollow(orgId),
    onSuccess: (res: any, orgId: string) => {
      queryClient.invalidateQueries({ queryKey: ['public-organizations'] })
      queryClient.invalidateQueries({ queryKey: ['org', orgId, 'follow-status'] })
      const isNowFollowing = res?.data?.isFollowing
      if (isNowFollowing) {
        toast.success('Organization followed!')
      } else {
        toast.default('Unfollowed organization')
      }
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Please log in to follow')
    },
  })

  const users: DiscoveryUserCard[] = (data?.data?.users || data?.data?.results || []) as DiscoveryUserCard[]
  const organizations: Organization[] = ((orgsData?.data as any)?.organizations || []) as Organization[]

  return (
    <div className="space-y-4 text-left max-w-6xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="space-y-0.5">
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
            Discover
          </h1>
          <p className="text-xs text-muted-foreground">
            Explore and connect with verified professionals and organizations across the network.
          </p>
        </div>
      </div>

      {/* Segmented Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-border/80 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('PEOPLE')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer select-none',
            activeTab === 'PEOPLE'
              ? 'bg-primary text-white shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          )}
        >
          <Users className="h-3.5 w-3.5" />
          <span>People</span>
          {users.length > 0 && (
            <span
              className={cn(
                'ml-1 px-1.5 py-0.2 text-[9px] rounded-full font-bold',
                activeTab === 'PEOPLE'
                  ? 'bg-white/20 text-white'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {users.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('COMPANIES')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer select-none',
            activeTab === 'COMPANIES'
              ? 'bg-primary text-white shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          )}
        >
          <Building2 className="h-3.5 w-3.5" />
          <span>Companies & Organizations</span>
          {organizations.length > 0 && activeTab === 'COMPANIES' && (
            <span className="ml-1 px-1.5 py-0.2 text-[9px] rounded-full font-bold bg-white/20 text-white">
              {organizations.length}
            </span>
          )}
        </button>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-2.5 p-2.5 sm:p-3 rounded-xl bg-card border border-border shadow-xs">
        <div className="relative flex-1 w-full">
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={
              activeTab === 'PEOPLE'
                ? 'Search by name, role, skills...'
                : 'Search companies by name, tagline, or industry...'
            }
            leftIcon={<Search className="h-3.5 w-3.5" />}
            className="w-full h-8.5 text-xs"
          />
        </div>

        {activeTab === 'PEOPLE' ? (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label className="flex items-center gap-1.5 text-xs font-medium text-foreground/80 cursor-pointer select-none px-2.5 py-1.5 rounded-lg bg-muted/40 border border-border/80">
              <input
                type="checkbox"
                checked={remoteOnly}
                onChange={(e) => setRemoteOnly(e.target.checked)}
                className="rounded text-primary focus:ring-primary h-3.5 w-3.5"
              />
              <span>Remote Only</span>
            </label>
          </div>
        ) : (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={orgTypeFilter}
              onChange={(e) => setOrgTypeFilter(e.target.value)}
              className="h-8.5 px-2.5 py-1 rounded-lg bg-muted/40 border border-border text-xs font-medium text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 w-full sm:w-auto cursor-pointer"
            >
              {ORG_TYPE_FILTERS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Dynamic Results: Companies Grid or People Grid */}
      {activeTab === 'COMPANIES' ? (
        isOrgsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="p-6 rounded-3xl border border-border bg-card space-y-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-14 w-14 rounded-2xl" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
            ))}
          </div>
        ) : organizations.length === 0 ? (
          <EmptyState
            icon={<Building2 className="h-6 w-6" />}
            title="No organizations found"
            description="Try broadening your search keywords or choosing 'All Organizations'."
            actionLabel="Clear Filters"
            onAction={() => {
              setSearchTerm('')
              setOrgTypeFilter('ALL')
            }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
            {organizations.map((org: Organization) => {
              const orgId = org.id || (org as any)._id
              const showcaseLink = `/c/${org.slug || orgId}`
              const isFollowing = (org as any).isFollowing

              return (
                <div
                  key={orgId}
                  className="flex flex-col justify-between p-3.5 sm:p-4 rounded-xl border border-border bg-card shadow-xs hover:border-primary/40 transition-all duration-200 text-left space-y-3"
                >
                  <div className="space-y-2.5">
                    {/* Top Row: Logo & Brand Info */}
                    <div className="flex items-start gap-2.5">
                      <Avatar
                        src={org.logoUrl || (org.branding as any)?.logoUrl || undefined}
                        fallback={org.name}
                        alt={org.name}
                        size="md"
                        className="rounded-xl shrink-0 border border-border/60 bg-muted/30"
                      />
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Link
                            to={showcaseLink}
                            className="text-sm font-bold text-foreground hover:text-primary transition-colors truncate block"
                          >
                            {org.name}
                          </Link>
                          {org.isVerified && (
                            <CheckCircle2
                              className="h-3.5 w-3.5 text-primary shrink-0"
                              title="Verified Organization"
                            />
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-medium">
                            {org.type || 'ORGANIZATION'}
                          </Badge>
                          {org.industry && (
                            <span className="text-[11px] text-muted-foreground truncate">
                              • {org.industry}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Tagline / Description */}
                    {org.tagline && (
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {org.tagline}
                      </p>
                    )}

                    {/* Meta Info: Location & Stats */}
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-muted-foreground pt-0.5">
                      {org.location?.city && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span>
                            {org.location.city}
                            {org.location.country ? `, ${org.location.country}` : ''}
                          </span>
                        </span>
                      )}
                      <span>• {(org as any).followersCount || 0} followers</span>
                      <span>• {org.membersCount || 1} members</span>
                    </div>
                  </div>

                  {/* Actions: View Showcase + Follow Button */}
                  <div className="flex items-center gap-2 pt-2.5 border-t border-border/60">
                    <Link to={showcaseLink} className="flex-1 min-w-[95px]">
                      <Button variant="outline" size="sm" className="w-full text-xs h-7.5">
                        View Organization
                      </Button>
                    </Link>

                    <Button
                      size="sm"
                      variant={isFollowing ? 'secondary' : 'default'}
                      className={cn(
                        'text-xs h-7.5 px-2.5 font-semibold shrink-0 transition-all',
                        isFollowing && 'hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30'
                      )}
                      isLoading={
                        followOrgMutation.isPending &&
                        followOrgMutation.variables === orgId
                      }
                      onClick={() => {
                        if (!user) {
                          navigate('/login')
                          return
                        }
                        followOrgMutation.mutate(orgId)
                      }}
                      leftIcon={
                        isFollowing ? (
                          <UserCheck className="h-3.5 w-3.5 text-primary" />
                        ) : (
                          <Plus className="h-3.5 w-3.5" />
                        )
                      }
                    >
                      {isFollowing ? 'Following' : 'Follow'}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )
      ) : (
        /* Users Grid */
        isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="p-3.5 sm:p-4 rounded-xl border border-border bg-card space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-xl" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
              <Skeleton className="h-8 w-full rounded-lg" />
            </div>
          ))}
        </div>
      ) : users.length === 0 ? (
        <EmptyState
          icon={<Compass className="h-6 w-6" />}
          title="No people found"
          description="Try broadening your search keywords or removing the remote filter."
          actionLabel="Clear Filters"
          onAction={() => {
            setSearchTerm('')
            setRemoteOnly(false)
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
          {users.map((person: DiscoveryUserCard) => {
            const targetId = person.id || (person as any)._id || person.userId || ''
            return (
              <div
                key={targetId || person.username}
                className="flex flex-col justify-between p-3.5 sm:p-4 rounded-xl border border-border bg-card shadow-xs hover:border-primary/40 transition-all duration-200 text-left space-y-3"
              >
                <div className="space-y-2.5">
                  {/* User Top Card */}
                  <div className="flex items-start gap-2.5">
                    <Avatar
                      src={person.avatarUrl || undefined}
                      fallback={person.displayName}
                      alt={person.displayName}
                      size="md"
                      className="rounded-xl shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <Link
                        to={`/u/${person.username}`}
                        className="text-sm font-bold text-foreground hover:text-primary transition-colors truncate block"
                      >
                        {person.displayName}
                      </Link>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-medium text-muted-foreground truncate">
                          @{person.username}
                        </span>
                        {person.hasActiveCard && (
                          <span
                            className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded-md shrink-0"
                            title="Active NFC Smart Card"
                          >
                            <Wifi className="h-2.5 w-2.5 rotate-90" />
                            <span>NFC</span>
                          </span>
                        )}
                      </div>
                      {(() => {
                        const displayHeadline =
                          person.headline?.trim() ||
                          person.primaryProfession?.trim() ||
                          person.templateName?.trim() ||
                          (person as any).professionTitle?.trim() ||
                          person.identities?.[0]?.customTitle?.trim() ||
                          'Basic Universal Template';
                        return (
                          <p className="text-xs text-primary font-medium line-clamp-1 mt-0.5">
                            {displayHeadline}
                          </p>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Primary & Secondary Identities */}
                  {person.identities && person.identities.length > 0 && (() => {
                    const headlineLower = (
                      person.headline?.trim() ||
                      person.primaryProfession?.trim() ||
                      person.templateName?.trim() ||
                      (person as any).professionTitle?.trim() ||
                      person.identities?.[0]?.customTitle?.trim() ||
                      ''
                    ).toLowerCase()
                    const filteredIdentities = person.identities
                      .filter((id: { customTitle: string }, idx: number, arr: any[]) => {
                        if (!id.customTitle?.trim()) return false
                        const norm = id.customTitle.trim().toLowerCase()
                        if (headlineLower && norm === headlineLower) return false
                        return arr.findIndex((other: any) => other.customTitle?.trim().toLowerCase() === norm) === idx
                      })
                      .slice(0, 2)
                    if (filteredIdentities.length === 0) return null
                    return (
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {filteredIdentities.map((id: { customTitle: string }, i: number) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-muted text-foreground/80 flex items-center gap-1"
                          >
                            <Briefcase className="h-3 w-3 text-primary" />
                            <span>{id.customTitle}</span>
                          </span>
                        ))}
                      </div>
                    )
                  })()}

                  {/* Skills Preview */}
                  {person.skills && person.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {person.skills.slice(0, 3).map((skill: { name: string }, sIdx: number) => (
                        <span
                          key={sIdx}
                          className="px-1.5 py-0.5 rounded-md text-[10px] bg-primary-soft text-primary font-medium"
                        >
                          {skill.name}
                        </span>
                      ))}
                      {person.skills.length > 3 && (
                        <span className="text-[10px] text-muted-foreground px-1 py-0.5">
                          +{person.skills.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Location */}
                  {person.location && (() => {
                    const locText = typeof person.location === 'string'
                      ? person.location.trim()
                      : [person.location.city, person.location.state, person.location.country].filter(Boolean).join(', ')
                    const isRemote = typeof person.location === 'object' && person.location?.isRemote
                    if (!locText) return null
                    return (
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">
                          {locText}
                          {isRemote && ' (Remote)'}
                        </span>
                      </div>
                    )
                  })()}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-2.5 border-t border-border/60">
                  <Link to={`/u/${person.username}`} className="flex-1 min-w-[95px]">
                    <Button variant="outline" size="sm" className="w-full text-xs h-7.5">
                      View Profile
                    </Button>
                  </Link>

                  {person.connectionState === 'CONNECTED' ? (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        variant="default"
                        className="text-xs bg-primary/10 text-primary hover:bg-primary hover:text-white border border-primary/20 transition-all font-semibold h-7.5 px-2.5"
                        isLoading={startingChatUserId === targetId}
                        onClick={() => handleStartMessage(targetId)}
                        leftIcon={<MessageSquare className="h-3.5 w-3.5" />}
                      >
                        Message
                      </Button>
                      <Badge variant="success" className="py-0.5 px-2 text-[10px] font-medium whitespace-nowrap">
                        Connected
                      </Badge>
                    </div>
                  ) : person.connectionState === 'PENDING_SENT' ? (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge variant="subtle" className="py-0.5 px-2 text-[10px]">
                        Requested
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-muted-foreground hover:text-destructive h-7.5 px-2"
                        isLoading={withdrawMutation.isPending && withdrawMutation.variables === (person.connectionId || targetId)}
                        onClick={() => withdrawMutation.mutate(person.connectionId || targetId)}
                        title="Cancel sent request"
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : person.connectionState === 'PENDING_RECEIVED' ? (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        className="text-xs h-7.5 px-2.5"
                        isLoading={acceptMutation.isPending && acceptMutation.variables === (person.connectionId || targetId)}
                        onClick={() => acceptMutation.mutate(person.connectionId || targetId)}
                        leftIcon={<UserCheck className="h-3.5 w-3.5" />}
                      >
                        Accept
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-7.5 px-2 text-muted-foreground hover:text-destructive"
                        isLoading={rejectMutation.isPending && rejectMutation.variables === (person.connectionId || targetId)}
                        onClick={() => rejectMutation.mutate(person.connectionId || targetId)}
                        title="Decline connection request"
                      >
                        Ignore
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      className="text-xs h-7.5 px-3"
                      isLoading={sendRequestMutation.isPending && sendRequestMutation.variables === targetId}
                      onClick={() => sendRequestMutation.mutate(targetId)}
                      leftIcon={<UserPlus className="h-3.5 w-3.5" />}
                    >
                      Connect
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )
    )}
    </div>
  )
}
