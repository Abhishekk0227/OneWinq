import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const chatFolderSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 40,
    },
    color: {
      type: String,
      default: 'purple',
      enum: ['purple', 'blue', 'emerald', 'amber', 'rose', 'indigo', 'cyan'],
    },
    icon: {
      type: String,
      default: 'folder',
      trim: true,
      maxlength: 30,
    },
    memberUserIds: {
      type: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      default: [],
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

chatFolderSchema.index({ userId: 1, name: 1 });

export const ChatFolder =
  mongoose.models.ChatFolder || model('ChatFolder', chatFolderSchema);
