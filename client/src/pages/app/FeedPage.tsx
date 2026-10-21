import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { useUIStore } from '@/stores/uiStore'
import { useOrganizationContextStore } from '@/stores/organizationContextStore'
import { postsApi } from '@/features/posts/api/posts.api'
import { LoadingScreen } from '@/components/common/LoadingScreen'
import { EmptyState } from '@/components/common/EmptyState'
import { PostCard } from '@/components/posts/PostCard'
import { Flame, Building2 } from 'lucide-react'

export default function FeedPage() {
  const { openModal } = useUIStore()
  const { activeContext } = useOrganizationContextStore()
  const isOrgMode = activeContext.type === 'ORGANIZATION'
  const orgId = isOrgMode ? activeContext.organizationId : ''

  // Unified community feed stream without separate Discover/Following tabs
  const { data: feedData, isLoading, refetch } = useQuery({
    queryKey: ['feed', isOrgMode ? 'org' : 'all', orgId],
    queryFn: () => {
      if (isOrgMode && orgId) {
        return postsApi.getFeed({ organizationId: orgId })
      }
      return postsApi.getFeed({ filter: 'all' })
    },
  })

  const posts = feedData?.data?.posts || []

  return (
    <div className="w-full max-w-xl sm:max-w-2xl mx-auto space-y-4 text-left pb-24 px-2 sm:px-0">
      {/* Unified Timeline Feed Stream */}
      {isLoading ? (
        <LoadingScreen message="Loading feed..." />
      ) : posts.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-8 shadow-xs">
          {isOrgMode ? (
            <EmptyState
              icon={<Building2 className="h-8 w-8 text-primary" />}
              title={`No posts published by ${activeContext.name} yet`}
              description="Share company news, team updates, or media to engage your followers and network!"
              actionLabel="Create Company Post"
              onAction={() => openModal('CREATE_POST')}
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
