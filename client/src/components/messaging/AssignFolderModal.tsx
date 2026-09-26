import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { messagingApi } from '@/features/messaging/api/messaging.api'
import { queryKeys } from '@/lib/query/queryKeys'
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { toast } from '@/stores/toastStore'
import { Folder, FolderPlus, Check } from 'lucide-react'
import type { ChatFolder } from '@/types/messaging.types'

interface AssignFolderModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  targetUserId: string
  targetUserName?: string
  onCreateNewFolder?: () => void
}

const COLOR_CLASSES: Record<string, { bg: string; text: string }> = {
  purple: { bg: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30', text: 'text-purple-600' },
  blue: { bg: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30', text: 'text-blue-600' },
  emerald: { bg: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30', text: 'text-emerald-600' },
  amber: { bg: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30', text: 'text-amber-600' },
  rose: { bg: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30', text: 'text-rose-600' },
  indigo: { bg: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30', text: 'text-indigo-600' },
  cyan: { bg: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30', text: 'text-cyan-600' },
}

export function AssignFolderModal({
  open,
  onOpenChange,
  targetUserId,
  targetUserName,
  onCreateNewFolder,
}: AssignFolderModalProps) {
  const queryClient = useQueryClient()

  const { data } = useQuery({
    queryKey: queryKeys.conversations.folders,
    queryFn: () => messagingApi.getFolders(),
    enabled: open,
  })

  const folders: ChatFolder[] = data?.data?.folders || []

  const toggleMutation = useMutation({
    mutationFn: ({ folderId }: { folderId: string }) =>
      messagingApi.toggleFolderMember(folderId, targetUserId),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.folders })
      toast.success(res.data.isMember ? 'Added to folder' : 'Removed from folder')
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to update folder')
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange} className="max-w-sm">
      <DialogHeader>
        <div className="flex items-center gap-2 text-primary mb-1">
          <Folder className="h-5 w-5" />
          <DialogTitle>Organize into Folders</DialogTitle>
        </div>
        <DialogDescription>
          Assign {targetUserName || 'this user'} to your custom folders for quick access.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-3 pt-2">
        {folders.length === 0 ? (
          <div className="p-6 text-center space-y-3 border border-dashed border-border rounded-2xl">
            <p className="text-xs text-muted-foreground">
              You haven't created any folders yet.
            </p>
            {onCreateNewFolder && (
              <Button
                size="sm"
                variant="subtle"
                onClick={() => {
                  onOpenChange(false)
                  onCreateNewFolder()
                }}
                leftIcon={<FolderPlus className="h-4 w-4" />}
              >
                Create First Folder
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-1.5 max-h-60 overflow-y-auto custom-scrollbar pr-1">
            {folders.map((folder) => {
              const fId = folder.id || (folder as any)._id
              const isMember = (folder.memberUserIds || []).includes(targetUserId)
              const colorStyle = COLOR_CLASSES[folder.color] || COLOR_CLASSES.purple

              return (
                <button
                  key={fId}
                  type="button"
                  onClick={() => toggleMutation.mutate({ folderId: fId })}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left ${
                    isMember
                      ? `${colorStyle.bg} font-medium`
                      : 'border-border hover:bg-muted/40 text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Folder className={`h-4 w-4 ${isMember ? colorStyle.text : 'text-muted-foreground'}`} />
                    <span className="text-xs">{folder.name}</span>
                  </div>

                  <div
                    className={`h-4 w-4 rounded border flex items-center justify-center transition-colors ${
                      isMember
                        ? 'bg-primary border-primary text-white'
                        : 'border-border bg-card'
                    }`}
                  >
                    {isMember && <Check className="h-3 w-3 stroke-[3]" />}
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {folders.length > 0 && onCreateNewFolder && (
          <div className="pt-2 border-t border-border">
            <button
              type="button"
              onClick={() => {
                onOpenChange(false)
                onCreateNewFolder()
              }}
              className="w-full flex items-center justify-center gap-2 p-2 rounded-xl text-xs font-semibold text-primary hover:bg-primary-soft transition-colors"
            >
              <FolderPlus className="h-4 w-4" />
              <span>Create Another Folder</span>
            </button>
          </div>
        )}
      </div>

      <DialogFooter>
        <Button size="sm" onClick={() => onOpenChange(false)}>
          Done
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
