import mongoose from 'mongoose';
import { CARD_TRANSFER_STATUS } from '../../config/constants.js';

const { Schema } = mongoose;

const cardTransferRequestSchema = new Schema(
  {
    card: {
      type: Schema.Types.ObjectId,
      ref: 'Card',
      required: true,
      index: true,
    },
    cardCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    fromUser: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    toUser: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(CARD_TRANSFER_STATUS),
      default: CARD_TRANSFER_STATUS.PENDING,
      index: true,
    },
    note: {
      type: String,
      maxlength: 300,
      default: '',
      trim: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days expiration
      index: true,
    },
    acceptedAt: {
      type: Date,
      default: null,
    },
    rejectedAt: {
      type: Date,
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

cardTransferRequestSchema.index({ toUser: 1, status: 1 });
cardTransferRequestSchema.index({ fromUser: 1, status: 1 });
cardTransferRequestSchema.index({ card: 1, status: 1 });

export const CardTransferRequest = mongoose.model(
  'CardTransferRequest',
  cardTransferRequestSchema,
);
