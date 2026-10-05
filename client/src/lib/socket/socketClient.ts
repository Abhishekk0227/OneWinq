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
  const targetUrl = env.socketUrl || ''
  
  // Vercel serverless functions do not host Socket.IO WebSocket servers.
  // If socketUrl is empty or points to vercel.app frontend domain, do not connect socket to prevent 404 polling errors.
  const isServerlessFrontend = typeof window !== 'undefined' && 
    (window.location.hostname.includes('vercel.app') && (!targetUrl || targetUrl.includes('vercel.app')))

  if (!targetUrl || isServerlessFrontend) {
    return null
  }

  const authToken = token || useAuthStore.getState().accessToken

  if (socketInstance) {
    socketInstance.disconnect()
    socketInstance = null
  }

  try {
    socketInstance = io(targetUrl, {
      withCredentials: true,
      autoConnect: true,
      auth: {
        token: authToken,
      },
      reconnection: true,
      reconnectionAttempts: 2,
      reconnectionDelay: 2000,
      transports: ['websocket', 'polling'],
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

    socketInstance.on('connect_error', () => {
      // Disconnect cleanly on failure (e.g., 404 or backend unavailable) to prevent polling noise
      if (socketInstance) {
        socketInstance.disconnect()
        socketInstance = null
      }
    })
  } catch {
    socketInstance = null
  }

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
