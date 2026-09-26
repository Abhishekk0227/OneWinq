import { Server } from 'socket.io';
import { socketAuth } from './socketAuth.js';
import { socketEmitter } from './socketEmitter.js';
import { Conversation } from '../../modules/conversations/conversation.model.js';
import { User } from '../../modules/users/user.model.js';
import { config } from '../../config/env.js';
import logger from '../../utils/logger.js';

// In-memory active presence tracker
const onlineUsers = new Map(); // userId -> Set of socketIds

/**
 * Initialize the Socket.IO server and register event handlers.
 *
 * @param {import('http').Server} httpServer
 * @returns {Server}
 */
export function initSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: config.cors.origins,
      credentials: true,
    },
    pingTimeout: 20000,
    pingInterval: 25000,
  });

  // Register authentication middleware
  io.use(socketAuth);

  // Store in emitter for service-layer access
  socketEmitter.setIo(io);

  io.on('connection', (socket) => {
    const userId = socket.user.id;
    const personalRoom = `user:${userId}`;

    // Join personal user room for direct events
    socket.join(personalRoom);

    // Track online presence
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    const userSockets = onlineUsers.get(userId);
    userSockets.add(socket.id);

    // Broadcast user is online
    if (userSockets.size === 1) {
      io.emit('user_online', { userId, timestamp: new Date() });
    }

    logger.debug('Socket connected', { socketId: socket.id, userId });

    // Client can request online status of a list of users
    socket.on('get_presence', (data, ack) => {
      const userIds = data?.userIds || [];
      const statusMap = {};
      for (const uId of userIds) {
        statusMap[uId] = onlineUsers.has(uId) && onlineUsers.get(uId).size > 0;
      }
      if (typeof ack === 'function') {
        ack({ success: true, presence: statusMap });
      }
    });

    // -------------------------------------------------------------------------
    // Room Authorization: Users cannot join arbitrary conversation rooms
    // -------------------------------------------------------------------------
    socket.on('join_conversation', async (data, ack) => {
      try {
        const conversationId = data?.conversationId;
        if (!conversationId) {
          if (typeof ack === 'function') {
            ack({ success: false, error: 'conversationId required' });
          }
          return;
        }

        const conversation = await Conversation.findById(conversationId).lean();
        if (!conversation) {
          if (typeof ack === 'function') {
            ack({ success: false, error: 'Conversation not found' });
          }
          return;
        }

        const uId = String(userId);
        const isParticipant =
          String(conversation.userLow) === uId || String(conversation.userHigh) === uId;

        if (!isParticipant) {
          logger.warn('Unauthorized conversation room join attempt', { userId, conversationId });
          if (typeof ack === 'function') {
            ack({ success: false, error: 'Unauthorized access to conversation' });
          }
          return;
        }

        socket.join(`conversation:${conversationId}`);
        if (typeof ack === 'function') {
          ack({ success: true });
        }
      } catch (err) {
        logger.error('Error in join_conversation socket event', { error: err.message });
        if (typeof ack === 'function') {
          ack({ success: false, error: 'Internal error' });
        }
      }
    });

    socket.on('leave_conversation', (data) => {
      const conversationId = data?.conversationId;
      if (conversationId) {
        socket.leave(`conversation:${conversationId}`);
      }
    });

    // Typing indicators
    socket.on('typing_start', (data) => {
      const conversationId = data?.conversationId;
      if (conversationId) {
        socket.to(`conversation:${conversationId}`).emit('typing_start', {
          conversationId,
          userId,
        });
      }
    });

    socket.on('typing_stop', (data) => {
      const conversationId = data?.conversationId;
      if (conversationId) {
        socket.to(`conversation:${conversationId}`).emit('typing_stop', {
          conversationId,
          userId,
        });
      }
    });

    socket.on('disconnect', async () => {
      logger.debug('Socket disconnected', { socketId: socket.id, userId });
      const currentSockets = onlineUsers.get(userId);
      if (currentSockets) {
        currentSockets.delete(socket.id);
        if (currentSockets.size === 0) {
          onlineUsers.delete(userId);
          const lastSeenAt = new Date();
          io.emit('user_offline', { userId, lastSeenAt });
          User.findByIdAndUpdate(userId, { lastLoginAt: lastSeenAt }).catch(() => {});
        }
      }
    });
  });

  return io;
}
