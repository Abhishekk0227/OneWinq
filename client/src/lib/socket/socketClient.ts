import { io, type Socket } from 'socket.io-client'
import { env } from '@/app/config/env'
import { useAuthStore } from '@/stores/authStore'
import { queryClient } from '@/lib/query/queryClient'
import { queryKeys } from '@/lib/query/queryKeys'

import { toast } from '@/stores/toastStore'

let socketInstance: Socket | null = null

export function getSocket(): Socket | null {
  return socketInstance
}

export function connectSocket(token?: string): Socket | null {
  if (!env.socketUrl) {
    return null
  }

  const authToken = token || useAuthStore.getState().accessToken

  if (socketInstance) {
    socketInstance.disconnect()
    socketInstance = null
  }

  socketInstance = io(env.socketUrl, {
    withCredentials: true,
    autoConnect: true,
    auth: {
      token: authToken,
    },
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  })

  socketInstance.on('connect', () => {
    // On reconnect, reconcile server state
    queryClient.invalidateQueries({ queryKey: ['conversations'] })
    queryClient.invalidateQueries({ queryKey: ['notifications'] })
  })

  const handleNotification = (payload?: any) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.notifications.list() })
    queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount })
    queryClient.invalidateQueries({ queryKey: ['notifications'] })

    const item = payload?.notification || payload
    if (item?.title) {
      toast.info(item.message || item.body || 'You have a new notification', item.title)
    }
  }

  socketInstance.on('notification_new', handleNotification)
  socketInstance.on('notification:new', handleNotification)

  socketInstance.on('new_message_notification', () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.conversations.list() })
    queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount })
  })

  socketInstance.on('connect_error', (err) => {
    if (err.message.includes('Authentication') || err.message.includes('token')) {
      // Re-fetch token or let refresh cycle handle it
    }
  })

  return socketInstance
}

export function disconnectSocket(): void {
  if (socketInstance) {
    socketInstance.disconnect()
    socketInstance = null
  }
}

export function joinConversationRoom(conversationId: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (!socketInstance) {
      resolve(false)
      return
    }
    socketInstance.emit('join_conversation', { conversationId }, (res: { success?: boolean }) => {
      resolve(!!res?.success)
    })
  })
}

export function leaveConversationRoom(conversationId: string): void {
  if (socketInstance) {
    socketInstance.emit('leave_conversation', { conversationId })
  }
}

export function emitTypingStart(conversationId: string): void {
  if (socketInstance) {
    socketInstance.emit('typing_start', { conversationId })
  }
}

export function emitTypingStop(conversationId: string): void {
  if (socketInstance) {
    socketInstance.emit('typing_stop', { conversationId })
  }
}
