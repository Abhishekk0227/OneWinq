import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const attachmentSchema = new Schema(
  {
    url: { type: String, required: true },
    filename: { type: String, trim: true, default: '' },
    sizeBytes: { type: Number, default: 0 },
    mimeType: { type: String, trim: true, default: '' },
  },
  { _id: false },
);

const messageSchema = new Schema(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    recipientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      default: null,
      index: true,
    },
    type: {
      type: String,
      enum: ['text', 'image', 'file'],
      default: 'text',
    },
    text: {
      type: String,
      trim: true,
      maxlength: 5000,
      default: '',
    },
    attachments: {
      type: [attachmentSchema],
      default: [],
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    editedAt: {
      type: Date,
      default: null,
    },
    isDeletedForEveryone: {
      type: Boolean,
      default: false,
    },
    deletedForEveryoneAt: {
      type: Date,
      default: null,
    },
    deletedByUsers: {
      type: [Schema.Types.ObjectId],
      ref: 'User',
      default: [],
      index: true,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Optimize reverse chronological message history lookup per conversation
messageSchema.index({ conversationId: 1, createdAt: -1 });

/**
 * Format message for client consumption.
 * Replaces text with "This message was deleted" if deleted for everyone.
 */
messageSchema.methods.toClientObject = function (_viewerId = null, senderObj = null) {
  const recipientStr = this.recipientId ? this.recipientId.toString() : null;
  const senderStr = this.senderId ? this.senderId.toString() : '';

  if (this.isDeletedForEveryone) {
    return {
      id: this._id.toString(),
      _id: this._id.toString(),
      conversationId: this.conversationId.toString(),
      senderId: senderStr,
      sender: senderObj || null,
      recipientId: recipientStr,
      type: 'text',
      text: 'This message was deleted',
      attachments: [],
      isEdited: this.isEdited,
      editedAt: this.editedAt,
      isDeletedForEveryone: true,
      isRead: this.isRead,
      readAt: this.readAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  return {
    id: this._id.toString(),
    _id: this._id.toString(),
    conversationId: this.conversationId.toString(),
    senderId: senderStr,
    sender: senderObj || null,
    recipientId: recipientStr,
    type: this.type,
    text: this.text,
    attachments: this.attachments,
    isEdited: this.isEdited,
    editedAt: this.editedAt,
    isDeletedForEveryone: false,
    isRead: this.isRead,
    readAt: this.readAt,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const Message = mongoose.models.Message || model('Message', messageSchema);
