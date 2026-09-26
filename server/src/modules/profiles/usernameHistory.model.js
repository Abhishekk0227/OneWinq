import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const usernameHistorySchema = new Schema(
  {
    oldUsername: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    newUsername: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    changedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

export const UsernameHistory =
  mongoose.models.UsernameHistory || model('UsernameHistory', usernameHistorySchema);
