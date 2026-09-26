let ioInstance = null;

export const socketEmitter = {
  setIo(io) {
    ioInstance = io;
  },

  getIo() {
    return ioInstance;
  },

  /**
   * Emit an event to a specific user's personal room.
   */
  emitToUser(userId, eventName, data) {
    if (!ioInstance || !userId) {
      return;
    }
    ioInstance.to(`user:${userId}`).emit(eventName, data);
  },

  /**
   * Emit an event to a conversation room.
   */
  emitToConversation(conversationId, eventName, data, exceptSocketId = null) {
    if (!ioInstance || !conversationId) {
      return;
    }
    const target = ioInstance.to(`conversation:${conversationId}`);
    if (exceptSocketId) {
      target.except(exceptSocketId).emit(eventName, data);
    } else {
      target.emit(eventName, data);
    }
  },
};
