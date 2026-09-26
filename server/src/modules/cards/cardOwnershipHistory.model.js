import mongoose from 'mongoose';

const { Schema } = mongoose;

const cardOwnershipHistorySchema = new Schema(
  {
    card: {
      type: Schema.Types.ObjectId,
      ref: 'Card',
      required: true,
      unique: true, // Strictly enforces maximum ONE successful transfer record per card in the database!
      index: true,
    },
    cardCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    previousOwner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    newOwner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    transferredAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    transferredBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    transferRequest: {
      type: Schema.Types.ObjectId,
      ref: 'CardTransferRequest',
      default: null,
    },
    reason: {
      type: String,
      default: 'LIFETIME_ONE_TIME_TRANSFER',
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

export const CardOwnershipHistory = mongoose.model(
  'CardOwnershipHistory',
  cardOwnershipHistorySchema,
);
