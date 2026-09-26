import * as React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { postsApi } from '@/features/posts/api/posts.api'
import { mediaApi } from '@/features/media/api/media.api'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { toast } from '@/stores/toastStore'
import {
  Image as ImageIcon,
  Video,
  X,
  Globe,
  Users,
  Sparkles,
  Send,
  Loader2,
} from 'lucide-react'
import type { PostMedia } from '@/types/posts.types'

export function CreatePostModal() {
  const { activeModal, closeModal } = useUIStore()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  const isOpen = activeModal === 'CREATE_POST'

  const [content, setContent] = React.useState('')
  const [mediaList, setMediaList] = React.useState<PostMedia[]>([])
  const [isUploading, setIsUploading] = React.useState(false)
  const [visibility, setVisibility] = React.useState<'PUBLIC' | 'CONNECTIONS_ONLY'>('PUBLIC')

  const imageInputRef = React.useRef<HTMLInputElement | null>(null)
  const videoInputRef = React.useRef<HTMLInputElement | null>(null)

  const createPostMutation = useMutation({
    mutationFn: (payload: { content: string; media: PostMedia[]; visibility: string }) =>
      postsApi.createPost(payload),
    onSuccess: () => {
      toast.success('Your post is published and visible to the network!')
      setContent('')
      setMediaList([])
      closeModal()
      queryClient.invalidateQueries({ queryKey: ['posts'] })
    },
    onError: (err: unknown) => {
      const apiErr = err as { message?: string }
      toast.error(apiErr.message || 'Failed to publish post')
    },
  })

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'IMAGE' | 'VIDEO') => {
    const files = e.target.files
    if (!files || files.length === 0) return

    try {
      setIsUploading(true)
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const uploaded = await mediaApi.uploadFile(file, 'POST_MEDIA' as any)
        setMediaList((prev) => [
          ...prev,
          {
            type,
            url: uploaded.publicUrl,
            mediaId: uploaded.mediaId,
          },
        ])
      }
      toast.success(`${type === 'IMAGE' ? 'Image' : 'Video'} attached`)
    } catch {
      toast.error(`Failed to upload ${type.toLowerCase()}. Please check file size and format.`)
    } finally {
      setIsUploading(false)
      if (imageInputRef.current) imageInputRef.current.value = ''
      if (videoInputRef.current) videoInputRef.current.value = ''
    }
  }

  const handleRemoveMedia = (index: number) => {
    setMediaList((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim() && mediaList.length === 0) {
      toast.error('Please write something or attach media to post.')
      return
    }
    createPostMutation.mutate({
      content: content.trim(),
      media: mediaList,
      visibility,
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeModal()}>
      <div className="relative">
        <DialogHeader className="pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-primary-soft flex items-center justify-center text-primary">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-foreground">
                Create New Post
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Broadcast insights, milestones, or questions to your professional circle.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          {/* Author snippet & Visibility picker */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Avatar
                size="sm"
                src={user?.avatarUrl}
                fallback={user?.displayName || user?.username}
                alt={user?.displayName}
              />
              <div className="leading-tight">
                <div className="text-sm font-bold text-foreground">
                  {user?.displayName || user?.username}
                </div>
                <div className="text-xs text-muted-foreground">
                  @{user?.username}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/60 border border-border text-xs">
              <button
                type="button"
                onClick={() => setVisibility('PUBLIC')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-all ${
                  visibility === 'PUBLIC'
                    ? 'bg-card text-foreground shadow-sm font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Globe className="h-3 w-3" />
                <span>Public</span>
              </button>
              <button
                type="button"
                onClick={() => setVisibility('CONNECTIONS_ONLY')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-all ${
                  visibility === 'CONNECTIONS_ONLY'
                    ? 'bg-card text-foreground shadow-sm font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Users className="h-3 w-3" />
                <span>Network</span>
              </button>
            </div>
          </div>

          {/* Text Area */}
          <div className="relative">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What would you like to share with the community today?"
              rows={4}
              maxLength={5000}
              className="w-full resize-none rounded-2xl border border-border bg-card p-3.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all custom-scrollbar leading-relaxed"
            />
            <div className="text-[11px] text-muted-foreground/70 text-right pr-1">
              {content.length}/5000
            </div>
          </div>

          {/* Media Attachments Preview */}
          {mediaList.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto p-1 custom-scrollbar">
              {mediaList.map((media, idx) => (
                <div
                  key={idx}
                  className="group relative rounded-xl overflow-hidden border border-border bg-muted aspect-video flex items-center justify-center"
                >
                  {media.type === 'IMAGE' ? (
                    <img
                      src={media.url}
                      alt="Uploaded media"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <video
                      src={media.url}
                      className="w-full h-full object-cover"
                      controls
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveMedia(idx)}
                    className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-black/75 text-white flex items-center justify-center opacity-90 hover:opacity-100 hover:bg-black transition-opacity"
                    title="Remove media"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Hidden File Inputs */}
          <input
            type="file"
            ref={imageInputRef}
            onChange={(e) => handleMediaUpload(e, 'IMAGE')}
            accept="image/*"
            multiple
            className="hidden"
          />
          <input
            type="file"
            ref={videoInputRef}
            onChange={(e) => handleMediaUpload(e, 'VIDEO')}
            accept="video/*"
            className="hidden"
          />

          {/* Action Toolbar */}
          <div className="pt-2 border-t border-border flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isUploading}
                onClick={() => imageInputRef.current?.click()}
                className="text-xs text-muted-foreground hover:text-foreground h-9 px-2.5"
                leftIcon={<ImageIcon className="h-4 w-4 text-primary" />}
              >
                Photo
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isUploading}
                onClick={() => videoInputRef.current?.click()}
                className="text-xs text-muted-foreground hover:text-foreground h-9 px-2.5"
                leftIcon={<Video className="h-4 w-4 text-purple-600 dark:text-purple-400" />}
              >
                Video
              </Button>
              {isUploading && (
                <div className="flex items-center gap-1.5 text-xs text-primary font-medium pl-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Uploading...</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={closeModal}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                isLoading={createPostMutation.isPending}
                disabled={isUploading || (!content.trim() && mediaList.length === 0)}
                className="font-bold shadow-md shadow-primary/20 bg-gradient-to-r from-primary to-primary-600 hover:from-primary-600 hover:to-primary-700"
                leftIcon={<Send className="h-3.5 w-3.5" />}
              >
                Publish Post
              </Button>
            </div>
          </div>
        </form>
      </div>
    </Dialog>
  )
}
