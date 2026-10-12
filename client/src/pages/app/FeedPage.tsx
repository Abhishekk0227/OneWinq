import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'
import { postsApi } from '@/features/posts/api/posts.api'
import { queryKeys } from '@/lib/query/queryKeys'
import { Avatar } from '@/components/ui/Avatar'
import { LoadingScreen } from '@/components/common/LoadingScreen'
import { EmptyState } from '@/components/common/EmptyState'
import { PostCard } from '@/components/posts/PostCard'
import {
  Image,
  Video,
  PenSquare,
  Sparkles,
  Flame,
  Globe,
  Building2,
} from 'lucide-react'

export default function FeedPage() {
  const { user } = useAuthStore()
  const { openModal } = useUIStore()
  const [feedTab, setFeedTab] = React.useState<'all' | 'following'>('all')

  // Query clean community feed stream
  const { data: feedData, isLoading, refetch } = useQuery({
    queryKey: queryKeys.posts.feed({ filter: feedTab }),
    queryFn: () => postsApi.getFeed({ filter: feedTab }),
  })

  const posts = feedData?.data?.posts || []

  return (
    <div className="w-full max-w-xl sm:max-w-2xl mx-auto space-y-4 text-left pb-24 px-2 sm:px-0">
      {/* LinkedIn-Style "Start a post" Section */}
      <div className="rounded-2xl border border-border bg-card p-3.5 sm:p-4 shadow-xs space-y-3">
        <div className="flex items-center gap-3">
          <Avatar
            src={user?.avatarUrl}
            fallback={user?.displayName}
            alt={user?.displayName}
            size="md"
            className="rounded-full shrink-0 ring-1 ring-border/80"
          />
          <button
            type="button"
            onClick={() => openModal('CREATE_POST')}
            className="flex-1 text-left px-4 py-2.5 rounded-full border border-border/80 bg-muted/20 hover:bg-muted/40 text-muted-foreground hover:text-foreground text-sm font-medium transition-all cursor-pointer flex items-center justify-between group shadow-xs"
          >
            <span>Start a post, {user?.displayName?.split(' ')[0] || 'there'}...</span>
            <Sparkles className="h-4 w-4 text-primary opacity-60 group-hover:opacity-100 transition-opacity" />
          </button>
        </div>

        {/* Quick action triggers */}
        <div className="flex items-center justify-around sm:justify-between pt-1 border-t border-border/60 text-xs font-semibold">
          <button
            type="button"
            onClick={() => openModal('CREATE_POST')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-muted/50 text-muted-foreground hover:text-sky-500 transition-colors cursor-pointer"
          >
            <Image className="h-4 w-4 text-sky-500" />
            <span>Media</span>
          </button>

          <button
            type="button"
            onClick={() => openModal('CREATE_POST')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-muted/50 text-muted-foreground hover:text-emerald-500 transition-colors cursor-pointer"
          >
            <Video className="h-4 w-4 text-emerald-500" />
            <span>Video</span>
          </button>

          <button
            type="button"
            onClick={() => openModal('CREATE_POST')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-muted/50 text-muted-foreground hover:text-amber-500 transition-colors cursor-pointer"
          >
            <PenSquare className="h-4 w-4 text-amber-500" />
            <span>Write post</span>
          </button>
        </div>
      </div>

      {/* Feed Category Filter Switcher */}
      <div className="flex items-center gap-2 p-1 rounded-2xl bg-muted/50 border border-border/70 backdrop-blur-xs">
        <button
          type="button"
          onClick={() => setFeedTab('all')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            feedTab === 'all'
              ? 'bg-card text-foreground shadow-xs border border-border/80'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
          }`}
        >
          <Globe className="h-4 w-4 text-primary" />
          <span>Discover</span>
        </button>

        <button
          type="button"
          onClick={() => setFeedTab('following')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            feedTab === 'following'
              ? 'bg-card text-foreground shadow-xs border border-border/80'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
          }`}
        >
          <Building2 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          <span>Following & Network</span>
        </button>
      </div>

      {/* Unified Timeline Feed Stream */}
      {isLoading ? (
        <LoadingScreen message="Loading feed..." />
      ) : posts.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-8 shadow-xs">
          {feedTab === 'following' ? (
            <EmptyState
              icon={<Building2 className="h-8 w-8 text-primary" />}
              title="No updates from followed organizations"
              description="Follow organizations or connect with professionals to see their company updates and announcements here in your feed!"
            />
          ) : (
            <EmptyState
              icon={<Flame className="h-8 w-8 text-primary" />}
              title="No posts yet"
              description="Be the first to share an update or insight with your network!"
            />
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard key={post._id} post={post} onRefresh={() => refetch()} />
          ))}
        </div>
      )}
    </div>
  )
}
