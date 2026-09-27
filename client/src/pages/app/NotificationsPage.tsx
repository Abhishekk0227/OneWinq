import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notificationsApi } from '@/features/notifications/api/notifications.api'
import { queryKeys } from '@/lib/query/queryKeys'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingScreen } from '@/components/common/LoadingScreen'
import { toast } from '@/stores/toastStore'
import {
  Bell,
  CheckCheck,
  UserPlus,
  UserCheck,
  MessageSquare,
  Eye,
  CreditCard,
  Shield,
  ShieldAlert,
  Sparkles,
  Package,
  Heart,
  MessageCircle,
  LifeBuoy,
  Megaphone,
  ArrowRight,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'

type FilterTab = 'all' | 'unread' | 'orders_cards' | 'social' | 'system'

function getNotificationIcon(type: string): { icon: React.ReactNode; bg: string } {
  switch (type) {
    case 'CONNECTION_REQUEST':
      return {
        icon: <UserPlus className="h-4 w-4 text-primary" />,
        bg: 'bg-primary/10 border-primary/20',
      }
    case 'CONNECTION_ACCEPTED':
      return {
        icon: <UserCheck className="h-4 w-4 text-emerald-500" />,
        bg: 'bg-emerald-500/10 border-emerald-500/20',
      }
    case 'NEW_MESSAGE':
      return {
        icon: <MessageSquare className="h-4 w-4 text-blue-500" />,
        bg: 'bg-blue-500/10 border-blue-500/20',
      }
    case 'PROFILE_VIEW':
      return {
        icon: <Eye className="h-4 w-4 text-amber-500" />,
        bg: 'bg-amber-500/10 border-amber-500/20',
      }
    case 'CARD_ACTIVATED':
      return {
        icon: <CreditCard className="h-4 w-4 text-purple-500" />,
        bg: 'bg-purple-500/10 border-purple-500/20',
      }
    case 'ORDER_UPDATE':
    case 'ORDER_STATUS_CHANGED':
      return {
        icon: <Package className="h-4 w-4 text-teal-500" />,
        bg: 'bg-teal-500/10 border-teal-500/20',
      }
    case 'POST_LIKE':
      return {
        icon: <Heart className="h-4 w-4 text-rose-500 fill-rose-500" />,
        bg: 'bg-rose-500/10 border-rose-500/20',
      }
    case 'POST_COMMENT':
      return {
        icon: <MessageCircle className="h-4 w-4 text-cyan-500" />,
        bg: 'bg-cyan-500/10 border-cyan-500/20',
      }
    case 'TICKET_RESPONSE':
      return {
        icon: <LifeBuoy className="h-4 w-4 text-sky-500" />,
        bg: 'bg-sky-500/10 border-sky-500/20',
      }
    case 'REPORT_RESPONSE':
      return {
        icon: <ShieldAlert className="h-4 w-4 text-rose-500" />,
        bg: 'bg-rose-500/10 border-rose-500/20',
      }
    case 'SECURITY_ALERT':
      return {
        icon: <Shield className="h-4 w-4 text-destructive" />,
        bg: 'bg-destructive/10 border-destructive/20',
      }
    case 'SYSTEM_ANNOUNCEMENT':
      return {
        icon: <Megaphone className="h-4 w-4 text-amber-500" />,
        bg: 'bg-amber-500/10 border-amber-500/20',
      }
    default:
      return {
        icon: <Sparkles className="h-4 w-4 text-primary" />,
        bg: 'bg-primary/10 border-primary/20',
      }
  }
}

function resolveItemLink(item: any): string | null {
  if (item.linkUrl) return item.linkUrl
  if (item.link) return item.link

  const username = item.actor?.username || item.metadata?.username
  switch (item.type) {
    case 'CONNECTION_REQUEST':
      return '/app/connections'
    case 'CONNECTION_ACCEPTED':
      return username ? `/u/${username}` : '/app/connections'
    case 'NEW_MESSAGE':
      return item.entityId ? `/app/messages?cid=${item.entityId}` : '/app/messages'
    case 'PROFILE_VIEW':
      return username ? `/u/${username}` : '/app/analytics'
    case 'CARD_ACTIVATED':
      return '/app/cards'
    case 'ORDER_UPDATE':
    case 'ORDER_STATUS_CHANGED':
      return '/app/orders'
    case 'POST_LIKE':
    case 'POST_COMMENT':
      return item.entityId ? `/app?postId=${item.entityId}` : '/app'
    case 'TICKET_RESPONSE':
      return '/app/support'
    case 'REPORT_RESPONSE':
      return '/app/settings'
    case 'SECURITY_ALERT':
      return '/app/settings'
    default:
      if (item.entityType === 'connection') return '/app/connections'
      if (item.entityType === 'conversation') return item.entityId ? `/app/messages?cid=${item.entityId}` : '/app/messages'
      if (item.entityType === 'profile') return username ? `/u/${username}` : '/app/profile'
      if (item.entityType === 'card') return '/app/cards'
      if (item.entityType === 'order') return '/app/orders'
      if (item.entityType === 'post') return item.entityId ? `/app?postId=${item.entityId}` : '/app'
      if (item.entityType === 'ticket') return '/app/support'
      if (item.entityType === 'report') return '/app/settings'
      return null
  }
}

function resolveActionLabel(item: any): string {
  switch (item.type) {
    case 'CONNECTION_REQUEST':
      return 'Respond to Request'
    case 'CONNECTION_ACCEPTED':
      return 'View Profile'
    case 'NEW_MESSAGE':
      return 'Open Message'
    case 'PROFILE_VIEW':
      return 'View Profile'
    case 'CARD_ACTIVATED':
      return 'Manage Cards'
    case 'ORDER_UPDATE':
    case 'ORDER_STATUS_CHANGED':
      return 'View Order'
    case 'POST_LIKE':
    case 'POST_COMMENT':
      return 'View Post'
    case 'TICKET_RESPONSE':
      return 'View Ticket'
    case 'REPORT_RESPONSE':
      return 'View Account Status'
    case 'SECURITY_ALERT':
      return 'Review Security'
    default:
      return 'View Details'
  }
}

function formatTimeAgo(dateString: string): string {
  const now = new Date()
  const date = new Date(dateString)
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHour < 24) return `${diffHour}h ago`
  if (diffDay < 7) return `${diffDay}d ago`
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export default function NotificationsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = React.useState<FilterTab>('all')

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.notifications.list(),
    queryFn: () => notificationsApi.list({ limit: 50 }),
    refetchInterval: 25000,
  })

  const markAllMutation = useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.list() })
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount })
      toast.success('All notifications marked as read.')
    },
  })

  const markSingleMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.list() })
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount })
    },
  })

  const rawNotifications = data?.data?.notifications || []
  const unreadCount = rawNotifications.filter((n) => !n.isRead).length

  // Filter based on active tab
  const filteredNotifications = React.useMemo(() => {
    return rawNotifications.filter((item) => {
      if (activeTab === 'unread') return !item.isRead
      if (activeTab === 'orders_cards') {
        return (
          item.type === 'ORDER_UPDATE' ||
          item.type === 'CARD_ACTIVATED' ||
          (item as any).type === 'ORDER_STATUS_CHANGED' ||
          (item as any).entityType === 'order' ||
          (item as any).entityType === 'card'
        )
      }
      if (activeTab === 'social') {
        return (
          item.type === 'CONNECTION_REQUEST' ||
          item.type === 'CONNECTION_ACCEPTED' ||
          item.type === 'NEW_MESSAGE' ||
          item.type === 'POST_LIKE' ||
          item.type === 'POST_COMMENT' ||
          item.type === 'PROFILE_VIEW' ||
          (item as any).entityType === 'connection' ||
          (item as any).entityType === 'conversation' ||
          (item as any).entityType === 'post'
        )
      }
      if (activeTab === 'system') {
        return (
          item.type === 'TICKET_RESPONSE' ||
          item.type === 'REPORT_RESPONSE' ||
          item.type === 'SECURITY_ALERT' ||
          item.type === 'SYSTEM_ANNOUNCEMENT' ||
          (item as any).entityType === 'ticket' ||
          (item as any).entityType === 'report'
        )
      }
      return true
    })
  }, [rawNotifications, activeTab])

  if (isLoading) {
    return <LoadingScreen message="Loading notifications..." />
  }

  return (
    <div className="space-y-6 text-left max-w-4xl mx-auto pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Notifications
            </h1>
            {unreadCount > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-primary/10 text-primary">
                {unreadCount} unread
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Activity, connection requests, orders, and system updates.
          </p>
        </div>

        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            isLoading={markAllMutation.isPending}
            onClick={() => markAllMutation.mutate()}
            leftIcon={<CheckCheck className="h-3.5 w-3.5" />}
            className="text-xs h-8"
          >
            Mark All Read
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar border-b border-border text-sm font-medium">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={cn(
            'px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer shrink-0',
            activeTab === 'all'
              ? 'bg-primary text-white font-semibold shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
          )}
        >
          <span>All</span>
          <span className={cn('text-xs px-1.5 py-0.2 rounded-full', activeTab === 'all' ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground')}>
            {rawNotifications.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('unread')}
          className={cn(
            'px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer shrink-0',
            activeTab === 'unread'
              ? 'bg-primary text-white font-semibold shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
          )}
        >
          <span>Unread</span>
          {unreadCount > 0 && (
            <span className={cn('text-xs px-1.5 py-0.2 rounded-full font-bold', activeTab === 'unread' ? 'bg-white text-primary' : 'bg-primary text-white')}>
              {unreadCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('orders_cards')}
          className={cn(
            'px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer shrink-0',
            activeTab === 'orders_cards'
              ? 'bg-primary text-white font-semibold shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
          )}
        >
          <Package className="h-3.5 w-3.5" />
          <span>Orders & Cards</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('social')}
          className={cn(
            'px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer shrink-0',
            activeTab === 'social'
              ? 'bg-primary text-white font-semibold shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
          )}
        >
          <MessageSquare className="h-3.5 w-3.5" />
          <span>Network & Social</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('system')}
          className={cn(
            'px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer shrink-0',
            activeTab === 'system'
              ? 'bg-primary text-white font-semibold shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
          )}
        >
          <LifeBuoy className="h-3.5 w-3.5" />
          <span>Support & Alerts</span>
        </button>
      </div>

      {/* Notifications List */}
      {filteredNotifications.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-8 w-8 text-muted-foreground" />}
          title={activeTab === 'unread' ? 'No unread notifications' : 'No notifications found'}
          description={
            activeTab === 'unread'
              ? 'You have read all your notifications. Great job keeping your feed clear!'
              : 'Activity regarding your connections, messages, orders, cards, and posts will show up here.'
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((item) => {
            const nId = item._id || item.id
            const destinationLink = resolveItemLink(item)
            const actionLabel = resolveActionLabel(item)
            const { icon, bg } = getNotificationIcon(item.type)

            const handleCardClick = () => {
              if (!item.isRead && nId) {
                markSingleMutation.mutate(nId)
              }
              if (destinationLink) {
                navigate(destinationLink)
              }
            }

            return (
              <div
                key={nId}
                onClick={handleCardClick}
                className={cn(
                  'group relative flex items-start gap-4 p-4 sm:p-5 rounded-2xl border transition-all duration-200 cursor-pointer',
                  item.isRead
                    ? 'bg-card/70 border-border/80 text-muted-foreground hover:bg-card hover:border-border'
                    : 'bg-card border-primary/30 shadow-xs hover:border-primary/60 text-foreground ring-1 ring-primary/10'
                )}
              >
                {/* Visual Icon Badge */}
                <div className={cn('p-2.5 rounded-xl border shrink-0 mt-0.5 transition-transform group-hover:scale-105', bg)}>
                  {icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className={cn('font-bold text-sm leading-snug', item.isRead ? 'text-foreground/90' : 'text-foreground')}>
                        {item.title}
                      </h3>
                      {!item.isRead && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-primary/15 text-primary">
                          New
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-muted-foreground shrink-0 font-medium">
                      {formatTimeAgo(item.createdAt)}
                    </span>
                  </div>

                  <p className="text-xs text-foreground/80 leading-relaxed font-normal">
                    {item.message || (item as any).body}
                  </p>

                  {/* Action Link & CTA */}
                  {destinationLink && (
                    <div className="pt-2 flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary-soft hover:bg-primary-muted text-primary text-xs font-semibold transition-all group-hover:bg-primary group-hover:text-white shadow-xs">
                        <span>{actionLabel}</span>
                        <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </div>
                  )}
                </div>

                {/* Mark as Read Button */}
                {!item.isRead && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (nId) markSingleMutation.mutate(nId)
                    }}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-muted/80 transition-all shrink-0"
                    title="Mark as read"
                    aria-label="Mark as read"
                  >
                    <span className="h-2.5 w-2.5 rounded-full bg-primary inline-block" />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
