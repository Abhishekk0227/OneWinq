import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { messagingApi } from '@/features/messaging/api/messaging.api'
import { connectionsApi } from '@/features/connections/api/connections.api'
import { queryKeys } from '@/lib/query/queryKeys'
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog'
import { Avatar } from '@/components/ui/Avatar'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { toast } from '@/stores/toastStore'
import { Folder, FolderPlus, Trash2, Check, Search } from 'lucide-react'
import type { ChatFolder } from '@/types/messaging.types'
import type { ConnectionUserSummary } from '@/types/networking.types'

const FOLDER_COLORS = [
  { id: 'purple', label: 'Purple', bg: 'bg-purple-500', border: 'border-purple-500', soft: 'bg-purple-500/10 text-purple-600 dark:text-purple-400' },
  { id: 'blue', label: 'Blue', bg: 'bg-blue-500', border: 'border-blue-500', soft: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
  { id: 'emerald', label: 'Emerald', bg: 'bg-emerald-500', border: 'border-emerald-500', soft: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
  { id: 'amber', label: 'Amber', bg: 'bg-amber-500', border: 'border-amber-500', soft: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  { id: 'rose', label: 'Rose', bg: 'bg-rose-500', border: 'border-rose-500', soft: 'bg-rose-500/10 text-rose-600 dark:text-rose-400' },
  { id: 'indigo', label: 'Indigo', bg: 'bg-indigo-500', border: 'border-indigo-500', soft: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' },
  { id: 'cyan', label: 'Cyan', bg: 'bg-cyan-500', border: 'border-cyan-500', soft: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400' },
]

interface FolderModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  folderToEdit?: ChatFolder | null
  onSuccess?: (folder: ChatFolder) => void
  onDeleted?: (folderId: string) => void
}

export function FolderModal({
  open,
  onOpenChange,
  folderToEdit,
  onSuccess,
  onDeleted,
}: FolderModalProps) {
  const queryClient = useQueryClient()
  const [name, setName] = React.useState('')
  const [color, setColor] = React.useState('purple')
  const [selectedUserIds, setSelectedUserIds] = React.useState<string[]>([])
  const [search, setSearch] = React.useState('')

  const isEditing = !!folderToEdit

  // Reset form when modal opens or folderToEdit changes
  React.useEffect(() => {
    if (open) {
      if (folderToEdit) {
        setName(folderToEdit.name)
        setColor(folderToEdit.color || 'purple')
        setSelectedUserIds(folderToEdit.memberUserIds || [])
      } else {
        setName('')
        setColor('purple')
        setSelectedUserIds([])
      }
      setSearch('')
    }
  }, [open, folderToEdit])

  // Fetch connections to populate member selector
  const { data: connData } = useQuery({
    queryKey: queryKeys.connections.list(),
    queryFn: () => connectionsApi.getConnections({ limit: 100 }),
    enabled: open,
  })

  const connections = connData?.data?.connections || []

  const filteredConnections = React.useMemo(() => {
    if (!search.trim()) return connections
    const q = search.toLowerCase().trim()
    return connections.filter((item) => {
      const u = item.user as ConnectionUserSummary
      if (!u) return false
      return (
        (u.displayName || '').toLowerCase().includes(q) ||
        (u.username || '').toLowerCase().includes(q) ||
        (u.headline || '').toLowerCase().includes(q)
      )
    })
  }, [connections, search])

  const toggleUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    )
  }

  // Create mutation
  const createMutation = useMutation({
    mutationFn: () =>
      messagingApi.createFolder({
        name: name.trim(),
        color,
        memberUserIds: selectedUserIds,
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.folders })
      toast.success(`Folder "${name}" created!`)
      onOpenChange(false)
      if (onSuccess) onSuccess(res.data.folder)
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to create folder')
    },
  })

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: () =>
      messagingApi.updateFolder(folderToEdit!.id || (folderToEdit as any)._id, {
        name: name.trim(),
        color,
        memberUserIds: selectedUserIds,
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.folders })
      toast.success(`Folder updated!`)
      onOpenChange(false)
      if (onSuccess) onSuccess(res.data.folder)
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to update folder')
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: () =>
      messagingApi.deleteFolder(folderToEdit!.id || (folderToEdit as any)._id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.folders })
      toast.default(`Folder deleted.`)
      onOpenChange(false)
      if (onDeleted) onDeleted(folderToEdit!.id || (folderToEdit as any)._id)
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to delete folder')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.warning('Please enter a folder name.')
      return
    }
    if (isEditing) {
      updateMutation.mutate()
    } else {
      createMutation.mutate()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} className="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary mb-1">
            {isEditing ? <Folder className="h-5 w-5" /> : <FolderPlus className="h-5 w-5" />}
            <DialogTitle>{isEditing ? 'Edit Chat Folder' : 'Create Chat Folder'}</DialogTitle>
          </div>
          <DialogDescription>
            Organize your conversations and connected peers into custom groups.
          </DialogDescription>
        </DialogHeader>

        {/* Folder Name */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">Folder Name</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Work, Clients, Designers, Friends..."
            maxLength={30}
            required
            autoFocus
          />
        </div>

        {/* Color Palette */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">Tag Color</label>
          <div className="flex items-center gap-2 flex-wrap">
            {FOLDER_COLORS.map((c) => {
              const isSelected = color === c.id
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setColor(c.id)}
                  title={c.label}
                  className={`h-7 w-7 rounded-full flex items-center justify-center transition-all ${c.bg} ${
                    isSelected ? 'ring-2 ring-offset-2 ring-primary scale-110' : 'opacity-80 hover:opacity-100'
                  }`}
                >
                  {isSelected && <Check className="h-3.5 w-3.5 text-white stroke-[3]" />}
                </button>
              )
            })}
          </div>
        </div>

        {/* Members Selector */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-foreground">
              Add People ({selectedUserIds.length} selected)
            </label>
            {selectedUserIds.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedUserIds([])}
                className="text-[11px] text-muted-foreground hover:text-foreground"
              >
                Clear all
              </button>
            )}
          </div>

          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search people to add..."
              className="pl-8 text-xs h-8"
            />
          </div>

          <div className="max-h-48 overflow-y-auto divide-y divide-border/60 custom-scrollbar border border-border/80 rounded-xl p-1 bg-muted/20">
            {connections.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">
                No connections available to add.
              </div>
            ) : filteredConnections.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">
                No matching connection found.
              </div>
            ) : (
              filteredConnections.map((item) => {
                const u = item.user as ConnectionUserSummary
                if (!u) return null
                const userId = u._id || u.id || ''
                const isChecked = selectedUserIds.includes(userId)

                return (
                  <button
                    key={item._id || item.id}
                    type="button"
                    onClick={() => toggleUser(userId)}
                    className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted/60 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar
                        src={u.avatarUrl || undefined}
                        fallback={u.displayName || u.username || 'User'}
                        size="sm"
                        className="rounded-lg shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="font-semibold text-xs text-foreground truncate">
                          {u.displayName || u.username}
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate">
                          {u.headline || (u.username ? `@${u.username}` : '')}
                        </div>
                      </div>
                    </div>

                    <div
                      className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                        isChecked
                          ? 'bg-primary border-primary text-white'
                          : 'border-border bg-background'
                      }`}
                    >
                      {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        <DialogFooter>
          {isEditing && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive hover:bg-destructive/10 mr-auto"
              isLoading={deleteMutation.isPending}
              onClick={() => {
                if (confirm(`Delete folder "${folderToEdit?.name}"?`)) {
                  deleteMutation.mutate()
                }
              }}
              leftIcon={<Trash2 className="h-3.5 w-3.5" />}
            >
              Delete
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            isLoading={createMutation.isPending || updateMutation.isPending}
          >
            {isEditing ? 'Save Changes' : 'Create Folder'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  )
}
