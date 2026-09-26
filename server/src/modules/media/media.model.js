import mongoose from 'mongoose';
import { MEDIA_PURPOSE } from '../../config/constants.js';

const { Schema } = mongoose;

const mediaSchema = new Schema(
  {
    uploader: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    purpose: {
      type: String,
      enum: Object.values(MEDIA_PURPOSE),
      required: true,
      index: true,
    },
    mimeType: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    sizeBytes: {
      type: Number,
      required: true,
      min: 1,
    },
    storageKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    publicUrl: {
      type: String,
      required: true,
      trim: true,
    },
    state: {
      type: String,
      enum: ['PENDING_UPLOAD', 'UPLOADED', 'FAILED', 'DELETED'],
      default: 'PENDING_UPLOAD',
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
  },
);

mediaSchema.index({ uploader: 1, createdAt: -1 });

export const Media = mongoose.model('Media', mediaSchema);
