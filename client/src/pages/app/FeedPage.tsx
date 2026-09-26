import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { postsApi } from '@/features/posts/api/posts.api'
import { mediaApi } from '@/features/media/api/media.api'
import { queryKeys } from '@/lib/query/queryKeys'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { LoadingScreen } from '@/components/common/LoadingScreen'
import { EmptyState } from '@/components/common/EmptyState'
import { PostCard } from '@/components/posts/PostCard'
import { toast } from '@/stores/toastStore'
import {
  Image,
  Video,
  X,
  Send,
  Flame,
} from 'lucide-react'
import type { PostMedia } from '@/types/posts.types'

export default function FeedPage() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  // Create post state
  const [postContent, setPostContent] = React.useState('')
  const [mediaList, setMediaList] = React.useState<PostMedia[]>([])
  const [isUploading, setIsUploading] = React.useState(false)
  const [postVisibility, setPostVisibility] = React.useState<'PUBLIC' | 'CONNECTIONS_ONLY'>('PUBLIC')

  const imageInputRef = React.useRef<HTMLInputElement | null>(null)
  const videoInputRef = React.useRef<HTMLInputElement | null>(null)

  // Query clean community feed stream
  const { data: feedData, isLoading, refetch } = useQuery({
    queryKey: queryKeys.posts.feed({ filter: 'all' }),
    queryFn: () => postsApi.getFeed({ filter: 'all' }),
  })

  const posts = feedData?.data?.posts || []

  // Create post mutation
  const createPostMutation = useMutation({
    mutationFn: (payload: { content: string; media: PostMedia[]; visibility: string }) =>
      postsApi.createPost(payload),
    onSuccess: () => {
      toast.success('Your post is now live!')
      setPostContent('')
      setMediaList([])
      queryClient.invalidateQueries({ queryKey: ['posts', 'feed'] })
    },
    onError: (err: unknown) => {
      const apiErr = err as { message?: string }
      toast.error(apiErr.message || 'Failed to publish post')
    },
  })

  // Handle direct media uploads
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
      toast.success(`${type === 'IMAGE' ? 'Image' : 'Video'} attached successfully!`)
    } catch {
      toast.error(`Failed to upload ${type.toLowerCase()}. Please try a valid file.`)
    } finally {
      setIsUploading(false)
      if (imageInputRef.current) imageInputRef.current.value = ''
      if (videoInputRef.current) videoInputRef.current.value = ''
    }
  }

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault()
    if (!postContent.trim() && mediaList.length === 0) {
      toast.error('Please write something or attach media to post.')
      return
    }
    createPostMutation.mutate({
      content: postContent.trim(),
      media: mediaList,
      visibility: postVisibility,
    })
  }

  return (
    <div className="w-full max-w-xl mx-auto space-y-3.5 text-left pb-24 px-2 sm:px-0">
      {/* Compact Post Composer */}
      <div className="rounded-2xl border border-border bg-card p-3 sm:p-4 shadow-xs w-full max-w-full overflow-hidden">
        <div className="flex items-start gap-3 min-w-0">
          <Avatar
            src={user?.avatarUrl}
            fallback={user?.displayName}
            alt={user?.displayName}
            size="sm"
            className="rounded-xl mt-0.5 shrink-0 ring-1 ring-border"
          />
          <div className="flex-1 space-y-2.5 min-w-0">
            <textarea
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              placeholder={`What's on your mind, ${user?.displayName?.split(' ')[0] || 'there'}?`}
              rows={2}
              className="w-full resize-none rounded-xl border border-input/60 bg-muted/20 hover:bg-muted/30 focus:bg-background p-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 transition-colors leading-relaxed"
            />

            {/* Media Attachment Previews */}
            {mediaList.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-0.5">
                {mediaList.map((m, idx) => (
                  <div
                    key={idx}
                    className="relative group rounded-xl overflow-hidden border border-border bg-black/50 h-16 w-16 flex items-center justify-center shrink-0"
                  >
                    {m.type === 'IMAGE' ? (
                      <img src={m.url} alt="Attached" className="h-full w-full object-cover" />
                    ) : (
                      <video src={m.url} className="h-full w-full object-cover" />
                    )}
                    <button
                      type="button"
                      onClick={() => setMediaList((prev) => prev.filter((_, i) => i !== idx))}
                      className="absolute top-1 right-1 p-0.5 rounded-full bg-black/75 text-white hover:bg-rose-600 transition-colors"
                      title="Remove media"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Composer Footer Actions */}
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/50">
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                {/* Upload Image */}
                <input
                  ref={imageInputRef}
                  type="file"
                  multiple
                  onChange={(e) => handleMediaUpload(e, 'IMAGE')}
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => imageInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
                  title="Add photo"
                >
                  <Image className="h-3.5 w-3.5 text-primary" />
                  <span className="hidden xs:inline">Photo</span>
                </button>

                {/* Upload Video */}
                <input
                  ref={videoInputRef}
                  type="file"
                  onChange={(e) => handleMediaUpload(e, 'VIDEO')}
                  accept="video/mp4,video/webm,video/quicktime"
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => videoInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10 transition-colors disabled:opacity-50"
                  title="Add video"
                >
                  <Video className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="hidden xs:inline">Video</span>
                </button>

                {/* Visibility selector */}
                <select
                  value={postVisibility}
                  onChange={(e) => setPostVisibility(e.target.value as any)}
                  className="text-[11px] font-semibold rounded-lg border border-input/60 bg-muted/40 px-2 py-1 text-foreground focus:outline-none"
                >
                  <option value="PUBLIC">🌐 Public</option>
                  <option value="CONNECTIONS_ONLY">👥 Connections</option>
                </select>
              </div>

              <Button
                type="button"
                onClick={handleCreatePost}
                isLoading={createPostMutation.isPending || isUploading}
                size="sm"
                className="h-8 px-3 rounded-xl text-xs font-semibold shadow-xs shrink-0"
                leftIcon={<Send className="h-3 w-3" />}
              >
                {isUploading ? 'Uploading...' : 'Post'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Unified Timeline Feed Stream */}
      {isLoading ? (
        <LoadingScreen message="Loading feed..." />
      ) : posts.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-8">
          <EmptyState
            icon={<Flame className="h-7 w-7" />}
            title="No posts yet"
            description="Be the first to share an update or insight with your network!"
          />
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card shadow-xs divide-y divide-border/60 overflow-hidden">
          {posts.map((post) => (
            <PostCard key={post._id} post={post} onRefresh={() => refetch()} />
          ))}
        </div>
      )}
    </div>
  )
}
