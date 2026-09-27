import * as React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { connectionsApi } from '@/features/connections/api/connections.api'
import { messagingApi } from '@/features/messaging/api/messaging.api'
import { queryKeys } from '@/lib/query/queryKeys'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingScreen } from '@/components/common/LoadingScreen'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { ReportDialog } from '@/components/common/ReportDialog'
import { toast } from '@/stores/toastStore'
import {
  Users,
  UserCheck,
  MessageSquare,
  ShieldAlert,
  ArrowRight,
  UserX,
  Flag,
  Folder,
} from 'lucide-react'
import { AssignFolderModal } from '@/components/messaging/AssignFolderModal'
import type { ConnectionUserSummary } from '@/types/networking.types'

export default function ConnectionsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [disconnectUserId, setDisconnectUserId] = React.useState<string | null>(null)
  const [blockUserId, setBlockUserId] = React.useState<string | null>(null)
  const [reportTarget, setReportTarget] = React.useState<{ id: string; name: string } | null>(null)

  // Mutual Connections Modal State
  const [mutualModalUser, setMutualModalUser] = React.useState<{ id: string; name: string } | null>(null)
  const [folderTarget, setFolderTarget] = React.useState<{ id: string; name: string } | null>(null)

  // Queries
  const { data: connectionsData, isLoading: isConnLoading } = useQuery({
    queryKey: queryKeys.connections.list(),
    queryFn: () => connectionsApi.getConnections(),
  })

  const { data: incomingData, isLoading: isIncomingLoading } = useQuery({
    queryKey: queryKeys.connections.pending('incoming'),
    queryFn: () => connectionsApi.getPendingRequests('incoming'),
  })

  const { data: outgoingData } = useQuery({
    queryKey: queryKeys.connections.pending('outgoing'),
    queryFn: () => connectionsApi.getPendingRequests('outgoing'),
  })

  const { data: blockedData } = useQuery({
    queryKey: queryKeys.connections.blocked,
    queryFn: () => connectionsApi.getBlockedUsers(),
  })

  // Mutual connections query
  const { data: mutualData, isLoading: isMutualLoading } = useQuery({
    queryKey: ['connections', 'mutual', mutualModalUser?.id],
    queryFn: () => connectionsApi.getMutualConnections(mutualModalUser!.id),
    enabled: !!mutualModalUser?.id,
  })

  // Mutations
  const acceptMutation = useMutation({
    mutationFn: (requestId: string) => connectionsApi.acceptRequest(requestId),
    onSuccess: () => {
      toast.success('Connection accepted!')
      queryClient.invalidateQueries({ queryKey: ['connections'] })
    },
    onError: (err: unknown) => {
      const apiErr = err as { message?: string }
      toast.error(apiErr.message || 'Failed to accept request')
    },
  })

  const rejectMutation = useMutation({
    mutationFn: (requestId: string) => connectionsApi.rejectRequest(requestId),
    onSuccess: () => {
      toast.default('Request rejected.')
      queryClient.invalidateQueries({ queryKey: ['connections'] })
    },
  })

  const withdrawMutation = useMutation({
    mutationFn: (requestId: string) => connectionsApi.withdrawRequest(requestId),
    onSuccess: () => {
      toast.default('Request withdrawn.')
      queryClient.invalidateQueries({ queryKey: ['connections'] })
    },
  })

  const disconnectMutation = useMutation({
    mutationFn: (targetUserId: string) => connectionsApi.removeConnection(targetUserId),
    onSuccess: () => {
      toast.default('Connection removed.')
      setDisconnectUserId(null)
      queryClient.invalidateQueries({ queryKey: ['connections'] })
    },
  })

  const blockMutation = useMutation({
    mutationFn: (targetUserId: string) => connectionsApi.blockUser(targetUserId),
    onSuccess: () => {
      toast.success('User blocked successfully.')
      setBlockUserId(null)
      queryClient.invalidateQueries({ queryKey: ['connections'] })
    },
    onError: (err: unknown) => {
      const apiErr = err as { message?: string }
      toast.error(apiErr.message || 'Failed to block user')
    },
  })

  const unblockMutation = useMutation({
    mutationFn: (targetUserId: string) => connectionsApi.unblockUser(targetUserId),
    onSuccess: () => {
      toast.success('User unblocked.')
      queryClient.invalidateQueries({ queryKey: ['connections'] })
    },
  })

  const handleStartMessage = async (recipientId: string) => {
    try {
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
    } catch (err: unknown) {
      const apiErr = err as { message?: string }
      toast.error(apiErr.message || 'Could not start conversation')
    }
  }

  const connections = connectionsData?.data?.connections || []
  const incoming = incomingData?.data?.requests || []
  const outgoing = outgoingData?.data?.requests || []
  const blockedUsers = blockedData?.data?.blockedUsers || []

  if (isConnLoading || isIncomingLoading) {
    return <LoadingScreen message="Loading your connections..." />
  }

  return (
    <div className="space-y-6 text-left max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-0.5">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Connections
          </h1>
          <p className="text-xs text-muted-foreground">
            Manage your direct connections, incoming requests, and peer network.
          </p>
        </div>

        <Link to="/app/discovery">
          <Button size="sm" rightIcon={<ArrowRight className="h-4 w-4" />}>
            Discover People
          </Button>
        </Link>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="connected" className="w-full space-y-6">
        <TabsList className="justify-start">
          <TabsTrigger value="connected">
            Connected ({connections.length})
          </TabsTrigger>
          <TabsTrigger value="incoming">
            Incoming Requests ({incoming.length})
          </TabsTrigger>
          <TabsTrigger value="outgoing">
            Sent Requests ({outgoing.length})
          </TabsTrigger>
          <TabsTrigger value="blocked">
            Blocked ({blockedUsers.length})
          </TabsTrigger>
        </TabsList>

        {/* 1. Connected Users */}
        <TabsContent value="connected" className="space-y-4">
          {connections.length === 0 ? (
            <EmptyState
              icon={<Users className="h-6 w-6" />}
              title="No connections yet"
              description="Start connecting with colleagues and peers to exchange verified credentials."
              actionLabel="Explore Discovery"
              onAction={() => navigate('/app/network')}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {connections.map((item) => {
                const other = item.user as ConnectionUserSummary
                if (!other) return null
                const otherId = other._id || other.id || ''
                return (
                  <div
                    key={item._id || item.id}
                    className="flex flex-col justify-between p-4 rounded-2xl border border-border bg-card shadow-sm hover:shadow-card transition-all gap-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar
                          src={other?.avatarUrl || undefined}
                          fallback={other?.displayName || other?.username || 'User'}
                          alt={other?.displayName || other?.username || 'User'}
                          size="md"
                          className="rounded-xl"
                        />
                        <div className="min-w-0 flex-1">
                          {other?.username ? (
                            <Link
                              to={`/u/${other.username}`}
                              className="font-bold text-sm text-foreground hover:text-primary transition-colors truncate block"
                            >
                              {other?.displayName || other?.username}
                            </Link>
                          ) : (
                            <span className="font-bold text-sm text-foreground">
                              {other?.displayName || 'OneWinq User'}
                            </span>
                          )}
                          {other?.username && (
                            <div className="text-xs text-muted-foreground truncate">
                              @{other.username}
                            </div>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setMutualModalUser({
                            id: otherId,
                            name: other.displayName || other.username,
                          })
                        }
                        className="text-xs text-primary font-medium hover:underline flex items-center gap-1 shrink-0"
                      >
                        <Users className="h-3 w-3" />
                        <span>Mutuals</span>
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border/60">
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="subtle"
                          size="sm"
                          onClick={() => handleStartMessage(otherId)}
                          leftIcon={<MessageSquare className="h-3.5 w-3.5" />}
                        >
                          Message
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => setDisconnectUserId(otherId)}
                        >
                          Disconnect
                        </Button>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            setFolderTarget({
                              id: otherId,
                              name: other.displayName || other.username,
                            })
                          }
                          title="Organize into folder"
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-primary transition-colors"
                        >
                          <Folder className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setBlockUserId(otherId)}
                          title="Block User"
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <UserX className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setReportTarget({
                              id: otherId,
                              name: other.displayName || other.username,
                            })
                          }
                          title="Report User"
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Flag className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* 2. Incoming Requests */}
        <TabsContent value="incoming" className="space-y-4">
          {incoming.length === 0 ? (
            <EmptyState
              icon={<UserCheck className="h-6 w-6" />}
              title="No pending requests"
              description="When peers request to connect with your identity, they will appear here."
            />
          ) : (
            <div className="space-y-3">
              {incoming.map((req) => {
                const rawUser = req.user || (typeof req.requesterId === 'object' ? req.requesterId : null)
                const requester = (rawUser || {}) as ConnectionUserSummary
                const reqId = (req as any).requestId || req._id || req.id || ''
                return (
                  <div
                    key={reqId || Math.random().toString()}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border border-border bg-card shadow-sm gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={requester?.avatarUrl || undefined}
                        fallback={requester?.displayName || requester?.username || 'User'}
                        alt={requester?.displayName || requester?.username || 'User'}
                        size="md"
                        className="rounded-xl"
                      />
                      <div>
                        <div className="font-bold text-sm text-foreground">
                          {requester?.displayName || requester?.username || 'OneWinq User'}
                        </div>
                        {requester?.username && (
                          <div className="text-xs text-muted-foreground">
                            @{requester.username}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        isLoading={rejectMutation.isPending}
                        onClick={() => reqId && rejectMutation.mutate(reqId)}
                      >
                        Ignore
                      </Button>
                      <Button
                        size="sm"
                        isLoading={acceptMutation.isPending}
                        onClick={() => reqId && acceptMutation.mutate(reqId)}
                        leftIcon={<UserCheck className="h-3.5 w-3.5" />}
                      >
                        Accept Connection
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* 3. Outgoing Requests */}
        <TabsContent value="outgoing" className="space-y-4">
          {outgoing.length === 0 ? (
            <EmptyState
              icon={<Users className="h-6 w-6" />}
              title="No outgoing requests"
              description="Requests you send to other users will be listed here until accepted."
            />
          ) : (
            <div className="space-y-3">
              {outgoing.map((req) => {
                const rawUser = req.user || (typeof req.recipientId === 'object' ? req.recipientId : null)
                const recipient = (rawUser || {}) as ConnectionUserSummary
                const reqId = (req as any).requestId || req._id || req.id || ''
                return (
                  <div
                    key={reqId || Math.random().toString()}
                    className="flex items-center justify-between p-4 rounded-2xl border border-border bg-card shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={recipient?.avatarUrl || undefined}
                        fallback={recipient?.displayName || recipient?.username || 'User'}
                        alt={recipient?.displayName || recipient?.username || 'User'}
                        size="md"
                        className="rounded-xl"
                      />
                      <div>
                        <div className="font-bold text-sm text-foreground">
                          {recipient?.displayName || recipient?.username || 'OneWinq User'}
                        </div>
                        {recipient?.username && (
                          <div className="text-xs text-muted-foreground">
                            @{recipient.username}
                          </div>
                        )}
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      isLoading={withdrawMutation.isPending}
                      onClick={() => reqId && withdrawMutation.mutate(reqId)}
                    >
                      Withdraw Request
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* 4. Blocked Users */}
        <TabsContent value="blocked" className="space-y-4">
          {blockedUsers.length === 0 ? (
            <EmptyState
              icon={<ShieldAlert className="h-6 w-6" />}
              title="No blocked users"
              description="Users you block will not be able to discover or message you."
            />
          ) : (
            <div className="space-y-3">
              {blockedUsers.map((u) => (
                <div
                  key={u._id || u.id}
                  className="flex items-center justify-between p-4 rounded-2xl border border-border bg-card shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <Avatar
                      fallback={u.displayName}
                      alt={u.displayName}
                      size="sm"
                    />
                    <div>
                      <div className="font-bold text-sm text-foreground">
                        {u.displayName}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        @{u.username}
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    isLoading={unblockMutation.isPending}
                    onClick={() => unblockMutation.mutate(u._id || u.id || '')}
                  >
                    Unblock User
                  </Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Disconnect Confirmation Dialog */}
      <ConfirmDialog
        open={!!disconnectUserId}
        onOpenChange={(open) => !open && setDisconnectUserId(null)}
        title="Disconnect Connection"
        description="Are you sure you want to disconnect? You will no longer have access to private mode credentials or direct messages."
        confirmText="Disconnect"
        variant="destructive"
        isLoading={disconnectMutation.isPending}
        onConfirm={() => {
          if (disconnectUserId) {
            disconnectMutation.mutate(disconnectUserId)
          }
        }}
      />

      {/* Block Confirmation Dialog */}
      <ConfirmDialog
        open={!!blockUserId}
        onOpenChange={(open) => !open && setBlockUserId(null)}
        title="Block User"
        description="Are you sure you want to block this user? They will not be able to see your profile, send requests, or message you."
        confirmText="Block User"
        variant="destructive"
        isLoading={blockMutation.isPending}
        onConfirm={() => {
          if (blockUserId) {
            blockMutation.mutate(blockUserId)
          }
        }}
      />

      {/* Mutual Connections Modal */}
      <Dialog open={!!mutualModalUser} onOpenChange={(open) => !open && setMutualModalUser(null)}>
        <DialogHeader>
          <DialogTitle>Mutual Connections</DialogTitle>
          <DialogDescription>
            People in common between you and {mutualModalUser?.name}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-2">
          {isMutualLoading ? (
            <div className="p-6 text-center text-xs text-muted-foreground">Finding mutual connections...</div>
          ) : (mutualData?.data?.mutualConnections || []).length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">No mutual connections found.</div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {(mutualData?.data?.mutualConnections || []).map((m) => (
                <div key={m._id || m.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card">
                  <Avatar src={m.avatarUrl} fallback={m.displayName} size="sm" />
                  <div>
                    <div className="font-bold text-xs text-foreground">{m.displayName}</div>
                    <div className="text-[11px] text-muted-foreground">@{m.username}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={() => setMutualModalUser(null)}>Close</Button>
        </DialogFooter>
      </Dialog>

      {/* Report Modal */}
      {reportTarget && (
        <ReportDialog
          open={!!reportTarget}
          onOpenChange={(open) => !open && setReportTarget(null)}
          targetType="USER"
          targetId={reportTarget.id}
          targetName={reportTarget.name}
        />
      )}

      {/* Organize Folder Modal */}
      {folderTarget && (
        <AssignFolderModal
          open={!!folderTarget}
          onOpenChange={(open) => !open && setFolderTarget(null)}
          targetUserId={folderTarget.id}
          targetUserName={folderTarget.name}
          onCreateNewFolder={() => {
            setFolderTarget(null)
            navigate('/app/messages')
          }}
        />
      )}
    </div>
  )
}
