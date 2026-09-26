import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { connectionsApi } from '@/features/connections/api/connections.api'
import { messagingApi } from '@/features/messaging/api/messaging.api'
import { queryKeys } from '@/lib/query/queryKeys'
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/Dialog'
import { Avatar } from '@/components/ui/Avatar'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { toast } from '@/stores/toastStore'
import { Users, Search, Check, X, Plus } from 'lucide-react'
import type { ConnectionUserSummary } from '@/types/networking.types'

interface CreateGroupModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onGroupCreated: (conversationId: string) => void
}

export function CreateGroupModal({
  open,
  onOpenChange,
  onGroupCreated,
}: CreateGroupModalProps) {
  const queryClient = useQueryClient()
  const [title, setTitle] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [searchTerm, setSearchTerm] = React.useState('')
  const [selectedUserIds, setSelectedUserIds] = React.useState<string[]>([])

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.connections.list(),
    queryFn: () => connectionsApi.getConnections({ limit: 100 }),
    enabled: open,
  })

  const connections = data?.data?.connections || []

  // Reset form when modal closes/opens
  React.useEffect(() => {
    if (open) {
      setTitle('')
      setDescription('')
      setSearchTerm('')
      setSelectedUserIds([])
    }
  }, [open])

  const toggleSelectUser = (id: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const filteredConnections = React.useMemo(() => {
    if (!searchTerm.trim()) return connections
    const q = searchTerm.toLowerCase().trim()
    return connections.filter((item) => {
      const u = item.user as ConnectionUserSummary
      if (!u) return false
      const name = (u.displayName || '').toLowerCase()
      const uname = (u.username || '').toLowerCase()
      const headline = (u.headline || '').toLowerCase()
      return name.includes(q) || uname.includes(q) || headline.includes(q)
    })
  }, [connections, searchTerm])

  const selectedUsers = React.useMemo(() => {
    return connections
      .map((c) => c.user as ConnectionUserSummary)
      .filter((u) => u && selectedUserIds.includes(u._id || u.id || ''))
  }, [connections, selectedUserIds])

  const createMutation = useMutation({
    mutationFn: (payload: { title: string; description?: string; memberUserIds: string[] }) =>
      messagingApi.createGroup(payload),
    onSuccess: async (res) => {
      toast.success('Group chat created successfully!')
      await queryClient.invalidateQueries({ queryKey: queryKeys.conversations.list() })
      onOpenChange(false)
      const convId = res.data?.conversation?._id || res.data?.conversation?.id
      if (convId) {
        onGroupCreated(convId)
      }
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to create group chat')
    },
  })

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      toast.error('Please enter a group title')
      return
    }
    createMutation.mutate({
      title: title.trim(),
      description: description.trim() || undefined,
      memberUserIds: selectedUserIds,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} className="max-w-md">
      <DialogHeader>
        <div className="flex items-center gap-2 text-primary mb-1">
          <div className="p-2 rounded-xl bg-primary/10">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <DialogTitle>Create Group Chat</DialogTitle>
            <DialogDescription className="text-xs">
              Collaborate in a group chat. You will be the group Admin.
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <form onSubmit={handleCreate} className="space-y-4 pt-2">
        {/* Group Title */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">
            Group Title <span className="text-destructive">*</span>
          </label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Design Leads, Marketing Sync"
            required
            autoFocus
            className="text-xs"
          />
        </div>

        {/* Group Description */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground">
            Description (Optional)
          </label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this group about?"
            className="text-xs"
          />
        </div>

        {/* Selected Members Chips */}
        {selectedUsers.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Selected Members ({selectedUsers.length})</span>
              <button
                type="button"
                onClick={() => setSelectedUserIds([])}
                className="text-primary hover:underline"
              >
                Clear all
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto custom-scrollbar p-1.5 rounded-xl bg-muted/30 border border-border/50">
              {selectedUsers.map((u) => {
                const uid = u._id || u.id || ''
                return (
                  <span
                    key={uid}
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-primary/15 text-primary text-xs font-medium border border-primary/20"
                  >
                    <span>{u.displayName || u.username}</span>
                    <button
                      type="button"
                      onClick={() => toggleSelectUser(uid)}
                      className="hover:text-destructive transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )
              })}
            </div>
          </div>
        )}

        {/* Member Selector from Connections */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-foreground flex items-center justify-between">
            <span>Add Members from Connections</span>
            <span className="text-[11px] text-muted-foreground font-normal">
              {selectedUserIds.length} added
            </span>
          </label>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search connections..."
              className="pl-9 text-xs"
            />
          </div>

          <div className="max-h-48 overflow-y-auto divide-y divide-border/40 custom-scrollbar rounded-xl border border-border/50 bg-background/50">
            {isLoading ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                Loading connections...
              </div>
            ) : connections.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                No connections available. You can add members after creating the group.
              </div>
            ) : filteredConnections.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                No connection found matching "{searchTerm}".
              </div>
            ) : (
              filteredConnections.map((item) => {
                const u = item.user as ConnectionUserSummary
                if (!u) return null
                const uid = u._id || u.id || ''
                const isSelected = selectedUserIds.includes(uid)

                return (
                  <button
                    key={uid}
                    type="button"
                    onClick={() => toggleSelectUser(uid)}
                    className={`w-full flex items-center justify-between p-2.5 hover:bg-muted/40 transition-colors text-left ${
                      isSelected ? 'bg-primary/5' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar
                        src={u.avatarUrl || undefined}
                        fallback={u.displayName || u.username || 'User'}
                        size="sm"
                        className="rounded-xl shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="font-semibold text-xs text-foreground truncate">
                          {u.displayName || u.username}
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {u.primaryProfession || u.headline || `@${u.username}`}
                        </div>
                      </div>
                    </div>

                    <div
                      className={`h-5 w-5 rounded-lg flex items-center justify-center border transition-colors shrink-0 ${
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
        </div>

        {/* Submit Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={createMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            isLoading={createMutation.isPending}
            disabled={!title.trim() || createMutation.isPending}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            Create Group
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
