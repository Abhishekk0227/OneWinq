import * as React from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  Heart,
  MessageSquare,
  Bookmark,
  Share2,
  Trash2,
  Edit2,
  Archive,
  ArchiveRestore,
  Send,
  CornerDownRight,
  Globe,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { postsApi } from '@/features/posts/api/posts.api'
import { queryKeys } from '@/lib/query/queryKeys'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { toast } from '@/stores/toastStore'
import type { Post, PostComment } from '@/types/posts.types'

/**
 * Individual Interactive Post Card
 */
export function PostCard({ post, onRefresh }: { post: Post; onRefresh: () => void }) {
  const { user: currentUser } = useAuthStore()
  const isOwner = currentUser?._id === post.author?._id || currentUser?.username === post.author?.username

  // Local interaction states for instant optimistic feedback
  const [isLiked, setIsLiked] = React.useState(Boolean(post.isLiked))
  const [likesCount, setLikesCount] = React.useState(post.likesCount || 0)
  const [isSaved, setIsSaved] = React.useState(Boolean(post.isSaved))
  const [savesCount, setSavesCount] = React.useState(post.savesCount || 0)
  const [sharesCount, setSharesCount] = React.useState(post.sharesCount || 0)

  // Edit post state
  const [isEditing, setIsEditing] = React.useState(false)
  const [editContent, setEditContent] = React.useState(post.content)

  // Comments state
  const [isCommentsOpen, setIsCommentsOpen] = React.useState(false)
  const [newComment, setNewComment] = React.useState('')
  const [replyingTo, setReplyingTo] = React.useState<{ id: string; authorName: string } | null>(null)

  // Fetch comments query
  const { data: commentsData, refetch: refetchComments } = useQuery({
    queryKey: queryKeys.posts.comments(post._id),
    queryFn: () => postsApi.getComments(post._id),
    enabled: isCommentsOpen,
  })

  const comments = commentsData?.data?.comments || []

  // Mutations
  const likeMutation = useMutation({
    mutationFn: () => postsApi.toggleLike(post._id),
    onSuccess: (res) => {
      setIsLiked(res.data.isLiked)
      setLikesCount(res.data.likesCount)
    },
    onError: () => {
      setIsLiked((prev) => !prev)
      setLikesCount((prev) => (isLiked ? prev + 1 : prev - 1))
      toast.error('Failed to update like')
    },
  })

  const saveMutation = useMutation({
    mutationFn: () => postsApi.toggleSave(post._id),
    onSuccess: (res) => {
      setIsSaved(res.data.isSaved)
      setSavesCount(res.data.savesCount)
      toast.success(res.data.isSaved ? 'Post bookmarked!' : 'Post removed from saved')
    },
    onError: () => {
      setIsSaved((prev) => !prev)
      toast.error('Failed to bookmark post')
    },
  })

  const updateMutation = useMutation({
    mutationFn: (content: string) => postsApi.updatePost(post._id, { content }),
    onSuccess: () => {
      toast.success('Post updated!')
      setIsEditing(false)
      onRefresh()
    },
    onError: (err: unknown) => {
      const apiErr = err as { message?: string }
      toast.error(apiErr.message || 'Failed to update post')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => postsApi.deletePost(post._id),
    onSuccess: () => {
      toast.success('Post deleted')
      onRefresh()
    },
    onError: (err: unknown) => {
      const apiErr = err as { message?: string }
      toast.error(apiErr.message || 'Failed to delete post')
    },
  })

  const archiveMutation = useMutation({
    mutationFn: () => postsApi.toggleArchive(post._id),
    onSuccess: (res) => {
      toast.success(res.data.isArchived ? 'Post archived and hidden from public feed' : 'Post restored to feed')
      onRefresh()
    },
    onError: () => toast.error('Failed to change archive state'),
  })

  const addCommentMutation = useMutation({
    mutationFn: (payload: { content: string; parentId?: string | null }) =>
      postsApi.addComment(post._id, payload),
    onSuccess: () => {
      setNewComment('')
      setReplyingTo(null)
      refetchComments()
      onRefresh()
    },
    onError: (err: unknown) => {
      const apiErr = err as { message?: string }
      toast.error(apiErr.message || 'Failed to add comment')
    },
  })

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: string) => postsApi.deleteComment(post._id, commentId),
    onSuccess: () => {
      toast.success('Comment deleted')
      refetchComments()
      onRefresh()
    },
  })

  const handleLike = () => {
    setIsLiked(!isLiked)
    setLikesCount(isLiked ? Math.max(0, likesCount - 1) : likesCount + 1)
    likeMutation.mutate()
  }

  const handleSave = () => {
    setIsSaved(!isSaved)
    setSavesCount(isSaved ? Math.max(0, savesCount - 1) : savesCount + 1)
    saveMutation.mutate()
  }

  const handleShare = async () => {
    try {
      const shareUrl = `${window.location.origin}/app/feed#${post._id}`
      await navigator.clipboard.writeText(shareUrl)
      toast.success('Post link copied to clipboard!')
      const res = await postsApi.sharePost(post._id)
      setSharesCount(res.data.sharesCount)
    } catch {
      toast.error('Failed to copy link')
    }
  }

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return
    addCommentMutation.mutate({
      content: newComment.trim(),
      parentId: replyingTo?.id || null,
    })
  }

  // Format relative time
  const timeAgo = (dateStr: string) => {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
    if (diff < 60) return 'Just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
    return new Date(dateStr).toLocaleDateString()
  }

  return (
    <article id={post._id} className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs space-y-3 transition-all w-full max-w-full overflow-hidden">
      {/* Author Header (LinkedIn Style) */}
      <div className="flex items-start justify-between gap-3 min-w-0">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <Link to={`/u/${post.author?.username}`} target="_blank" className="shrink-0 mt-0.5">
            <Avatar
              src={post.author?.avatarUrl}
              fallback={post.author?.displayName}
              alt={post.author?.displayName}
              size="md"
              className="rounded-full ring-1 ring-border/80 hover:ring-primary/50 transition-all shrink-0"
            />
          </Link>
          <div className="min-w-0 flex-1 space-y-0.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Link
                to={`/u/${post.author?.username}`}
                target="_blank"
                className="text-sm font-bold text-foreground hover:text-primary hover:underline transition-colors truncate"
              >
                {post.author?.displayName}
              </Link>
              <span className="text-xs text-muted-foreground font-normal">
                @{post.author?.username}
              </span>
            </div>
            {post.author?.primaryProfession && (
              <p className="text-xs text-muted-foreground truncate leading-tight">
                {post.author.primaryProfession}
              </p>
            )}
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/80 pt-0.5">
              <span>{timeAgo(post.createdAt)}</span>
              {post.editedAt && <span>• (edited)</span>}
              <span>•</span>
              <span className="flex items-center gap-1">
                <Globe className="h-3 w-3" />
                <span>Public</span>
              </span>
              {post.state === 'ARCHIVED' && (
                <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-amber-500/40 text-amber-500 ml-1">
                  Archived
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Action Menu (Owner) */}
        {isOwner && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Edit post"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => archiveMutation.mutate()}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title={post.state === 'ARCHIVED' ? 'Restore to feed' : 'Archive post'}
            >
              {post.state === 'ARCHIVED' ? (
                <ArchiveRestore className="h-3.5 w-3.5 text-primary" />
              ) : (
                <Archive className="h-3.5 w-3.5" />
              )}
            </button>
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to delete this post?')) {
                  deleteMutation.mutate()
                }
              }}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              title="Delete post"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Post Text Content */}
      {isEditing ? (
        <div className="space-y-2.5 pt-1">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-input bg-background p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 leading-relaxed"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              isLoading={updateMutation.isPending}
              onClick={() => updateMutation.mutate(editContent)}
            >
              Save Changes
            </Button>
          </div>
        </div>
      ) : (
        post.content && (
          <p className="text-[14.5px] sm:text-[15px] text-foreground/95 leading-relaxed whitespace-pre-line break-words pt-0.5">
            {post.content}
          </p>
        )
      )}

      {/* Media Attachments Gallery */}
      {post.media && post.media.length > 0 && (
        <div className="space-y-2 pt-1">
          {post.media.map((m, idx) => (
            <div key={idx} className="rounded-xl overflow-hidden border border-border/80 bg-black/95 max-h-[30rem] flex items-center justify-center">
              {m.type === 'IMAGE' ? (
                <img
                  src={m.url}
                  alt="Post media"
                  className="w-full h-auto max-h-[30rem] object-contain"
                  loading="lazy"
                />
              ) : (
                <video
                  src={m.url}
                  controls
                  className="w-full h-auto max-h-[30rem]"
                  preload="metadata"
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Social Engagement Metrics Count Bar (LinkedIn Style) */}
      {(likesCount > 0 || (post.commentsCount || 0) > 0 || sharesCount > 0) && (
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 pb-1 border-b border-border/50">
          <div className="flex items-center gap-1.5">
            {likesCount > 0 && (
              <span className="flex items-center gap-1">
                <span className="h-4 w-4 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center">
                  <Heart className="h-2.5 w-2.5 fill-rose-500" />
                </span>
                <span>{likesCount}</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {(post.commentsCount || 0) > 0 && (
              <button
                type="button"
                onClick={() => setIsCommentsOpen(!isCommentsOpen)}
                className="hover:underline hover:text-foreground"
              >
                {post.commentsCount} {post.commentsCount === 1 ? 'comment' : 'comments'}
              </button>
            )}
            {sharesCount > 0 && (
              <span>{sharesCount} {sharesCount === 1 ? 'share' : 'shares'}</span>
            )}
          </div>
        </div>
      )}

      {/* Action Bar (LinkedIn Style: 4 Action Buttons with Icon + Label) */}
      <div className="grid grid-cols-4 gap-1 pt-1 border-t border-border/60 text-xs sm:text-sm font-semibold">
        {/* Like */}
        <button
          onClick={handleLike}
          className={`flex items-center justify-center gap-1.5 sm:gap-2 py-2 px-1 rounded-xl transition-all ${
            isLiked
              ? 'text-rose-500 bg-rose-500/10'
              : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
          }`}
        >
          <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
          <span>Like</span>
        </button>

        {/* Comment */}
        <button
          onClick={() => setIsCommentsOpen(!isCommentsOpen)}
          className={`flex items-center justify-center gap-1.5 sm:gap-2 py-2 px-1 rounded-xl transition-all ${
            isCommentsOpen
              ? 'text-primary bg-primary/10'
              : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
          }`}
        >
          <MessageSquare className="h-4 w-4" />
          <span>Comment</span>
        </button>

        {/* Share */}
        <button
          onClick={handleShare}
          className="flex items-center justify-center gap-1.5 sm:gap-2 py-2 px-1 rounded-xl text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-all"
        >
          <Share2 className="h-4 w-4" />
          <span>Share</span>
        </button>

        {/* Save */}
        <button
          onClick={handleSave}
          className={`flex items-center justify-center gap-1.5 sm:gap-2 py-2 px-1 rounded-xl transition-all ${
            isSaved
              ? 'text-primary bg-primary/10'
              : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
          }`}
        >
          <Bookmark className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`} />
          <span>{isSaved ? 'Saved' : 'Save'}</span>
        </button>
      </div>

      {/* Nested Comments Drawer */}
      {isCommentsOpen && (
        <div className="pt-3 border-t border-border/60 space-y-3 animate-in fade-in">
          {/* New Comment Input */}
          <form onSubmit={handleAddComment} className="space-y-2">
            {replyingTo && (
              <div className="flex items-center justify-between text-xs text-primary bg-primary/10 px-2.5 py-1 rounded-lg">
                <span>Replying to <strong>@{replyingTo.authorName}</strong></span>
                <button
                  type="button"
                  onClick={() => setReplyingTo(null)}
                  className="hover:underline font-bold"
                >
                  Cancel
                </button>
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={replyingTo ? `Write a reply to @${replyingTo.authorName}...` : 'Add a thoughtful comment...'}
                className="flex-1 rounded-xl border border-input/60 bg-muted/20 px-3.5 py-2 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
              <Button
                type="submit"
                size="sm"
                className="h-8 px-3 text-xs shrink-0"
                isLoading={addCommentMutation.isPending}
                leftIcon={<Send className="h-3 w-3" />}
              >
                Comment
              </Button>
            </div>
          </form>

          {/* Comments List */}
          {comments.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-2 italic">
              No comments yet. Be the first to start the conversation!
            </p>
          ) : (
            <div className="space-y-3 pt-1">
              {comments.map((comment) => (
                <CommentThread
                  key={comment._id}
                  comment={comment}
                  postAuthorId={post.author?._id}
                  currentUserId={currentUser?._id}
                  onReply={(id, name) => setReplyingTo({ id, authorName: name })}
                  onDelete={(id) => deleteCommentMutation.mutate(id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </article>
  )
}

/**
 * Threaded Comment Item supporting recursive / nested replies
 */
function CommentThread({
  comment,
  postAuthorId,
  currentUserId,
  onReply,
  onDelete,
}: {
  comment: PostComment
  postAuthorId?: string
  currentUserId?: string
  onReply: (id: string, authorName: string) => void
  onDelete: (id: string) => void
}) {
  const canDelete =
    currentUserId &&
    (currentUserId === comment.author?._id || currentUserId === postAuthorId)

  return (
    <div className="space-y-2.5">
      <div className="flex items-start gap-2.5 group">
        <Link to={`/u/${comment.author?.username}`} target="_blank">
          <Avatar
            src={comment.author?.avatarUrl}
            fallback={comment.author?.displayName}
            alt={comment.author?.displayName}
            size="sm"
            className="rounded-xl mt-0.5"
          />
        </Link>
        <div className="flex-1 min-w-0 bg-muted/30 rounded-2xl p-3 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-xs font-bold text-foreground truncate">
                {comment.author?.displayName}
              </span>
              <span className="text-[10px] text-muted-foreground font-mono truncate">
                @{comment.author?.username}
              </span>
            </div>
            {canDelete && (
              <button
                onClick={() => onDelete(comment._id)}
                className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-all shrink-0"
                title="Delete comment"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>

          <p className="text-xs text-foreground/90 whitespace-pre-line break-words">
            {comment.content}
          </p>

          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={() => onReply(comment._id, comment.author?.username || 'user')}
              className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1"
            >
              <CornerDownRight className="h-3 w-3" />
              <span>Reply</span>
            </button>
          </div>
        </div>
      </div>

      {/* Nested Replies Tree */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="pl-6 border-l-2 border-primary/20 space-y-2.5 ml-4">
          {comment.replies.map((reply) => (
            <CommentThread
              key={reply._id}
              comment={reply}
              postAuthorId={postAuthorId}
              currentUserId={currentUserId}
              onReply={onReply}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}
