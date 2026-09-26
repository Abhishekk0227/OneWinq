import type { NotificationType } from '@/constants/app.constants'

export interface NotificationItemData {
  _id: string
  id?: string
  userId: string
  type: NotificationType
  title: string
  message: string
  isRead: boolean
  readAt?: string | null
  link?: string
  linkUrl?: string
  metadata?: Record<string, unknown>
  createdAt: string
}

export interface NotificationPreferences {
  emailNotifications: boolean
  connectionRequests: boolean
  directMessages: boolean
  profileViews: boolean
  marketingEmails: boolean
}
