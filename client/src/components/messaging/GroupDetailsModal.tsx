import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { messagingApi } from '@/features/messaging/api/messaging.api'
import { connectionsApi } from '@/features/connections/api/connections.api'
import { queryKeys } from '@/lib/query/queryKeys'
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/Dialog'
import { Avatar } from '@/components/ui/Avatar'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { toast } from '@/stores/toastStore'
import {
  Users,
  Shield,
  Crown,
  UserPlus,
  UserMinus,
  Edit2,
  Check,
  X,
  LogOut,
  Search,
} from 'lucide-react'
import type { GroupDetails } from '@/types/messaging.types'

import type { ConnectionUserSummary } from '@/types/networking.types'

interface GroupDetailsModalProps {
  conversationId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onLeftGroup?: () => void
}

export function GroupDetailsModal({
  conversationId,
  open,
  onOpenChange,
  onLeftGroup,
}: GroupDetailsModalProps) {
  const queryClient = useQueryClient()
  const [isEditingInfo, setIsEditingInfo] = React.useState(false)
  const [editTitle, setEditTitle] = React.useState('')
  const [editDescription, setEditDescription] = React.useState('')
  const [isAddMembersOpen, setIsAddMembersOpen] = React.useState(false)
  const [memberSearchTerm, setMemberSearchTerm] = React.useState('')
  const [selectedToAdd, setSelectedToAdd] = React.useState<string[]>([])


  // Fetch full details
  const { data: detailsData, isLoading } = useQuery({
    queryKey: ['conversations', 'details', conversationId],
    queryFn: () => messagingApi.getConversationDetails(conversationId),
    enabled: open && !!conversationId,
  })

  const groupDetails: GroupDetails | undefined = detailsData?.data

  // Fetch connections for adding members
  const { data: connData } = useQuery({
    queryKey: queryKeys.connections.list(),
    queryFn: () => connectionsApi.getConnections({ limit: 100 }),
    enabled: isAddMembersOpen,
  })

  const connections = connData?.data?.connections || []

  React.useEffect(() => {
    if (groupDetails) {
      setEditTitle(groupDetails.title || '')
      setEditDescription(groupDetails.description || '')
    }
  }, [groupDetails])

  // Invalidate queries helper
  const refreshAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['conversations', 'details', conversationId] }),
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.list() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.messages(conversationId) }),
    ])
  }

  // Update Group Info mutation
  const updateInfoMutation = useMutation({
    mutationFn: (payload: { title?: string; description?: string }) =>
      messagingApi.updateGroupInfo(conversationId, payload),
    onSuccess: async () => {
      toast.success('Group information updated')
      setIsEditingInfo(false)
      await refreshAll()
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to update group info')
    },
  })

  // Add members mutation
  const addMembersMutation = useMutation({
    mutationFn: (memberUserIds: string[]) =>
      messagingApi.addGroupMembers(conversationId, memberUserIds),
    onSuccess: async () => {
      toast.success('Members added successfully')
      setSelectedToAdd([])
      setIsAddMembersOpen(false)
      await refreshAll()
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to add members')
    },
  })

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: (memberId: string) =>
      messagingApi.removeGroupMember(conversationId, memberId),
    onSuccess: async () => {
      toast.success('Member removed from group')
      await refreshAll()
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to remove member')
    },
  })

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: ({ targetUserId, role }: { targetUserId: string; role: 'ADMIN' | 'MEMBER' }) =>
      messagingApi.updateMemberRole(conversationId, { targetUserId, role }),
    onSuccess: async (_data, vars) => {
      toast.success(
        vars.role === 'ADMIN'
          ? 'Appointed member as Admin!'
          : 'Changed role back to Member'
      )
      await refreshAll()
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to update member role')
    },
  })


  // Leave group mutation
  const leaveGroupMutation = useMutation({
    mutationFn: () => messagingApi.leaveGroup(conversationId),
    onSuccess: async () => {
      toast.success('You have left the group')
      onOpenChange(false)
      await queryClient.invalidateQueries({ queryKey: queryKeys.conversations.list() })
      if (onLeftGroup) {
        onLeftGroup()
      }
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to leave group')
    },
  })

  // Available connections to add (excluding current members)
  const currentMemberIds = React.useMemo(() => {
    return new Set(groupDetails?.members?.map((m) => m.id) || [])
  }, [groupDetails?.members])

  const eligibleConnections = React.useMemo(() => {
    return connections.filter((c) => {
      const u = c.user as ConnectionUserSummary
      if (!u) return false
      const uid = u._id || u.id || ''
      return !currentMemberIds.has(uid)
    })
  }, [connections, currentMemberIds])

  const filteredEligible = React.useMemo(() => {
    if (!memberSearchTerm.trim()) return eligibleConnections
    const q = memberSearchTerm.toLowerCase().trim()
    return eligibleConnections.filter((c) => {
      const u = c.user as ConnectionUserSummary
      if (!u) return false
      const name = (u.displayName || '').toLowerCase()
      const uname = (u.username || '').toLowerCase()
      return name.includes(q) || uname.includes(q)
    })
  }, [eligibleConnections, memberSearchTerm])

  const toggleSelectToAdd = (id: string) => {
    setSelectedToAdd((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  const handleSaveInfo = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editTitle.trim()) {
      toast.error('Title cannot be empty')
      return
    }
    updateInfoMutation.mutate({
      title: editTitle.trim(),
      description: editDescription.trim(),
    })
  }

  if (isLoading || !groupDetails) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange} className="max-w-lg">
        <div className="p-12 text-center text-xs text-muted-foreground">
          Loading group information...
        </div>
      </Dialog>
    )
  }

  const isAdmin = groupDetails.isAdmin
  const isCreator = groupDetails.isCreator

  return (
    <Dialog open={open} onOpenChange={onOpenChange} className="max-w-lg">
      <DialogHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">Group Details</DialogTitle>
              <DialogDescription className="text-xs">
                {groupDetails.memberCount} {groupDetails.memberCount === 1 ? 'member' : 'members'}
              </DialogDescription>
            </div>
          </div>
          {isAdmin && !isEditingInfo && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsEditingInfo(true)}
              leftIcon={<Edit2 className="h-3.5 w-3.5" />}
              className="text-xs h-8"
            >
              Edit Info
            </Button>
          )}
        </div>
      </DialogHeader>

      <div className="space-y-4 pt-2">
        {/* Group Header / Edit Info */}
        {isEditingInfo ? (
          <form onSubmit={handleSaveInfo} className="space-y-3 p-3 rounded-xl bg-muted/40 border border-border/60">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Group Title</label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Group title"
                className="text-xs h-8"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Description</label>
              <Input
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Group description"
                className="text-xs h-8"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsEditingInfo(false)}
                className="text-xs h-7"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                isLoading={updateInfoMutation.isPending}
                className="text-xs h-7"
              >
                Save Changes
              </Button>
            </div>
          </form>
        ) : (
          <div className="p-3.5 rounded-xl bg-muted/20 border border-border/50 space-y-1.5">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-foreground">{groupDetails.title}</h3>
              {groupDetails.currentUserRole && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wide uppercase bg-primary/10 text-primary border border-primary/20">
                  {groupDetails.currentUserRole}
                </span>
              )}
            </div>
            {groupDetails.description && (
              <p className="text-xs text-muted-foreground">{groupDetails.description}</p>
            )}
          </div>
        )}

        {/* Add Members Section (For Admins) */}
        {isAdmin && (
          <div className="space-y-2">
            {!isAddMembersOpen ? (
              <Button
                size="sm"
                variant="subtle"
                onClick={() => setIsAddMembersOpen(true)}
                leftIcon={<UserPlus className="h-4 w-4" />}
                className="w-full text-xs justify-center"
              >
                Add Members from Connections
              </Button>
            ) : (
              <div className="p-3 rounded-xl border border-primary/30 bg-primary/5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <UserPlus className="h-4 w-4 text-primary" />
                    <span>Add Members</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddMembersOpen(false)
                      setSelectedToAdd([])
                    }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={memberSearchTerm}
                    onChange={(e) => setMemberSearchTerm(e.target.value)}
                    placeholder="Search eligible connections..."
                    className="pl-8 text-xs h-8"
                  />
                </div>

                <div className="max-h-40 overflow-y-auto divide-y divide-border/30 custom-scrollbar rounded-lg border border-border/40 bg-background/80">
                  {filteredEligible.length === 0 ? (
                    <div className="p-4 text-center text-xs text-muted-foreground">
                      No connections available to add.
                    </div>
                  ) : (
                    filteredEligible.map((item) => {
                      const u = item.user as ConnectionUserSummary
                      if (!u) return null
                      const uid = u._id || u.id || ''
                      const isSelected = selectedToAdd.includes(uid)

                      return (
                        <button
                          key={uid}
                          type="button"
                          onClick={() => toggleSelectToAdd(uid)}
                          className={`w-full flex items-center justify-between p-2 hover:bg-muted/30 text-left text-xs ${
                            isSelected ? 'bg-primary/10' : ''
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Avatar
                              src={u.avatarUrl || undefined}
                              fallback={u.displayName || u.username || 'User'}
                              size="sm"
                              className="rounded-lg shrink-0 h-6 w-6 text-[10px]"
                            />
                            <div className="truncate font-medium">{u.displayName || u.username}</div>
                          </div>
                          <div
                            className={`h-4 w-4 rounded flex items-center justify-center border ${
                              isSelected
                                ? 'bg-primary border-primary text-white'
                                : 'border-muted-foreground/30 text-transparent'
                            }`}
                          >
                            <Check className="h-3 w-3 stroke-[3]" />
                          </div>
                        </button>
                      )
                    })
                  )}
                </div>

                <div className="flex items-center justify-end gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setIsAddMembersOpen(false)
                      setSelectedToAdd([])
                    }}
                    className="text-xs h-7"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    disabled={selectedToAdd.length === 0 || addMembersMutation.isPending}
                    isLoading={addMembersMutation.isPending}
                    onClick={() => addMembersMutation.mutate(selectedToAdd)}
                    className="text-xs h-7"
                  >
                    Add ({selectedToAdd.length})
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Member List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground px-1">
            <span>Members ({groupDetails.members.length})</span>
            {isAdmin && <span className="text-[11px] text-primary">Admin Controls Enabled</span>}
          </div>

          <div className="max-h-64 overflow-y-auto divide-y divide-border/40 custom-scrollbar rounded-xl border border-border/50 bg-background/50">
            {groupDetails.members.map((member) => {
              const isTargetCreator = member.role === 'CREATOR'
              const isTargetAdmin = member.role === 'ADMIN' || member.role === 'CREATOR'

              const canDemote = isCreator && isTargetAdmin && !isTargetCreator

              const canPromote = isAdmin && !isTargetAdmin
              const canRemove =
                isAdmin &&
                !isTargetCreator &&
                (!isTargetAdmin || isCreator)

              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-2.5 hover:bg-muted/30 transition-colors"
                >
                  {/* Member Info */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar
                      src={member.avatarUrl || undefined}
                      fallback={member.displayName || member.username}
                      size="sm"
                      className="rounded-xl shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-xs text-foreground truncate">
                          {member.displayName}
                        </span>
                        {/* Role Badges */}
                        {isTargetCreator ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                            <Crown className="h-3 w-3" />
                            Creator
                          </span>
                        ) : isTargetAdmin ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">
                            <Shield className="h-3 w-3" />
                            Admin
                          </span>
                        ) : null}
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {member.customTitle || (member.username ? `@${member.username}` : '')}
                      </div>
                    </div>
                  </div>

                  {/* Actions for Admin on this member */}
                  {isAdmin && (canPromote || canDemote || canRemove) && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Appoint as Admin button */}
                      {canPromote && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            updateRoleMutation.mutate({
                              targetUserId: member.id,
                              role: 'ADMIN',
                            })
                          }
                          isLoading={updateRoleMutation.isPending}
                          title="Appoint as Admin"
                          className="h-7 text-[11px] px-2 border-indigo-500/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10"
                        >
                          Make Admin
                        </Button>
                      )}

                      {/* Demote to Member button (Creator only) */}
                      {canDemote && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            updateRoleMutation.mutate({
                              targetUserId: member.id,
                              role: 'MEMBER',
                            })
                          }
                          isLoading={updateRoleMutation.isPending}
                          title="Dismiss as Admin"
                          className="h-7 text-[11px] px-2 text-muted-foreground hover:text-foreground"
                        >
                          Dismiss Admin
                        </Button>
                      )}

                      {/* Remove Member button */}
                      {canRemove && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            if (confirm(`Are you sure you want to remove ${member.displayName} from this group?`)) {
                              removeMemberMutation.mutate(member.id)
                            }
                          }}
                          isLoading={removeMemberMutation.isPending}
                          title="Remove from group"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        >
                          <UserMinus className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Leave Group Button */}
        <div className="pt-2 border-t border-border/60 flex items-center justify-between">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-xs"
          >
            Close
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              if (confirm('Are you sure you want to leave this group chat?')) {
                leaveGroupMutation.mutate()
              }
            }}
            isLoading={leaveGroupMutation.isPending}
            className="text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
            leftIcon={<LogOut className="h-3.5 w-3.5" />}
          >
            Leave Group
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
