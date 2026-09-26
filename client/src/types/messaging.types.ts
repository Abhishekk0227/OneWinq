export interface MessageAttachment {
  type: 'image' | 'file'
  url: string
  name: string
  size?: number
}

export interface MessageSender {
  id: string
  _id?: string
  displayName: string
  username: string
  avatarUrl?: string | null
}

export interface Message {
  _id: string
  id?: string
  conversationId: string
  senderId: string
  text?: string
  content?: string
  type?: 'text' | 'image' | 'file' | 'system'
  sender?: MessageSender
  attachments?: MessageAttachment[]
  isEdited?: boolean
  editedAt?: string | null
  deletedForMe?: boolean
  deletedForEveryone?: boolean
  readBy?: Array<{ userId: string; readAt: string }>
  createdAt: string
  updatedAt: string
}

export interface ConversationParticipant {
  _id: string
  id?: string
  username: string
  displayName: string
  avatarUrl?: string
  headline?: string
  primaryProfession?: string | null
  isGroup?: boolean
  memberCount?: number
  admins?: string[]
  members?: string[]
}

export interface Conversation {
  _id: string
  id?: string
  isGroup?: boolean
  title?: string
  description?: string
  avatarUrl?: string | null
  memberCount?: number
  creatorId?: string | null
  admins?: string[]
  members?: string[]
  currentUserRole?: 'CREATOR' | 'ADMIN' | 'MEMBER'
  isAdmin?: boolean
  isCreator?: boolean
  participant: ConversationParticipant
  otherUser?: ConversationParticipant
  lastMessage?: {
    content?: string
    text?: string
    senderId: string
    createdAt: string
    isRead?: boolean
  } | null
  lastMessageAt?: string
  unreadCount: number
  updatedAt: string
}

export interface GroupMember {
  id: string
  _id: string
  displayName: string
  username: string
  avatarUrl?: string | null
  customTitle?: string | null
  role: 'CREATOR' | 'ADMIN' | 'MEMBER'
  isCreator: boolean
  isAdmin: boolean
}

export interface GroupDetails {
  id: string
  _id: string
  isGroup: boolean
  title: string
  description?: string
  avatarUrl?: string | null
  creatorId?: string | null
  memberCount: number
  createdAt: string
  lastMessageAt?: string
  currentUserRole: 'CREATOR' | 'ADMIN' | 'MEMBER'
  isAdmin: boolean
  isCreator: boolean
  members: GroupMember[]
}

export interface ChatFolder {
  id: string
  _id?: string
  name: string
  color: string
  icon: string
  memberUserIds: string[]
  memberCount: number
  createdAt: string
  updatedAt: string
}
