import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Building2,
  Search,
} from 'lucide-react'
import { useOrganizationContextStore } from '@/stores/organizationContextStore'
import { useUIStore } from '@/stores/uiStore'
import { postsApi } from '@/features/posts/api/posts.api'
import { PostCard } from '@/components/posts/PostCard'
import { LoadingScreen } from '@/components/common/LoadingScreen'
import { EmptyState } from '@/components/common/EmptyState'
import type { Post } from '@/types/posts.types'

export default function OrganizationPostsPage() {
  const { activeContext } = useOrganizationContextStore()
  const { openModal } = useUIStore()
  const isOrgMode = activeContext.type === 'ORGANIZATION'
  const orgId = isOrgMode ? activeContext.organizationId : ''

  const [searchQuery, setSearchQuery] = React.useState('')
  const [filterState, setFilterState] = React.useState<'ALL' | 'ACTIVE' | 'ARCHIVED'>('ALL')

  // Fetch only posts published under this organization
  const {
    data: feedData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['org-posts', orgId],
    queryFn: () => postsApi.getFeed({ organizationId: orgId }),
    enabled: Boolean(orgId),
  })

  const posts: Post[] = feedData?.data?.posts || []

  // Filter posts by search query and archive state
  const filteredPosts = React.useMemo(() => {
    return posts.filter((post) => {
      if (filterState === 'ACTIVE' && post.state === 'ARCHIVED') return false
      if (filterState === 'ARCHIVED' && post.state !== 'ARCHIVED') return false
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase()
      return (
        post.content?.toLowerCase().includes(q) ||
        post.author?.displayName?.toLowerCase().includes(q) ||
        post.author?.username?.toLowerCase().includes(q)
      )
    })
  }, [posts, filterState, searchQuery])

  if (!isOrgMode) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center">
        <EmptyState
          icon={<Building2 className="h-8 w-8 text-primary" />}
          title="Organization Workspace Required"
          description="Please switch to an organization profile from the header workspace selector to manage organization posts."
        />
      </div>
    )
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4 text-left pb-24 px-2 sm:px-4">
      {/* Official Organization Post Composer Box */}
      <div className="rounded-2xl sm:rounded-3xl border border-border bg-card p-3 sm:p-4 shadow-xs overflow-hidden">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="h-10 w-10 rounded-full border border-primary/25 bg-white dark:bg-card flex items-center justify-center overflow-hidden shrink-0 shadow-2xs p-1">
            {activeContext.logoUrl ? (
              <img
                src={activeContext.logoUrl}
                alt={activeContext.name}
                className="h-full w-full object-contain"
              />
            ) : (
              <Building2 className="h-5 w-5 text-primary" />
            )}
          </div>

          <button
            type="button"
            onClick={() => openModal('CREATE_POST')}
            className="flex-1 min-w-0 text-left px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-full border border-border/80 bg-muted/20 hover:bg-muted/40 text-muted-foreground hover:text-foreground text-xs sm:text-sm font-medium transition-all cursor-pointer shadow-xs flex items-center"
          >
            <span className="truncate block min-w-0 w-full">
              Share an official update as {activeContext.name}...
            </span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 pt-1">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/50 border border-border/70 w-full sm:w-fit overflow-x-auto custom-scrollbar shrink-0">
          <button
            type="button"
            onClick={() => setFilterState('ALL')}
            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              filterState === 'ALL'
                ? 'bg-card text-foreground shadow-xs border border-border/80'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            All Posts ({posts.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterState('ACTIVE')}
            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              filterState === 'ACTIVE'
                ? 'bg-card text-foreground shadow-xs border border-border/80'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Active ({posts.filter((p) => p.state !== 'ARCHIVED').length})
          </button>
          <button
            type="button"
            onClick={() => setFilterState('ARCHIVED')}
            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              filterState === 'ARCHIVED'
                ? 'bg-card text-foreground shadow-xs border border-border/80'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Archived ({posts.filter((p) => p.state === 'ARCHIVED').length})
          </button>
        </div>

        <div className="relative w-full sm:max-w-xs min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search organization posts..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-border bg-card text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary shadow-2xs"
          />
        </div>
      </div>

      {/* Posts Timeline Stream */}
      {isLoading ? (
        <LoadingScreen message={`Loading ${activeContext.name}'s published posts...`} />
      ) : filteredPosts.length === 0 ? (
        <EmptyState
          icon={<Building2 className="h-6 w-6 text-primary" />}
          title={searchQuery ? 'No matching posts found' : 'No organization posts yet'}
          description={
            searchQuery
              ? `No posts matched "${searchQuery}".`
              : 'Share updates and announcements with your followers.'
          }
          actionLabel="Publish First Post"
          onAction={() => openModal('CREATE_POST')}
          className="p-8 sm:p-10"
        />
      ) : (
        <div className="space-y-4">
          {filteredPosts.map((post) => (
            <PostCard key={post._id} post={post} onRefresh={() => refetch()} />
          ))}
        </div>
      )}
    </div>
  )
}
