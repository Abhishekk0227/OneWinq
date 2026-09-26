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
    <div className="w-full max-w-3xl mx-auto space-y-6 text-left pb-24 px-1 sm:px-0">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-8 rounded-3xl bg-card border border-border shadow-sm">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
            <Flame className="h-3.5 w-3.5" />
            <span>Community Feed</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Feed & Discussions
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Share updates, ask questions, and connect with people in your network.
          </p>
        </div>
      </div>

      {/* Post Composer Card */}
      <div className="rounded-3xl border border-border bg-card p-4 sm:p-6 shadow-sm space-y-4 w-full max-w-full overflow-hidden">
        <div className="flex items-start gap-3 sm:gap-4 min-w-0">
          <Avatar
            src={user?.avatarUrl}
            fallback={user?.displayName}
            alt={user?.displayName}
            size="md"
            className="rounded-2xl mt-0.5 shrink-0"
          />
          <div className="flex-1 space-y-3 min-w-0">
            <textarea
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              placeholder={`What's on your mind, ${user?.displayName || 'there'}?`}
              rows={3}
              className="w-full resize-none rounded-2xl border border-input bg-muted/30 p-3 sm:p-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />

            {/* Media Attachment Previews */}
            {mediaList.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {mediaList.map((m, idx) => (
                  <div
                    key={idx}
                    className="relative group rounded-xl overflow-hidden border border-border bg-black/50 h-20 w-20 flex items-center justify-center"
                  >
                    {m.type === 'IMAGE' ? (
                      <img src={m.url} alt="Attached" className="h-full w-full object-cover" />
                    ) : (
                      <video src={m.url} className="h-full w-full object-cover" />
                    )}
                    <button
                      type="button"
                      onClick={() => setMediaList((prev) => prev.filter((_, i) => i !== idx))}
                      className="absolute top-1 right-1 p-1 rounded-full bg-black/70 text-white hover:bg-rose-600 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Composer Footer Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-border">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                {/* Upload Image */}
                <input
                  ref={imageInputRef}
                  type="file"
                  multiple
                  onChange={(e) => handleMediaUpload(e, 'IMAGE')}
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="subtle"
                  size="sm"
                  disabled={isUploading}
                  onClick={() => imageInputRef.current?.click()}
                  leftIcon={<Image className="h-4 w-4 text-primary" />}
                >
                  Photo
                </Button>

                {/* Upload Video */}
                <input
                  ref={videoInputRef}
                  type="file"
                  onChange={(e) => handleMediaUpload(e, 'VIDEO')}
                  accept="video/mp4,video/webm,video/quicktime"
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="subtle"
                  size="sm"
                  disabled={isUploading}
                  onClick={() => videoInputRef.current?.click()}
                  leftIcon={<Video className="h-4 w-4 text-emerald-500" />}
                >
                  Video
                </Button>

                {/* Visibility selector */}
                <select
                  value={postVisibility}
                  onChange={(e) => setPostVisibility(e.target.value as any)}
                  className="text-xs font-semibold rounded-xl border border-input bg-muted/50 px-2.5 py-1.5 text-foreground focus:outline-none max-w-[140px] truncate"
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
                className="w-full sm:w-auto"
                leftIcon={<Send className="h-3.5 w-3.5" />}
              >
                {isUploading ? 'Uploading Media...' : 'Publish Post'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Clean Single Stream Community Feed */}
      {isLoading ? (
        <LoadingScreen message="Loading feed updates..." />
      ) : posts.length === 0 ? (
        <EmptyState
          icon={<Flame className="h-8 w-8" />}
          title="No posts yet"
          description="Be the first in the network to share an insight or project update!"
        />
      ) : (
        <div className="space-y-5">
          {posts.map((post) => (
            <PostCard key={post._id} post={post} onRefresh={() => refetch()} />
          ))}
        </div>
      )}
    </div>
  )
}
