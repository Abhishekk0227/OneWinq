/**
 * Centralized TanStack Query Keys
 */

export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
    sessions: ['auth', 'sessions'] as const,
  },
  profile: {
    me: ['profile', 'me'] as const,
    preview: ['profile', 'preview'] as const,
    recommendedSections: ['profile', 'recommended-sections'] as const,
    identities: ['profile', 'identities'] as const,
    byUsername: (username: string) => ['profile', 'public', username] as const,
  },
  professions: {
    all: (search?: string) => ['professions', { search }] as const,
    categories: ['professions', 'categories'] as const,
  },
  discovery: {
    search: (params: Record<string, unknown>) => ['discovery', params] as const,
  },
  connections: {
    list: (params?: Record<string, unknown>) => ['connections', params] as const,
    pending: (type?: 'incoming' | 'outgoing') => ['connections', 'pending', type] as const,
    blocked: ['connections', 'blocked'] as const,
    mutual: (targetUserId: string) => ['connections', 'mutual', targetUserId] as const,
  },
  conversations: {
    list: (params?: Record<string, unknown>) => ['conversations', params] as const,
    detail: (id: string) => ['conversations', id] as const,
    messages: (id: string, params?: Record<string, unknown>) => ['conversations', id, 'messages', params] as const,
    folders: ['conversations', 'folders'] as const,
  },
  notifications: {
    list: (params?: Record<string, unknown>) => ['notifications', params] as const,
    unreadCount: ['notifications', 'unreadCount'] as const,
    preferences: ['notifications', 'preferences'] as const,
  },
  cards: {
    list: ['cards', 'list'] as const,
    detail: (cardUid: string) => ['cards', cardUid] as const,
    orders: ['cards', 'orders'] as const,
    orderDetail: (id: string) => ['cards', 'orders', id] as const,
  },
  analytics: {
    overview: ['analytics', 'overview'] as const,
    profile: (range?: string) => ['analytics', 'profile', range] as const,
    card: (cardUid: string, range?: string) => ['analytics', 'cards', cardUid, range] as const,
  },
  subscriptions: {
    plans: ['subscriptions', 'plans'] as const,
    me: ['subscriptions', 'me'] as const,
  },
  support: {
    tickets: ['support', 'tickets'] as const,
    ticket: (id: string) => ['support', 'tickets', id] as const,
  },
  moderation: {
    myReports: ['moderation', 'myReports'] as const,
  },
  posts: {
    feed: (params?: Record<string, unknown>) => ['posts', 'feed', params] as const,
    detail: (id: string) => ['posts', id] as const,
    comments: (postId: string) => ['posts', postId, 'comments'] as const,
  },
  admin: {
    metrics: ['admin', 'metrics'] as const,
    users: (params?: Record<string, unknown>) => ['admin', 'users', params] as const,
    auditLogs: (params?: Record<string, unknown>) => ['admin', 'auditLogs', params] as const,
  },
} as const
