import * as React from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { messagingApi } from '@/features/messaging/api/messaging.api'
import { mediaApi } from '@/features/media/api/media.api'
import { queryKeys } from '@/lib/query/queryKeys'
import { useAuthStore } from '@/stores/authStore'
import {
  getSocket,
  joinConversationRoom,
  leaveConversationRoom,
  emitTypingStart,
  emitTypingStop,
} from '@/lib/socket/socketClient'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Avatar } from '@/components/ui/Avatar'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingScreen } from '@/components/common/LoadingScreen'
import { ReportDialog } from '@/components/common/ReportDialog'
import { NewChatModal } from '@/components/messaging/NewChatModal'
import { FolderModal } from '@/components/messaging/FolderModal'
import { AssignFolderModal } from '@/components/messaging/AssignFolderModal'
import { CreateGroupModal } from '@/components/messaging/CreateGroupModal'
import { GroupDetailsModal } from '@/components/messaging/GroupDetailsModal'
import { toast } from '@/stores/toastStore'
import {
  Send,
  ArrowLeft,
  Trash2,
  Edit2,
  CheckCheck,
  MessageSquare,
  Paperclip,
  Flag,
  FileText,
  UserPlus,
  Users,
  Folder,
  FolderPlus,
  Settings,
} from 'lucide-react'

import type { Message, ChatFolder } from '@/types/messaging.types'

const FOLDER_COLOR_CLASSES: Record<string, string> = {
  purple: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30',
  blue: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
  emerald: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  amber: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
  rose: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
  indigo: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
  cyan: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30',
}

export default function MessagesPage() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeConversationId = searchParams.get('cid')

  const [messageInput, setMessageInput] = React.useState('')
  const [editingMessageId, setEditingMessageId] = React.useState<string | null>(null)
  const [editingContent, setEditingContent] = React.useState('')
  const [isTyping, setIsTyping] = React.useState(false)
  const [otherUserTyping, setOtherUserTyping] = React.useState(false)

  // Report dialog state
  const [isReportOpen, setIsReportOpen] = React.useState(false)
  const [reportMessageId, setReportMessageId] = React.useState<string | null>(null)

  // Folder & New Chat modal state
  const [isNewChatOpen, setIsNewChatOpen] = React.useState(false)
  const [isCreateGroupOpen, setIsCreateGroupOpen] = React.useState(false)
  const [isGroupDetailsOpen, setIsGroupDetailsOpen] = React.useState(false)
  const [isStartingChat, setIsStartingChat] = React.useState(false)
  const [isFolderModalOpen, setIsFolderModalOpen] = React.useState(false)
  const [folderToEdit, setFolderToEdit] = React.useState<ChatFolder | null>(null)
  const [isAssignModalOpen, setIsAssignModalOpen] = React.useState(false)
  const [assignTarget, setAssignTarget] = React.useState<{ id: string; name: string } | null>(null)
  const [activeFolderId, setActiveFolderId] = React.useState<string>('all')

  // Attachment state
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)
  const [isUploading, setIsUploading] = React.useState(false)
  const [pendingAttachments, setPendingAttachments] = React.useState<
    Array<{ url: string; filename: string; mimeType: string; sizeBytes: number }>
  >([])

  const messagesEndRef = React.useRef<HTMLDivElement | null>(null)

  // Fetch folders
  const { data: folderData } = useQuery({
    queryKey: queryKeys.conversations.folders,
    queryFn: () => messagingApi.getFolders(),
  })
  const folders: ChatFolder[] = folderData?.data?.folders || []

  // Fetch conversations list
  const { data: convData, isLoading: isConvLoading } = useQuery({
    queryKey: queryKeys.conversations.list(),
    queryFn: () => messagingApi.getConversations(),
  })

  const conversations = convData?.data?.conversations || []

  const getParticipant = (c?: any): any => c?.participant || c?.otherUser || {}

  // Filtered conversations by selected folder
  const filteredConversations = React.useMemo(() => {
    if (activeFolderId === 'all') return conversations
    const folder = folders.find((f) => (f.id || (f as any)._id) === activeFolderId)
    if (!folder) return conversations
    const memberSet = new Set(folder.memberUserIds || [])
    return conversations.filter((c) => {
      const p = getParticipant(c)
      const pId = p._id || p.id || ''
      return memberSet.has(pId)
    })
  }, [conversations, activeFolderId, folders])

  const getFoldersForUser = (userId: string) => {
    return folders.filter((f) => (f.memberUserIds || []).includes(userId))
  }

  const handleSelectNewChatUser = async (targetUserId: string) => {
    try {
      setIsStartingChat(true)
      const res = await messagingApi.getOrCreateConversation(targetUserId)
      const cid =
        res.data?.conversation?._id ||
        res.data?.conversation?.id ||
        (res.data as any)?.conversationId
      await queryClient.invalidateQueries({ queryKey: queryKeys.conversations.list() })
      setIsNewChatOpen(false)
      if (cid) {
        setSearchParams({ cid })
      }
      toast.success('Conversation opened')
    } catch (err: any) {
      toast.error(err?.message || 'Could not start conversation')
    } finally {
      setIsStartingChat(false)
    }
  }

  // Active conversation object
  const activeConversation = conversations.find(
    (c) => (c._id || c.id) === activeConversationId
  )
  const isActiveGroup = !!(activeConversation?.isGroup || activeConversation?.participant?.isGroup)
  const activeParticipant = getParticipant(activeConversation)


  // Fetch messages for active conversation
  const { data: messagesData, isLoading: isMessagesLoading } = useQuery({
    queryKey: queryKeys.conversations.messages(activeConversationId || ''),
    queryFn: () => messagingApi.getMessages(activeConversationId!),
    enabled: !!activeConversationId,
  })

  const messages = messagesData?.data?.messages || []

  // Ensure unique messages by ID so duplicate sockets/optimistic updates never render twice
  const uniqueMessages = React.useMemo(() => {
    const seen = new Set<string>()
    return messages.filter((m) => {
      const id = m._id || m.id
      if (!id) return true
      if (seen.has(id)) return false
      seen.add(id)
      return true
    })
  }, [messages])

  // Socket room joining and listeners
  React.useEffect(() => {
    if (!activeConversationId) {return}

    joinConversationRoom(activeConversationId)

    const socket = getSocket()
    if (socket) {
      const handleNewMessage = (payload: { message: Message }) => {
        if (payload?.message?.conversationId === activeConversationId) {
          const newMsg = payload.message
          const newMsgId = newMsg._id || newMsg.id

          queryClient.setQueryData(
            queryKeys.conversations.messages(activeConversationId),
            (old: { data?: { messages?: Message[] } } | undefined) => {
              if (!old?.data?.messages) {return old}
              const exists = old.data.messages.some(
                (m) => (m._id || m.id) === newMsgId
              )
              if (exists) {return old}
              return {
                ...old,
                data: {
                  ...old.data,
                  messages: [...old.data.messages, newMsg],
                },
              }
            }
          )
          scrollToBottom()
        }
      }

      const handleTypingStart = (data: { conversationId: string; userId: string }) => {
        if (data.conversationId === activeConversationId && data.userId !== user?._id) {
          setOtherUserTyping(true)
        }
      }

      const handleTypingStop = (data: { conversationId: string; userId: string }) => {
        if (data.conversationId === activeConversationId && data.userId !== user?._id) {
          setOtherUserTyping(false)
        }
      }

      const handleGroupMembersUpdated = () => {
        queryClient.invalidateQueries({ queryKey: ['conversations', 'details', activeConversationId] })
        queryClient.invalidateQueries({ queryKey: queryKeys.conversations.list() })
        queryClient.invalidateQueries({ queryKey: queryKeys.conversations.messages(activeConversationId) })
      }

      const handleGroupInfoUpdated = () => {
        queryClient.invalidateQueries({ queryKey: ['conversations', 'details', activeConversationId] })
        queryClient.invalidateQueries({ queryKey: queryKeys.conversations.list() })
      }

      const handleRemovedFromGroup = (data: { conversationId: string; title: string }) => {
        if (data.conversationId === activeConversationId) {
          toast.error(`You were removed from ${data.title || 'the group'}`)
          setSearchParams({})
        }
        queryClient.invalidateQueries({ queryKey: queryKeys.conversations.list() })
      }

      socket.on('new_message', handleNewMessage)
      socket.on('typing_start', handleTypingStart)
      socket.on('typing_stop', handleTypingStop)
      socket.on('group_members_updated', handleGroupMembersUpdated)
      socket.on('group_info_updated', handleGroupInfoUpdated)
      socket.on('removed_from_group', handleRemovedFromGroup)

      return () => {
        leaveConversationRoom(activeConversationId)
        socket.off('new_message', handleNewMessage)
        socket.off('typing_start', handleTypingStart)
        socket.off('typing_stop', handleTypingStop)
        socket.off('group_members_updated', handleGroupMembersUpdated)
        socket.off('group_info_updated', handleGroupInfoUpdated)
        socket.off('removed_from_group', handleRemovedFromGroup)
      }
    }
  }, [activeConversationId, queryClient, user?._id, setSearchParams])


  // Scroll to bottom helper
  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 50)
  }

  React.useEffect(() => {
    scrollToBottom()
  }, [uniqueMessages.length])

  // Send message mutation
  const sendMutation = useMutation({
    mutationFn: (payload: { text: string; attachments?: any[] }) =>
      messagingApi.sendMessage(activeConversationId!, payload),
    onSuccess: (res) => {
      setMessageInput('')
      setPendingAttachments([])
      if (activeConversationId) {
        emitTypingStop(activeConversationId)
      }
      const newMsg = res.data?.message
      if (newMsg) {
        const newMsgId = newMsg._id || newMsg.id
        queryClient.setQueryData(
          queryKeys.conversations.messages(activeConversationId!),
          (old: { data?: { messages?: Message[] } } | undefined) => {
            if (!old?.data?.messages) {return old}
            const exists = old.data.messages.some(
              (m) => (m._id || m.id) === newMsgId
            )
            if (exists) {return old}
            return {
              ...old,
              data: {
                ...old.data,
                messages: [...old.data.messages, newMsg],
              },
            }
          }
        )
      }
      scrollToBottom()
    },
    onError: () => {
      toast.error('Failed to send message')
    },
  })

  // Edit message mutation
  const editMutation = useMutation({
    mutationFn: ({ messageId, text }: { messageId: string; text: string }) =>
      messagingApi.editMessage(messageId, text),
    onSuccess: (res) => {
      setEditingMessageId(null)
      setEditingContent('')
      queryClient.setQueryData(
        queryKeys.conversations.messages(activeConversationId!),
        (old: { data?: { messages?: Message[] } } | undefined) => {
          if (!old?.data?.messages) {return old}
          return {
            ...old,
            data: {
              ...old.data,
              messages: old.data.messages.map((m) =>
                (m._id || m.id) === (res.data.message._id || res.data.message.id)
                  ? res.data.message
                  : m
              ),
            },
          }
        }
      )
    },
  })

  // Delete message mutation
  const deleteMutation = useMutation({
    mutationFn: ({ messageId, mode }: { messageId: string; mode?: 'for-me' | 'for-everyone' }) =>
      messagingApi.deleteMessage(messageId, mode),
    onSuccess: (_, vars) => {
      queryClient.setQueryData(
        queryKeys.conversations.messages(activeConversationId!),
        (old: { data?: { messages?: Message[] } } | undefined) => {
          if (!old?.data?.messages) {return old}
          return {
            ...old,
            data: {
              ...old.data,
              messages: old.data.messages.filter((m) => (m._id || m.id) !== vars.messageId),
            },
          }
        }
      )
      toast.default('Message removed.')
    },
  })

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if ((!messageInput.trim() && pendingAttachments.length === 0) || !activeConversationId) {
      return
    }
    sendMutation.mutate({
      text: messageInput.trim(),
      attachments: pendingAttachments,
    })
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) {return}
    setIsUploading(true)
    try {
      const { publicUrl } = await mediaApi.uploadFile(file, 'MESSAGE_ATTACHMENT')
      setPendingAttachments((prev) => [
        ...prev,
        {
          url: publicUrl,
          filename: file.name,
          mimeType: file.type || 'application/octet-stream',
          sizeBytes: file.size,
        },
      ])
      toast.success('File attached!')
    } catch {
      toast.error('Failed to upload attachment')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageInput(e.target.value)
    if (!activeConversationId) {return}

    if (!isTyping) {
      setIsTyping(true)
      emitTypingStart(activeConversationId)
    }

    const timer = setTimeout(() => {
      setIsTyping(false)
      emitTypingStop(activeConversationId)
    }, 1500)
    return () => clearTimeout(timer)
  }

  if (isConvLoading) {
    return <LoadingScreen message="Loading messaging center..." />
  }

  return (
    <div className="rounded-3xl border border-border bg-card shadow-sm overflow-hidden h-[calc(100vh-8.5rem)] flex flex-col text-left">
      <div className="flex flex-1 overflow-hidden">
        {/* Left Conversation List Pane */}
        <div
          className={`w-full md:w-80 lg:w-96 border-r border-border flex flex-col bg-card shrink-0 ${
            activeConversationId ? 'hidden md:flex' : 'flex'
          }`}
        >
          <div className="p-4 border-b border-border space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold text-foreground">Messages</h2>
                <p className="text-xs text-muted-foreground">Direct & group chats</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsCreateGroupOpen(true)}
                  leftIcon={<Users className="h-3.5 w-3.5" />}
                  className="text-xs px-2.5 h-8"
                  title="Create new group chat"
                >
                  Group
                </Button>
                <Button
                  size="sm"
                  onClick={() => setIsNewChatOpen(true)}
                  leftIcon={<UserPlus className="h-3.5 w-3.5" />}
                  className="text-xs px-2.5 h-8"
                >
                  New Chat
                </Button>
              </div>
            </div>


            {/* Folder Tabs Navigation */}
            <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 pt-0.5">
              <button
                type="button"
                onClick={() => setActiveFolderId('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  activeFolderId === 'all'
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <span>All</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    activeFolderId === 'all'
                      ? 'bg-white/20 text-white'
                      : 'bg-background/80 text-muted-foreground'
                  }`}
                >
                  {conversations.length}
                </span>
              </button>

              {folders.map((folder) => {
                const fId = folder.id || (folder as any)._id
                const isActive = activeFolderId === fId
                const colorStyle = FOLDER_COLOR_CLASSES[folder.color] || FOLDER_COLOR_CLASSES.purple
                return (
                  <div key={fId} className="flex items-center shrink-0">
                    <button
                      type="button"
                      onClick={() => setActiveFolderId(fId)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                        isActive
                          ? `${colorStyle} shadow-sm font-bold border`
                          : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted'
                      }`}
                    >
                      <Folder className="h-3 w-3 shrink-0" />
                      <span>{folder.name}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-background/80">
                        {folder.memberCount || folder.memberUserIds?.length || 0}
                      </span>
                    </button>
                    {isActive && (
                      <button
                        type="button"
                        onClick={() => {
                          setFolderToEdit(folder)
                          setIsFolderModalOpen(true)
                        }}
                        title="Edit folder"
                        className="p-1 -ml-1 text-muted-foreground hover:text-foreground"
                      >
                        <Settings className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                )
              })}

              <button
                type="button"
                onClick={() => {
                  setFolderToEdit(null)
                  setIsFolderModalOpen(true)
                }}
                title="Create folder"
                className="px-2.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap bg-muted/40 hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all flex items-center gap-1 border border-dashed border-border"
              >
                <FolderPlus className="h-3.5 w-3.5" />
                <span>Folder</span>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-border/60 custom-scrollbar">
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center space-y-3 text-muted-foreground">
                <div className="h-10 w-10 mx-auto rounded-full bg-muted/60 flex items-center justify-center">
                  {activeFolderId === 'all' ? (
                    <MessageSquare className="h-5 w-5" />
                  ) : (
                    <Folder className="h-5 w-5 text-primary" />
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">
                    {activeFolderId === 'all'
                      ? 'No active conversations yet'
                      : `No chats in this folder`}
                  </p>
                  <p className="text-xs">
                    {activeFolderId === 'all'
                      ? 'Start a chat with any of your verified connections.'
                      : 'Add connected peers to this folder to organize your inbox.'}
                  </p>
                </div>
                {activeFolderId === 'all' ? (
                  <Button
                    size="sm"
                    onClick={() => setIsNewChatOpen(true)}
                    leftIcon={<UserPlus className="h-3.5 w-3.5" />}
                  >
                    Start First Chat
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="subtle"
                    onClick={() => {
                      const f = folders.find(
                        (item) => (item.id || (item as any)._id) === activeFolderId
                      )
                      if (f) {
                        setFolderToEdit(f)
                        setIsFolderModalOpen(true)
                      }
                    }}
                    leftIcon={<FolderPlus className="h-3.5 w-3.5" />}
                  >
                    Add People to Folder
                  </Button>
                )}
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const convId = conv._id || conv.id
                const isSelected = convId === activeConversationId
                const isGroup = !!(conv.isGroup || conv.participant?.isGroup)
                const participant = getParticipant(conv)
                const pId = participant._id || participant.id || ''
                const userFolders = !isGroup ? getFoldersForUser(pId) : []
                const titleText = isGroup
                  ? conv.title || participant?.displayName || 'Group Chat'
                  : participant?.displayName || participant?.username || 'User'

                return (
                  <button
                    key={convId}
                    type="button"
                    onClick={() => setSearchParams({ cid: convId || '' })}
                    className={`w-full flex items-start gap-3 p-4 text-left transition-colors ${
                      isSelected
                        ? 'bg-primary-soft/60 border-l-4 border-primary'
                        : 'hover:bg-muted/40'
                    }`}
                  >
                    {isGroup ? (
                      <div className="h-10 w-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                        <Users className="h-5 w-5" />
                      </div>
                    ) : (
                      <Avatar
                        src={participant?.avatarUrl}
                        fallback={participant?.displayName || participant?.username || 'User'}
                        alt={participant?.displayName || participant?.username || 'User'}
                        size="md"
                        className="shrink-0 rounded-2xl"
                      />
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-bold text-sm text-foreground truncate">
                            {titleText}
                          </span>
                          {isGroup && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-muted text-muted-foreground font-semibold shrink-0">
                              {conv.memberCount || 2}m
                            </span>
                          )}
                        </div>
                        {conv.unreadCount > 0 && (
                          <span className="h-5 min-w-[20px] px-1.5 rounded-full bg-primary text-[10px] font-bold text-white flex items-center justify-center shrink-0">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-muted-foreground truncate mt-0.5">
                        {(conv.lastMessage as any)?.text ||
                          conv.lastMessage?.content ||
                          'Started a conversation'}
                      </div>

                      {userFolders.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap mt-1.5">
                          {userFolders.slice(0, 2).map((f) => (
                            <span
                              key={f.id || (f as any)._id}
                              className={`text-[9px] px-1.5 py-0.5 rounded-md font-medium border ${
                                FOLDER_COLOR_CLASSES[f.color] || FOLDER_COLOR_CLASSES.purple
                              }`}
                            >
                              {f.name}
                            </span>
                          ))}
                          {userFolders.length > 2 && (
                            <span className="text-[9px] text-muted-foreground">
                              +{userFolders.length - 2}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </button>
                )
              })

            )}
          </div>
        </div>

        {/* Right Active Chat Pane */}
        {activeConversationId ? (
          <div className="flex-1 flex flex-col min-w-0 bg-muted/15">
            {/* Chat Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-card">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => setSearchParams({})}
                  className="md:hidden p-1.5 rounded-lg text-muted-foreground hover:bg-muted shrink-0"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>

                {isActiveGroup ? (
                  <div
                    onClick={() => setIsGroupDetailsOpen(true)}
                    className="h-10 w-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 cursor-pointer hover:bg-primary/20 transition-colors"
                  >
                    <Users className="h-5 w-5" />
                  </div>
                ) : (
                  <Avatar
                    src={activeParticipant?.avatarUrl}
                    fallback={activeParticipant?.displayName || activeParticipant?.username || 'User'}
                    alt={activeParticipant?.displayName || activeParticipant?.username || 'User'}
                    size="md"
                    className="rounded-2xl shrink-0"
                  />
                )}

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-foreground truncate">
                      {isActiveGroup
                        ? activeConversation?.title || activeParticipant?.displayName || 'Group Chat'
                        : activeParticipant?.displayName || activeParticipant?.username || 'User'}
                    </span>
                    {isActiveGroup && (
                      <span className="px-1.5 py-0.2 rounded-md text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20 shrink-0">
                        Group
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {otherUserTyping ? (
                      <span className="text-primary italic animate-pulse">Typing...</span>
                    ) : isActiveGroup ? (
                      <button
                        type="button"
                        onClick={() => setIsGroupDetailsOpen(true)}
                        className="hover:text-primary transition-colors text-left"
                      >
                        {activeConversation?.memberCount || 2} members • View group info
                      </button>
                    ) : activeParticipant?.username ? (
                      `@${activeParticipant.username}`
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Chat Actions */}
              <div className="flex items-center gap-2 shrink-0">
                {isActiveGroup ? (
                  <Button
                    variant="subtle"
                    size="sm"
                    onClick={() => setIsGroupDetailsOpen(true)}
                    leftIcon={<Users className="h-3.5 w-3.5" />}
                    className="text-xs"
                  >
                    Manage Group
                  </Button>
                ) : (
                  (activeParticipant?._id || activeParticipant?.id) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setAssignTarget({
                          id: activeParticipant._id || activeParticipant.id || '',
                          name: activeParticipant.displayName || activeParticipant.username || 'User',
                        })
                      }
                      leftIcon={<Folder className="h-3.5 w-3.5" />}
                      className="text-xs"
                    >
                      <span className="hidden sm:inline">Add to </span>Folder
                    </Button>
                  )
                )}
              </div>
            </div>

            {/* Message Stream */}
            <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 custom-scrollbar">
              {isMessagesLoading ? (
                <div className="flex justify-center p-8">
                  <div className="text-xs text-muted-foreground">Loading chat history...</div>
                </div>
              ) : uniqueMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 text-muted-foreground text-xs">
                  <MessageSquare className="h-8 w-8 text-primary mb-2 opacity-50" />
                  <span>No messages yet. Send a message to break the ice!</span>
                </div>
              ) : (
                uniqueMessages.map((msg) => {
                  const mId = msg._id || msg.id
                  const isMine =
                    msg.senderId === user?._id ||
                    msg.senderId === user?.id ||
                    (typeof user?._id === 'string' && msg.senderId.includes(user._id))

                  if (msg.type === 'system') {
                    return (
                      <div key={mId} className="flex justify-center my-2">
                        <span className="px-3 py-1 rounded-full bg-muted/60 text-muted-foreground text-[11px] font-medium border border-border/40 shadow-xs text-center max-w-md">
                          {(msg as any).text || msg.content}
                        </span>
                      </div>
                    )
                  }

                  return (
                    <div
                      key={mId}
                      className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                    >
                      {isActiveGroup && !isMine && (
                        <div className="flex items-center gap-1.5 mb-1 px-1">
                          <Avatar
                            src={msg.sender?.avatarUrl || undefined}
                            fallback={msg.sender?.displayName || msg.sender?.username || 'Member'}
                            size="sm"
                            className="h-4 w-4 rounded-md text-[9px]"
                          />
                          <span className="text-[11px] font-bold text-foreground">
                            {msg.sender?.displayName || msg.sender?.username || 'Member'}
                          </span>
                        </div>
                      )}
                      <div className="flex items-end gap-1.5 group max-w-[80%] sm:max-w-[70%]">

                        {isMine ? (
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-muted-foreground pb-1">
                            <button
                              onClick={() => {
                                setEditingMessageId(mId || '')
                                setEditingContent((msg as any).text || msg.content || '')
                              }}
                              className="p-1 hover:text-foreground"
                              title="Edit message"
                            >
                              <Edit2 className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => deleteMutation.mutate({ messageId: mId || '' })}
                              className="p-1 hover:text-destructive"
                              title="Delete message"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-muted-foreground pb-1">
                            <button
                              onClick={() => {
                                setReportMessageId(mId || '')
                                setIsReportOpen(true)
                              }}
                              className="p-1 hover:text-destructive"
                              title="Report message"
                            >
                              <Flag className="h-3 w-3" />
                            </button>
                          </div>
                        )}

                        <div
                          className={`rounded-2xl px-4 py-2.5 text-sm shadow-sm whitespace-pre-wrap ${
                            isMine
                              ? 'bg-primary text-primary-foreground rounded-br-none'
                              : 'bg-card text-card-foreground border border-border/80 rounded-bl-none'
                          }`}
                        >
                          {editingMessageId === mId ? (
                            <div className="flex flex-col gap-2">
                              <input
                                type="text"
                                value={editingContent}
                                onChange={(e) => setEditingContent(e.target.value)}
                                className="bg-white/20 text-white rounded p-1 text-xs focus:outline-none"
                              />
                              <div className="flex justify-end gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 text-[10px]"
                                  onClick={() => setEditingMessageId(null)}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="h-6 text-[10px]"
                                  onClick={() =>
                                    editMutation.mutate({ messageId: mId || '', text: editingContent })
                                  }
                                >
                                  Save
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div>{(msg as any).text || msg.content}</div>
                              {msg.attachments && msg.attachments.length > 0 && (
                                <div className="mt-2 space-y-1">
                                  {msg.attachments.map((att: any, idx: number) => (
                                    <a
                                      key={idx}
                                      href={att.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className={`flex items-center gap-1.5 p-2 rounded-xl text-xs underline font-medium ${
                                        isMine ? 'bg-white/10 text-white' : 'bg-muted text-foreground'
                                      }`}
                                    >
                                      <FileText className="h-3.5 w-3.5" />
                                      <span className="truncate max-w-xs">{att.filename || 'Attachment'}</span>
                                    </a>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="text-[10px] text-muted-foreground mt-1 px-1 flex items-center gap-1">
                        <span>
                          {new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {msg.isEdited && <span>(edited)</span>}
                        {isMine && <CheckCheck className="h-3 w-3 text-primary inline" />}
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Pending Attachments Bar */}
            {pendingAttachments.length > 0 && (
              <div className="px-4 py-2 bg-muted/40 border-t border-border flex items-center gap-2 overflow-x-auto text-xs">
                {pendingAttachments.map((att, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-card border border-border text-foreground"
                  >
                    <FileText className="h-3 w-3 text-primary" />
                    <span className="max-w-[120px] truncate">{att.filename}</span>
                    <button
                      type="button"
                      onClick={() => setPendingAttachments((prev) => prev.filter((_, idx) => idx !== i))}
                      className="text-muted-foreground hover:text-destructive ml-1"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Input Bar */}
            <form
              onSubmit={handleSendMessage}
              className="p-3 sm:p-4 border-t border-border bg-card flex items-center gap-2"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || sendMutation.isPending}
                isLoading={isUploading}
                title="Attach file"
              >
                <Paperclip className="h-4 w-4" />
              </Button>
              <Input
                value={messageInput}
                onChange={handleInputChange}
                placeholder="Type your message..."
                className="flex-1 rounded-xl"
              />
              <Button
                type="submit"
                size="icon"
                disabled={(!messageInput.trim() && pendingAttachments.length === 0) || sendMutation.isPending}
                isLoading={sendMutation.isPending}
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        ) : (
          <div className="hidden md:flex flex-1 items-center justify-center p-8 bg-muted/10 text-center">
            <EmptyState
              icon={<MessageSquare className="h-8 w-8" />}
              title="Select a Conversation"
              description="Choose a peer from the list on the left to start collaborating in real-time."
            />
          </div>
        )}
      </div>

      {/* Report Modal */}
      {reportMessageId && (
        <ReportDialog
          open={isReportOpen}
          onOpenChange={(open) => {
            setIsReportOpen(open)
            if (!open) {setReportMessageId(null)}
          }}
          targetType="MESSAGE"
          targetId={reportMessageId}
          reportedUserId={activeParticipant?._id || activeParticipant?.id}
          title="Report Inappropriate Message"
        />
      )}

      {/* New Chat Modal */}
      <NewChatModal
        open={isNewChatOpen}
        onOpenChange={setIsNewChatOpen}
        onSelectUser={handleSelectNewChatUser}
        isStarting={isStartingChat}
      />

      {/* Create / Edit Folder Modal */}
      <FolderModal
        open={isFolderModalOpen}
        onOpenChange={setIsFolderModalOpen}
        folderToEdit={folderToEdit}
        onSuccess={(f) => {
          setActiveFolderId(f.id || (f as any)._id)
        }}
        onDeleted={(deletedId) => {
          if (activeFolderId === deletedId) {
            setActiveFolderId('all')
          }
        }}
      />

      {/* Assign User to Folder Modal */}
      {assignTarget && (
        <AssignFolderModal
          open={isAssignModalOpen || !!assignTarget}
          onOpenChange={(open) => {
            setIsAssignModalOpen(open)
            if (!open) setAssignTarget(null)
          }}
          targetUserId={assignTarget.id}
          targetUserName={assignTarget.name}
          onCreateNewFolder={() => {
            setAssignTarget(null)
            setFolderToEdit(null)
            setIsFolderModalOpen(true)
          }}
        />
      )}

      {/* Create Group Chat Modal */}
      <CreateGroupModal
        open={isCreateGroupOpen}
        onOpenChange={setIsCreateGroupOpen}
        onGroupCreated={(cid) => {
          setSearchParams({ cid })
        }}
      />

      {/* Group Details / Management Modal */}
      {activeConversationId && isActiveGroup && (
        <GroupDetailsModal
          conversationId={activeConversationId}
          open={isGroupDetailsOpen}
          onOpenChange={setIsGroupDetailsOpen}
          onLeftGroup={() => {
            setSearchParams({})
          }}
        />
      )}
    </div>
  )
}

