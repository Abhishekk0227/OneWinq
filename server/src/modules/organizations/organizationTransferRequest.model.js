import mongoose from 'mongoose';

const { Schema } = mongoose;

export const ORGANIZATION_TRANSFER_STATUS = Object.freeze({
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED',
});

const organizationTransferRequestSchema = new Schema(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    fromUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    toUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(ORGANIZATION_TRANSFER_STATUS),
      default: ORGANIZATION_TRANSFER_STATUS.PENDING,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    respondedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

organizationTransferRequestSchema.index({ organizationId: 1, status: 1 });
organizationTransferRequestSchema.index({ toUserId: 1, status: 1 });

export const OrganizationTransferRequest = mongoose.model(
  'OrganizationTransferRequest',
  organizationTransferRequestSchema
);
