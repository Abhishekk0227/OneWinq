import * as React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { discoveryApi } from '@/features/discovery/api/discovery.api'
import { connectionsApi } from '@/features/connections/api/connections.api'
import { messagingApi } from '@/features/messaging/api/messaging.api'
import { queryKeys } from '@/lib/query/queryKeys'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/common/EmptyState'
import { toast } from '@/stores/toastStore'
import {
  Search,
  MapPin,
  Briefcase,
  UserPlus,
  UserCheck,
  Compass,
  MessageSquare,
} from 'lucide-react'
import type { DiscoveryUserCard } from '@/types/networking.types'

export default function DiscoveryPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = React.useState('')
  const [debouncedSearch, setDebouncedSearch] = React.useState('')
  const [remoteOnly, setRemoteOnly] = React.useState(false)
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

  const users: DiscoveryUserCard[] = (data?.data?.users || data?.data?.results || []) as DiscoveryUserCard[]

  return (
    <div className="space-y-8 text-left max-w-6xl mx-auto pb-16">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-card border border-border shadow-sm">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
            <Compass className="h-3.5 w-3.5" />
            <span>Network Discovery</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Discover People & Professionals
          </h1>
          <p className="text-sm text-muted-foreground">
            Find and connect with professionals, creators, and colleagues.
          </p>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 p-4 rounded-2xl bg-card border border-border shadow-sm">
        <div className="relative flex-1 w-full">
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, role, skills (e.g. AI Architect, Rust, Design)..."
            leftIcon={<Search className="h-4 w-4" />}
            className="w-full"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <label className="flex items-center gap-2 text-xs font-semibold text-foreground/80 cursor-pointer select-none px-3 py-2 rounded-xl bg-muted/50 border border-border">
            <input
              type="checkbox"
              checked={remoteOnly}
              onChange={(e) => setRemoteOnly(e.target.checked)}
              className="rounded text-primary focus:ring-primary h-4 w-4"
            />
            <span>Remote Only</span>
          </label>
        </div>
      </div>

      {/* Users Grid */}
      {isLoading ? (
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {users.map((person: DiscoveryUserCard) => {
            const targetId = person.id || (person as any)._id || person.userId || ''
            return (
              <div
                key={targetId || person.username}
                className="flex flex-col justify-between p-6 rounded-3xl border border-border bg-card shadow-sm hover:shadow-card hover:border-primary/40 transition-all duration-200 text-left space-y-4"
              >
                <div className="space-y-4">
                  {/* User Top Card */}
                  <div className="flex items-start gap-3.5">
                    <Avatar
                      src={person.avatarUrl || undefined}
                      fallback={person.displayName}
                      alt={person.displayName}
                      size="lg"
                      className="rounded-2xl shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <Link
                        to={`/u/${person.username}`}
                        className="text-base font-bold text-foreground hover:text-primary transition-colors truncate block"
                      >
                        {person.displayName}
                      </Link>
                      <div className="text-xs font-medium text-muted-foreground truncate">
                        @{person.username}
                      </div>
                      {person.headline && (
                        <p className="text-xs text-primary font-medium line-clamp-1 mt-1">
                          {person.headline}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Primary & Secondary Identities */}
                  {person.identities && person.identities.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {person.identities.slice(0, 2).map((id: { customTitle: string }, i: number) => (
                        <span
                          key={i}
                          className="px-2.5 py-0.5 rounded-lg text-[11px] font-semibold bg-muted text-foreground/80 flex items-center gap-1"
                        >
                          <Briefcase className="h-3 w-3 text-primary" />
                          <span>{id.customTitle}</span>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Skills Preview */}
                  {person.skills && person.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {person.skills.slice(0, 3).map((skill: { name: string }, sIdx: number) => (
                        <span
                          key={sIdx}
                          className="px-2 py-0.5 rounded-md text-[10px] bg-primary-soft text-primary font-medium"
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
                  {person.location && (person.location.city || person.location.country) && (
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span>
                        {[person.location.city, person.location.country].filter(Boolean).join(', ')}
                        {person.location.isRemote && ' (Remote)'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-4 border-t border-border">
                  <Link to={`/u/${person.username}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full text-xs">
                      View Profile
                    </Button>
                  </Link>

                  {person.connectionState === 'CONNECTED' ? (
                    <>
                      <Button
                        size="sm"
                        variant="default"
                        className="text-xs shrink-0 bg-primary/10 text-primary hover:bg-primary hover:text-white border border-primary/20 transition-all font-semibold"
                        isLoading={startingChatUserId === targetId}
                        onClick={() => handleStartMessage(targetId)}
                        leftIcon={<MessageSquare className="h-3.5 w-3.5" />}
                      >
                        Message
                      </Button>
                      <Badge variant="success" className="py-1 px-2.5 shrink-0">
                        Connected
                      </Badge>
                    </>
                  ) : person.connectionState === 'PENDING_SENT' ? (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge variant="subtle" className="py-1 px-2.5 text-[11px]">
                        Requested
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-muted-foreground hover:text-destructive h-8 px-2"
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
                        className="text-xs h-8 px-2.5"
                        isLoading={acceptMutation.isPending && acceptMutation.variables === (person.connectionId || targetId)}
                        onClick={() => acceptMutation.mutate(person.connectionId || targetId)}
                        leftIcon={<UserCheck className="h-3.5 w-3.5" />}
                      >
                        Accept
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-8 px-2 text-muted-foreground hover:text-destructive"
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
                      className="text-xs"
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
      )}
    </div>
  )
}
