import * as React from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Plus,
  Building2,
  ExternalLink,
  Search,
} from 'lucide-react'
import { useOrganizationContextStore } from '@/stores/organizationContextStore'
import { useUIStore } from '@/stores/uiStore'
import { postsApi } from '@/features/posts/api/posts.api'
import { PostCard } from '@/components/posts/PostCard'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
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
    <div className="w-full max-w-4xl mx-auto space-y-6 text-left pb-24 px-2 sm:px-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              Organization Posts
            </h1>
            <Badge variant="subtle" className="text-xs font-semibold px-2.5 py-0.5">
              Official Hub
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Publish and manage official news, announcements, and thought leadership for{' '}
            <strong className="text-foreground">{activeContext.name}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {activeContext.slug && (
            <Link
              to={`/c/${activeContext.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-border bg-card hover:bg-muted text-foreground transition-colors shadow-2xs"
            >
              <span>View Public Page</span>
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
            </Link>
          )}

          <Button
            size="sm"
            onClick={() => openModal('CREATE_POST')}
            leftIcon={<Plus className="h-4 w-4" />}
            className="shadow-sm"
          >
            Create Post
          </Button>
        </div>
      </div>

      {/* Official Organization Post Composer Box */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-xs space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl border border-primary/25 bg-white dark:bg-card flex items-center justify-center overflow-hidden shrink-0 shadow-2xs p-1">
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
            className="flex-1 text-left px-4 py-3 rounded-xl border border-border/80 bg-muted/20 hover:bg-muted/40 text-muted-foreground hover:text-foreground text-sm font-medium transition-all cursor-pointer shadow-xs"
          >
            <span className="truncate">
              Share an official update as {activeContext.name}...
            </span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/50 border border-border/70 w-fit">
          <button
            type="button"
            onClick={() => setFilterState('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterState === 'ARCHIVED'
                ? 'bg-card text-foreground shadow-xs border border-border/80'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Archived ({posts.filter((p) => p.state === 'ARCHIVED').length})
          </button>
        </div>

        <div className="relative flex-1 sm:max-w-xs">
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
        <div className="rounded-2xl border border-dashed border-border p-10 text-center bg-card/50">
          <EmptyState
            icon={<Building2 className="h-8 w-8 text-primary" />}
            title={searchQuery ? 'No matching posts found' : 'No organization posts published yet'}
            description={
              searchQuery
                ? `No posts matched "${searchQuery}". Try modifying your search keywords.`
                : `Share news, updates, or announcements from ${activeContext.name} to engage with your followers and network!`
            }
            actionLabel="Publish First Post"
            onAction={() => openModal('CREATE_POST')}
          />
        </div>
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
