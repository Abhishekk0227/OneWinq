import mongoose from 'mongoose';

const { Schema, model } = mongoose;

/**
 * Order two participant IDs deterministically for canonical 1-to-1 conversations.
 */
export function getCanonicalConversationPair(userA, userB) {
  const strA = String(userA);
  const strB = String(userB);

  if (strA === strB) {
    throw new Error('Cannot create a conversation with oneself');
  }

  if (strA < strB) {
    return {
      userLow: new mongoose.Types.ObjectId(strA),
      userHigh: new mongoose.Types.ObjectId(strB),
    };
  }

  return {
    userLow: new mongoose.Types.ObjectId(strB),
    userHigh: new mongoose.Types.ObjectId(strA),
  };
}

const lastMessageSchema = new Schema(
  {
    text: { type: String, default: '' },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    messageType: { type: String, default: 'text' },
    createdAt: { type: Date, default: null },
  },
  { _id: false },
);

const conversationSchema = new Schema(
  {
    isGroup: {
      type: Boolean,
      default: false,
      index: true,
    },
    title: {
      type: String,
      trim: true,
      maxlength: 100,
      default: '',
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    avatarUrl: {
      type: String,
      default: '',
    },
    creatorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    admins: {
      type: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      default: [],
    },
    members: {
      type: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      default: [],
      index: true,
    },
    userLow: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    userHigh: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    lastMessage: {
      type: lastMessageSchema,
      default: () => ({}),
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    unreadCounts: {
      type: Map,
      of: Number,
      default: () => new Map(),
    },
    // Per-user conversation deletion: if a user deletes a conversation,
    // their ID is pushed here so it's hidden from their inbox.
    deletedBy: {
      type: [Schema.Types.ObjectId],
      ref: 'User',
      default: [],
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

// Exactly one conversation document per 1-to-1 pair
conversationSchema.index({ userLow: 1, userHigh: 1 }, { unique: true });
conversationSchema.index({ userLow: 1, lastMessageAt: -1 });
conversationSchema.index({ userHigh: 1, lastMessageAt: -1 });
conversationSchema.index({ isGroup: 1, members: 1, lastMessageAt: -1 });

conversationSchema.methods.getOtherUserId = function (userId) {
  if (this.isGroup) return null;
  const uStr = String(userId);
  return String(this.userLow) === uStr ? this.userHigh : this.userLow;
};

conversationSchema.methods.isMember = function (userId) {
  const uStr = String(userId);
  if (this.isGroup) {
    return (this.members || []).some((id) => String(id) === uStr);
  }
  return String(this.userLow) === uStr || String(this.userHigh) === uStr;
};

conversationSchema.methods.isAdmin = function (userId) {
  const uStr = String(userId);
  if (!this.isGroup) return false;
  if (this.creatorId && String(this.creatorId) === uStr) return true;
  return (this.admins || []).some((id) => String(id) === uStr);
};

conversationSchema.methods.isCreator = function (userId) {
  const uStr = String(userId);
  return this.isGroup && this.creatorId && String(this.creatorId) === uStr;
};

conversationSchema.methods.isDeletedFor = function (userId) {
  const uStr = String(userId);
  return this.deletedBy.some((id) => String(id) === uStr);
};

export const Conversation =
  mongoose.models.Conversation || model('Conversation', conversationSchema);
