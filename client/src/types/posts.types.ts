export interface PostAuthor {
  _id: string
  displayName: string
  username: string
  avatarUrl?: string | null
  primaryProfession?: string | null
  isOrganization?: boolean
}

export interface PostOrganization {
  _id: string
  name: string
  slug: string
  logoUrl?: string | null
  industry?: string | null
  tagline?: string | null
  isVerified?: boolean
  branding?: {
    primaryColor?: string
    secondaryColor?: string
    logoUrl?: string
    coverUrl?: string
  }
}

export interface PostMedia {
  mediaId?: string | null
  type: 'IMAGE' | 'VIDEO'
  url: string
  thumbnailUrl?: string | null
}

export interface PostComment {
  _id: string
  postId: string
  author: PostAuthor | null
  parentId?: string | null
  content: string
  likesCount: number
  state: 'ACTIVE' | 'DELETED'
  createdAt: string
  replies?: PostComment[]
}

export interface Post {
  _id: string
  author: PostAuthor
  authorType?: 'USER' | 'ORGANIZATION'
  organizationId?: string | PostOrganization | null
  organization?: PostOrganization | null
  postedBy?: { _id: string; displayName: string; username: string } | null
  isFollowingOrg?: boolean
  content: string
  media: PostMedia[]
  state: 'ACTIVE' | 'ARCHIVED' | 'DELETED'
  visibility: 'PUBLIC' | 'CONNECTIONS_ONLY' | 'PRIVATE'
  likesCount: number
  commentsCount: number
  sharesCount: number
  savesCount: number
  pinned?: boolean
  editedAt?: string | null
  isLiked?: boolean
  isSaved?: boolean
  createdAt: string
  updatedAt: string
}

export interface FeedPagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface FeedResponse {
  posts: Post[]
  pagination: FeedPagination
}
