import mongoose from 'mongoose';
import { DELETION_REQUEST_STATUS } from '../../config/constants.js';

const deletionRequestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(DELETION_REQUEST_STATUS),
      default: DELETION_REQUEST_STATUS.PENDING,
      index: true,
    },
    reason: {
      type: String,
      maxlength: 500,
      trim: true,
      default: '',
    },
    scheduledFor: {
      type: Date,
      required: true,
      index: true,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    executedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

deletionRequestSchema.index({ userId: 1, status: 1 });

export const DeletionRequest = mongoose.model('DeletionRequest', deletionRequestSchema);
